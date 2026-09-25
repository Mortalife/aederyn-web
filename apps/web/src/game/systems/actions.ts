import type { ResourceModel, UserInventoryItem } from "../../config.js";
import { itemsById } from "../../config/items.js";
import { resourcesById } from "../../config/resources.js";
import { writer } from "../../db/writer.js";
import type { UserAction } from "../../user/action.js";
import type { SystemMessageContext } from "../../user/system.js";
import { userChanged, zoneChanged } from "../changes.js";
import { emit } from "../events.js";
import { discoverResource } from "./discoveries.js";
import { markResourceUsed } from "./resources.js";
import { addSystemMessage } from "./system-messages.js";
import {
  addToInventory,
  loadUser,
  ownedItems,
  saveInventory,
} from "./users.js";

const countUserActions = writer.prepare<[string], { count: number }>(
  "SELECT count(*) AS count FROM inprogress WHERE user_id = ?"
);
const insertAction = writer.prepare<UserAction>(
  `INSERT INTO inprogress (user_id, x, y, resource_id, inprogress_at, completed_at)
  VALUES (:user_id, :x, :y, :resource_id, :inprogress_at, :completed_at)`
);
const deleteAction = writer.prepare<[string, number, number]>(
  "DELETE FROM inprogress WHERE user_id = ? AND x = ? AND y = ?"
);
const selectFinishedActions = writer.prepare<[number], UserAction>(
  "SELECT * FROM inprogress WHERE completed_at <= ? LIMIT 500"
);

/**
 * Returns false if the user is already doing something. `speed` scales the
 * resource's collection time (from gather speed effects).
 */
export const markActionInProgress = (
  user_id: string,
  x: number,
  y: number,
  resource: ResourceModel,
  now: number,
  speed = 1
) => {
  if (countUserActions.get(user_id)!.count > 0) {
    return false;
  }

  insertAction.run({
    user_id,
    x,
    y,
    resource_id: resource.id,
    inprogress_at: now,
    completed_at: now + Math.round(resource.collectionTime * 1000 * speed),
  });
  userChanged(user_id);

  return true;
};

export const markActionComplete = (user_id: string, x: number, y: number) => {
  if (deleteAction.run(user_id, x, y).changes > 0) {
    userChanged(user_id);
  }
};

/**
 * How much wear an owned item has left. Falls back to the item's starting
 * durability, as the inventory screen does, when it hasn't been tracked yet.
 */
export const currentDurability = (owned: UserInventoryItem) =>
  owned.metadata?.currentDurability ??
  itemsById.get(owned.item_id)?.durability?.current ??
  0;

/** Wear one owned item, removing it when its durability reaches zero. */
export const wearItem = (owned: UserInventoryItem, amount: number) => {
  const remaining = currentDurability(owned);
  const used = Math.min(remaining, amount);
  if (used === remaining) {
    owned.qty = 0;
  } else {
    owned.metadata = { ...owned.metadata, currentDurability: remaining - used };
  }
  return used;
};

/**
 * Checks the user has the items the resource needs, and if so consumes them
 * and wears down tools. Equipped items count as well as the inventory.
 */
const resourceRequirementsCheck = (
  user_id: string,
  resource: ResourceModel,
  now: number,
  context: SystemMessageContext
) => {
  if (resource.required_items.length === 0) {
    return true;
  }

  const user = loadUser(user_id);

  if (!user) {
    return false;
  }

  // Equipped tools count too, and wear down in their slot.
  const inventory = ownedItems(user);
  const equipped = new Set(Object.values(user.e));

  for (const requiredItem of resource.required_items) {
    const matching = inventory.filter(
      (i) => i.item_id === requiredItem.item_id
    );
    const qty = matching.reduce((sum, i) => sum + i.qty, 0);
    const durability = matching.reduce(
      (sum, i) => sum + currentDurability(i),
      0
    );

    if (qty < requiredItem.qty) {
      addSystemMessage(
        user_id,
        "You do not have the required items.",
        "error",
        now,
        context
      );
      return false;
    }

    if (
      requiredItem.itemDurabilityReduction &&
      requiredItem.itemDurabilityReduction > durability
    ) {
      addSystemMessage(
        user_id,
        "You do not have enough durability.",
        "error",
        now,
        context
      );
      return false;
    }
  }

  for (const requiredItem of resource.required_items) {
    if (requiredItem.consumed) {
      let requiredQty = requiredItem.qty;
      for (const item of inventory) {
        if (item.item_id === requiredItem.item_id) {
          if (item.qty >= requiredQty) {
            item.qty -= requiredQty;
            requiredQty = 0;
          } else {
            requiredQty -= item.qty;
            item.qty = 0;
          }
        }
      }
    }

    if (requiredItem.itemDurabilityReduction) {
      let requiredDurability = requiredItem.itemDurabilityReduction;
      // The tool in hand first, then the most worn, so spares stay whole
      // and at most one carried tool is part-worn.
      const wearOrder = inventory
        .filter((i) => i.item_id === requiredItem.item_id)
        .sort(
          (a, b) =>
            Number(equipped.has(b)) - Number(equipped.has(a)) ||
            currentDurability(a) - currentDurability(b)
        );

      for (const item of wearOrder) {
        if (requiredDurability === 0) {
          break;
        }

        requiredDurability -= wearItem(item, requiredDurability);
      }
    }
  }

  saveInventory(user);

  return true;
};

const completeAction = (action: UserAction, now: number) => {
  const resource = resourcesById.get(action.resource_id);

  markActionComplete(action.user_id, action.x, action.y);

  if (!resource) {
    return;
  }

  const context = {
    action_type: "resource",
    action_id: resource.id,
    location_x: action.x,
    location_y: action.y,
  } as const;

  if (!resourceRequirementsCheck(action.user_id, resource, now, context)) {
    return;
  }

  if (!markResourceUsed(action.x, action.y, resource, now)) {
    addSystemMessage(
      action.user_id,
      `This resource is depleted.`,
      "error",
      now,
      context
    );
    zoneChanged(action.x, action.y);
    return;
  }

  const discardedItems: { qty: number; item_id: string }[] = [];
  for (const reward of resource.reward_items) {
    const added = addToInventory(
      action.user_id,
      { qty: reward.qty, item_id: reward.item_id },
      now
    );
    if (!added) {
      discardedItems.push({ qty: reward.qty, item_id: reward.item_id });
    }
  }

  if (discardedItems.length > 0) {
    addSystemMessage(
      action.user_id,
      `Your inventory is full. Discarded: ${discardedItems
        .map((item) => `${item.qty} x ${itemsById.get(item.item_id)?.name}`)
        .join(", ")}`,
      "error",
      now,
      context
    );
  }

  emit({
    type: "resource_completed",
    userId: action.user_id,
    resourceId: resource.id,
    x: action.x,
    y: action.y,
  });
  addSystemMessage(
    action.user_id,
    `You have completed: ${resource.name} and acquired ${resource.reward_items
      .map((item) => `${item.qty} x ${itemsById.get(item.item_id)?.name}`)
      .join(", ")}`,
    "success",
    now,
    context
  );
  discoverResource(action.user_id, resource, now);
};

/**
 * Completes the actions that have finished. Actions still running aren't
 * touched: the client animates their progress bars, so the screen only needs
 * redrawing on start, cancel and complete.
 */
export const processActions = (now: number) => {
  for (const action of selectFinishedActions.all(now)) {
    completeAction(action, now);
  }
};
