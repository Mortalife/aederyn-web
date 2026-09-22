import { deepmerge } from "deepmerge-ts";
import {
  BASE_USER,
  MAX_INVENTORY_SIZE,
  type GameUserModel,
  type UserInventoryItem,
} from "../../config.js";
import { itemsById } from "../../config/items.js";
import { writer } from "../../db/writer.js";
import { migrateUser, needsMigration } from "../../user/migrations.js";
import { userChanged } from "../changes.js";
import { emit } from "../events.js";

const insertUser = writer.prepare<[string, string]>(
  "INSERT INTO users (id, data) VALUES (?, ?)"
);
const updateUserData = writer.prepare<[string, string]>(
  "UPDATE users SET data = ? WHERE id = ?"
);
const selectUserData = writer.prepare<[string], { data: string }>(
  "SELECT data FROM users WHERE id = ?"
);

export const saveUser = (user: GameUserModel) => {
  updateUserData.run(JSON.stringify(user), user.id);
  userChanged(user.id);
};

/** Load a user for writing, persisting any pending migration. */
export const loadUser = (id: string) => {
  const row = selectUserData.get(id);

  if (!row) {
    return null;
  }

  const user = JSON.parse(row.data) as GameUserModel;

  if (!needsMigration(user)) {
    return user;
  }

  const migrated = migrateUser(user);
  saveUser(migrated);
  return migrated;
};

/**
 * Log in as `id`, or as a new user when `id` is empty. Fills in any fields
 * added to BASE_USER since the user was created.
 */
export const loginUser = (id: string) => {
  if (!id) {
    id = crypto.randomUUID();
    insertUser.run(id, JSON.stringify({ ...BASE_USER, id }));
  }

  const row = selectUserData.get(id);

  if (!row) {
    return null;
  }

  let user = deepmerge(BASE_USER, JSON.parse(row.data), {
    id,
  }) as GameUserModel;

  if (needsMigration(user)) {
    user = migrateUser(user);
  }

  saveUser(user);

  return user;
};

export const updateInventory = (
  user_id: string,
  inventory: UserInventoryItem[],
  now: number
) => {
  const user = loadUser(user_id);

  if (!user) {
    return false;
  }

  user.i = inventory;
  saveUser(user);
  emit({ type: "inventory_changed", userId: user_id, inventory: user.i });

  return true;
};

export const addToInventory = (
  user_id: string,
  inventoryItem: Omit<UserInventoryItem, "id">,
  now: number
) => {
  const user = loadUser(user_id);

  if (!user) {
    return false;
  }

  const inventory = user.i;
  const item = itemsById.get(inventoryItem.item_id)!;
  const existing = inventory.find(
    (i) =>
      i.item_id === inventoryItem.item_id &&
      item.stackable &&
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
        metadata: item.durability
          ? { currentDurability: item.durability.current }
          : undefined,
      });
    } else {
      return false;
    }
  }

  saveUser(user);
  emit({ type: "inventory_changed", userId: user_id, inventory });

  return true;
};

export const removeFromInventoryById = (
  user_id: string,
  inventory_id: string,
  now: number
) => {
  const user = loadUser(user_id);

  if (!user) {
    return false;
  }

  const index = user.i.findIndex((i) => i.id === inventory_id);

  if (index === -1) {
    return true;
  }
  user.i.splice(index, 1);
  saveUser(user);
  emit({ type: "inventory_changed", userId: user_id, inventory: user.i });

  return true;
};

export const addGold = (user_id: string, amount: number) => {
  const user = loadUser(user_id);

  if (!user) {
    return false;
  }

  user.$ += amount;
  saveUser(user);

  return true;
};
