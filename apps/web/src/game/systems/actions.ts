import type { ResourceModel } from "../../config.js";
import { itemsById } from "../../config/items.js";
import { resourcesById } from "../../config/resources.js";
import { writer } from "../../db/writer.js";
import type { UserAction } from "../../user/action.js";
import type { SystemMessageContext } from "../../user/system.js";
import { userChanged, zoneChanged } from "../changes.js";
import { emit } from "../events.js";
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

/** Returns false if the user is already doing something. */
export const markActionInProgress = (
  user_id: string,
  x: number,
  y: number,
  resource: ResourceModel,
  now: number
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
    completed_at: now + resource.collectionTime * 1000,
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

  for (const requiredItem of resource.required_items) {
    const [qty, durability] = inventory.reduce(
      (acc, i) => {
        if (i.item_id === requiredItem.item_id) {
          if (!requiredItem.itemDurabilityReduction) {
            return [acc[0] + i.qty, 0];
          }

          const item = itemsById.get(requiredItem.item_id);

          if (!item) {
            return acc;
          }

          return [acc[0] + i.qty, acc[1] + (item.durability?.current ?? 0)];
        }
        return acc;
      },
      [0, 0]
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

    //TODO: It should pick the lowest matching itemDurability
    if (requiredItem.itemDurabilityReduction) {
      let requiredDurability = requiredItem.itemDurabilityReduction;
      for (const item of inventory) {
        if (item.item_id !== requiredItem.item_id) {
          continue;
        }

        // Item has all the durability we need left
        if ((item.metadata?.currentDurability ?? 0) >= requiredDurability) {
          // Ensure it's there
          if (typeof item.metadata === "undefined") {
            item.metadata = { currentDurability: 0 };
          } else if (typeof item.metadata.currentDurability === "undefined") {
            item.metadata.currentDurability = 0;
          }

          item.metadata.currentDurability! -= requiredDurability;
          requiredDurability = 0;

          if (item.metadata.currentDurability === 0) {
            item.qty = 0;
          }
        } else {
          requiredDurability -= item.metadata?.currentDurability ?? 0;
          item.qty = 0;
        }
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
