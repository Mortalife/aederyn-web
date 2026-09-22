import type { OtherUser, GameUserModel } from "../config.js";
import { reader } from "../db/reader.js";

const selectZoneUsers = reader.prepare<
  [number, number],
  { id: string; data: string }
>(
  `SELECT users.id as id, users.data as data
    FROM users
    JOIN zone_users ON users.id = zone_users.user_id
    WHERE x = ? AND y = ?
    ORDER BY zone_users.entered_at, users.id`
);

/** Everyone in the zone, including the player asking. */
export const getZoneUsers = (x: number, y: number): OtherUser[] => {
  return selectZoneUsers.all(x, y).map((row) => {
    const data = JSON.parse(row.data) as GameUserModel;
    return {
      id: data.id,
      p: data.p,
      e: data.e,
      h: data.h,
      po: data.po,
      m: data.m,
    };
  });
};
