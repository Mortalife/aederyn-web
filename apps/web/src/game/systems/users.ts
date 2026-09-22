import { deepmerge } from "deepmerge-ts";
import {
  BASE_USER,
  EQUIP_SLOTS,
  MAX_INVENTORY_SIZE,
  type EquipSlot,
  type GameUserModel,
  type UserInventoryItem,
} from "../../config.js";
import { itemsById } from "../../config/items.js";
import { writer } from "../../db/writer.js";
import { migrateUser, needsMigration } from "../../user/migrations.js";
import { userChanged } from "../changes.js";
import { emit } from "../events.js";
import { addSystemMessage } from "./system-messages.js";

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

/** Everything the user carries: the inventory and what's equipped. */
export const ownedItems = (user: GameUserModel) => [
  ...user.i,
  ...Object.values(user.e),
];

const inventoryChanged = (user: GameUserModel) => {
  emit({
    type: "inventory_changed",
    userId: user.id,
    inventory: ownedItems(user),
  });
};

/**
 * Save a user whose owned items were changed in place, dropping any that
 * were used up (qty 0) from the inventory and equipment slots.
 */
export const saveInventory = (user: GameUserModel) => {
  user.i = user.i.filter((i) => i.qty > 0);
  for (const slot of EQUIP_SLOTS) {
    if (user.e[slot] && user.e[slot].qty <= 0) {
      delete user.e[slot];
    }
  }
  saveUser(user);
  inventoryChanged(user);
};

/**
 * Move an inventory item into its equipment slot. Whatever was in the slot
 * takes the item's place in the inventory.
 */
export const equipItem = (
  user_id: string,
  inventory_id: string,
  now: number
) => {
  const user = loadUser(user_id);

  if (!user) {
    return false;
  }

  const index = user.i.findIndex((i) => i.id === inventory_id);
  const inventoryItem = user.i[index];
  const item = inventoryItem && itemsById.get(inventoryItem.item_id);

  if (!item) {
    return false;
  }

  const context = {
    action_type: "inventory",
    action_id: inventory_id,
  } as const;

  if (!item.equippable || !item.equipSlot) {
    addSystemMessage(user_id, `You can't equip ${item.name}.`, "error", now, context);
    return false;
  }

  const previous = user.e[item.equipSlot];
  user.e[item.equipSlot] = inventoryItem;
  if (previous) {
    user.i[index] = previous;
  } else {
    user.i.splice(index, 1);
  }

  saveUser(user);
  inventoryChanged(user);

  return true;
};

/** Move an equipped item back into the inventory, if there's room. */
export const unequipItem = (user_id: string, slot: EquipSlot, now: number) => {
  const user = loadUser(user_id);
  const equipped = user?.e[slot];

  if (!user || !equipped) {
    return false;
  }

  if (user.i.length >= MAX_INVENTORY_SIZE) {
    addSystemMessage(
      user_id,
      `Your inventory is full. Make room before unequipping ${
        itemsById.get(equipped.item_id)?.name ?? "that"
      }.`,
      "error",
      now,
      { action_type: "inventory", action_id: equipped.id }
    );
    return false;
  }

  delete user.e[slot];
  user.i.push(equipped);
  saveUser(user);
  inventoryChanged(user);

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
  inventoryChanged(user);

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
  inventoryChanged(user);

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
