import { items, MAX_INVENTORY_SIZE, type UserInventoryItem } from "../config";
import { client } from "../database";
import { progressHooks } from "./quest-hooks";
import { getUser, saveUser } from "./user";

export const getInventory = async (id: string) => {
  const result = await client.execute({
    sql: "SELECT data FROM users WHERE id = ?",
    args: [id],
  });
  return JSON.parse(result.rows[0]["data"] as string).i as UserInventoryItem[];
};

export const addToInventory = async (
  id: string,
  inventoryItem: Omit<UserInventoryItem, "id">
) => {
  const inventory = await getInventory(id);

  const item = items.find((i) => i.id === inventoryItem.item_id)!;
  const existing = inventory.find(
    (i) =>
      i.item_id === inventoryItem.item_id &&
      i.qty + inventoryItem.qty < item.maxStackSize
  );
  if (existing) {
    const availableSpace = item.maxStackSize - existing.qty;
    if (availableSpace >= inventoryItem.qty) {
      existing.qty += inventoryItem.qty;
    } else {
      existing.qty += availableSpace;
      if (inventory.length < MAX_INVENTORY_SIZE) {
        inventory.push({
          id: crypto.randomUUID(),
          item_id: item.id,
          qty: inventoryItem.qty - availableSpace,
        });
      } else {
        return false;
      }
    }
  } else {
    if (inventory.length < MAX_INVENTORY_SIZE) {
      inventory.push({
        id: crypto.randomUUID(),
        item_id: item.id,
        qty: inventoryItem.qty,
      });
    } else {
      return false;
    }
  }

  const user = await getUser(id);

  if (!user) {
    return false;
  }

  user.i = inventory;
  await saveUser(id, user);
  await progressHooks.onInventoryChange(id, inventory);

  return true;
};

export const removeFromInventoryById = async (
  user_id: string,
  inventory_id: string
) => {
  const user = await getUser(user_id);

  if (!user) {
    return false;
  }

  const index = user.i.findIndex((i) => i.id === inventory_id);

  if (index === -1) {
    return true;
  }
  user.i.splice(index, 1);
  await saveUser(user_id, user);
  await progressHooks.onInventoryChange(user_id, user.i);

  return true;
};
export const updateInventory = async (
  user_id: string,
  inventory: UserInventoryItem[]
) => {
  const user = await getUser(user_id);

  if (!user) {
    return false;
  }
  user.i = inventory;

  await saveUser(user_id, user);
  await progressHooks.onInventoryChange(user_id, user.i);

  return true;
};
