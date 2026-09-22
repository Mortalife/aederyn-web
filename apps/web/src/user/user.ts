import {
  type GameUser,
  type GameUserModel,
  type InventoryItem,
  type UserInventoryItem,
} from "../config.js";
import { reader } from "../db/reader.js";
import { itemsById } from "../config/items.js";
import { migrateUser, needsMigration } from "./migrations.js";

const selectUserData = reader.prepare<[string], { data: string }>(
  "SELECT data FROM users WHERE id = ?"
);

/**
 * Parse a stored user, migrating in memory. The writer persists the
 * migration the next time it loads the user (on connect, at the latest).
 */
export const parseUser = (data: string) => {
  const user = JSON.parse(data) as GameUserModel;
  return needsMigration(user) ? migrateUser(user) : user;
};

export const getUser = (id: string) => {
  const row = selectUserData.get(id);

  return row ? parseUser(row.data) : null;
};

const populateItem = (item: UserInventoryItem): InventoryItem => {
  const itemObj = itemsById.get(item.item_id)!;
  const userObj = structuredClone(itemObj);

  if (userObj.durability) {
    userObj.durability.current =
      item.metadata?.currentDurability ?? userObj.durability.current;
  }

  return {
    id: item.id,
    qty: item.qty,
    item: userObj,
  };
};

export const populateUser = (user: GameUserModel): GameUser => ({
  ...user,
  i: user.i.map(populateItem),
  e: Object.fromEntries(
    Object.entries(user.e).map(([slot, item]) => [slot, populateItem(item)])
  ),
});

export const getPopulatedUser = (id: string): GameUser | null => {
  const user = getUser(id);

  return user ? populateUser(user) : null;
};
