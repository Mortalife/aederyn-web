import {
  items,
  resources,
  type GameUser,
  type ResourceModel,
} from "../config.js";
import { itemsMap } from "../config/items.js";
import { resourcesMap } from "../config/resources.js";
import { client } from "../database.js";
import { PubSub, USER_EVENT, ZONE_EVENT } from "../sse/pubsub.js";
import { markResourceUsed } from "../world/resources.js";
import { addToInventory, getInventory, updateInventory } from "./inventory.js";
import { progressHooks } from "./quest-hooks.js";
import { addSystemMessage } from "./system.js";

/**
 *   "CREATE TABLE IF NOT EXISTS inprogress (user_id TEXT PRIMARY KEY,x INT, y INT, resource_id TEXT, inprogress_at INT, completed_at INT)",

 */

export type UserAction = {
  user_id: string;
  x: number;
  y: number;
  resource_id: string;
  inprogress_at: number;
  completed_at: number;
};

export const markActionInProgress = async (
  user: GameUser,
  resource_id: string
) => {
  const resource = resourcesMap.get(resource_id);

  if (!resource) {
    return false;
  }

  // Check if resource is already in progress
  const action = await client.execute({
    sql: "SELECT count(*) FROM inprogress WHERE user_id = ?",
    args: [user.id],
  });

  if (parseInt(action.rows[0]["count"]?.toString() ?? "0") > 0) {
    return false;
  }

  await client.execute({
    sql: `INSERT INTO inprogress (user_id, x, y, resource_id, inprogress_at, completed_at) 
    VALUES (:user_id, :x, :y, :resource_id, :inprogress_at, :completed_at) 
    ON CONFLICT (user_id) DO UPDATE SET x = :x, y = :y, resource_id = :resource_id, inprogress_at = :inprogress_at, completed_at = :completed_at`,
    args: {
      user_id: user.id,
      x: user.p.x,
      y: user.p.y,
      resource_id: resource.id,
      inprogress_at: Date.now(),
      completed_at: Date.now() + resource.collectionTime * 1000,
    },
  });

  return true;
};

export const markActionComplete = async (
  user_id: string,
  x: number,
  y: number
) => {
  await client.execute({
    sql: "DELETE FROM inprogress WHERE user_id = ? AND x = ? AND y = ?",
    args: [user_id, x, y],
  });
};

export const getInProgressAction = async (user_id: string) => {
  const result = await client.execute({
    sql: "SELECT * FROM inprogress WHERE user_id = ?",
    args: [user_id],
  });

  if (!result.rows.length) {
    return null;
  }

  return result.rows[0] as unknown as UserAction;
};

export const calculateProgress = (action: UserAction) =>
  (action.completed_at - action.inprogress_at) / 1000 -
  Math.floor(
    (action.completed_at - Math.min(action.completed_at, Date.now())) / 1000
  );

export const resourceRequirementsCheck = async (
  user_id: string,
  resource: ResourceModel
) => {
  if (resource.required_items.length === 0) {
    return true;
  }

  const inventory = await getInventory(user_id);

  for (const requiredItem of resource.required_items) {
    const [qty, durability] = inventory.reduce(
      (acc, i) => {
        if (i.item_id === requiredItem.item_id) {
          if (!requiredItem.itemDurabilityReduction) {
            return [acc[0] + i.qty, 0];
          }

          const item = itemsMap.get(requiredItem.item_id);

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
      await addSystemMessage(
        user_id,
        "You do not have the required items.",
        "error",
        { action_type: "resource", action_id: resource.id }
      );
      return false;
    }

    if (
      requiredItem.itemDurabilityReduction &&
      requiredItem.itemDurabilityReduction > durability
    ) {
      await addSystemMessage(
        user_id,
        "You do not have enough durability.",
        "error",
        { action_type: "resource", action_id: resource.id }
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

  const newInventory = inventory.filter((i) => i.qty > 0);

  await updateInventory(user_id, newInventory);

  return true;
};

export const processActions = async () => {
  const now = Date.now();
  const response = await client.execute({
    sql: "SELECT * FROM inprogress LIMIT 500",
    args: [],
  });

  const actions = response.rows as unknown as UserAction[];

  for (const action of actions) {
    if (action.completed_at > now) {
      PubSub.publish(USER_EVENT, { user_id: action.user_id });
      continue;
    }

    const resource = resourcesMap.get(action.resource_id);

    if (!resource) {
      await markActionComplete(action.user_id, action.x, action.y);
      PubSub.publish(USER_EVENT, { user_id: action.user_id });
      continue;
    }

    const canPerformAction = await resourceRequirementsCheck(
      action.user_id,
      resource
    );

    if (!canPerformAction) {
      await markActionComplete(action.user_id, action.x, action.y);
      PubSub.publish(USER_EVENT, { user_id: action.user_id });

      continue;
    }

    const successfullyUsed = await markResourceUsed(
      action.x,
      action.y,
      resource
    );

    await markActionComplete(action.user_id, action.x, action.y);

    if (successfullyUsed) {
      const discardedItems: { qty: number; item_id: string }[] = [];
      for (const reward of resource.reward_items) {
        const added = await addToInventory(action.user_id, {
          qty: reward.qty,
          item_id: reward.item_id,
        });
        if (!added) {
          discardedItems.push({ qty: reward.qty, item_id: reward.item_id });
        }
      }

      if (discardedItems.length > 0) {
        await addSystemMessage(
          action.user_id,
          `Your inventory is full. Discarded: ${discardedItems
            .map(
              (item) => `${item.qty} x ${itemsMap.get(item.item_id)?.name}`
            )
            .join(", ")}`,
          "error",
          {
            action_type: "resource",
            action_id: resource.id,
            location_x: action.x,
            location_y: action.y,
          }
        );
      }

      await progressHooks.onResourceCompleted(action.user_id, resource.id);
      await addSystemMessage(
        action.user_id,
        `You have completed: ${
          resource.name
        } and acquired ${resource.reward_items
          .map((item) => `${item.qty} x ${itemsMap.get(item.item_id)?.name}`)
          .join(", ")}`,
        "success",
        {
          action_type: "resource",
          action_id: resource.id,
          location_x: action.x,
          location_y: action.y,
        }
      );
    } else {
      await addSystemMessage(
        action.user_id,
        `This resource is depleted.`,
        "error",
        {
          action_type: "resource",
          action_id: resource.id,
          location_x: action.x,
          location_y: action.y,
        }
      );
    }

    PubSub.publish(USER_EVENT, { user_id: action.user_id });
    PubSub.publish(ZONE_EVENT, { x: action.x, y: action.y });
  }
};
