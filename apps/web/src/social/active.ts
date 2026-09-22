/**
 *   "CREATE TABLE IF NOT EXISTS online (id INTEGER PRIMARY KEY, user_id TEXT, online_at INT)",
 */

import { reader } from "../db/reader.js";

export type UserOnlineStatus = {
  user_id: string;
  online_at: number;
};

const selectOnline = reader.prepare<[], UserOnlineStatus>(
  "SELECT * FROM online"
);
const countOnline = reader.prepare<[], { count: number }>(
  "SELECT COUNT(*) as count FROM online"
);
const selectOnlineStatus = reader.prepare<[string], UserOnlineStatus>(
  "SELECT * FROM online WHERE user_id = ?"
);

export const getOnlineUsers = () => selectOnline.all();

export const getOnlineUsersCount = () => countOnline.get()!.count;

export const getOnlineStatus = (user_id: string) =>
  selectOnlineStatus.get(user_id) ?? null;
