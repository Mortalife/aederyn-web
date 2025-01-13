import type { OtherUser, GameUserModel } from "../config";
import { client } from "../database";
import { PubSub, ZONE_EVENT } from "../sse/pubsub";
import { progressHooks } from "./quest-hooks";

export const getZoneUsers = async (
  user_id: string,
  x: number,
  y: number
): Promise<OtherUser[]> => {
  const result = await client.execute({
    sql: `SELECT users.id as id, users.data as data
      FROM users 
      JOIN zone_users ON users.id = zone_users.user_id 
      WHERE x = ? AND y = ? AND user_id != ?`,
    args: [x, y, user_id],
  });

  return result.rows.map((row) => {
    const data = JSON.parse(row["data"] as string) as GameUserModel;
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

export const addUserToZone = async (user_id: string, x: number, y: number) => {
  await client.execute({
    sql: "INSERT INTO zone_users (user_id, x, y, entered_at) VALUES (?, ?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET x = ?, y = ?",
    args: [user_id, x, y, Date.now(), x, y],
  });
  await progressHooks.onZoneChange(user_id, x, y);
  PubSub.publish(ZONE_EVENT, {
    x,
    y,
  });
};

export const removeUserFromZone = async (user_id: string) => {
  const result = await client.execute({
    sql: "SELECT x, y FROM zone_users WHERE user_id = ?",
    args: [user_id],
  });

  await client.execute({
    sql: "DELETE FROM zone_users WHERE user_id = ?",
    args: [user_id],
  });

  if (!result.rows.length) {
    return;
  }

  const { x, y } = result.rows[0] as unknown as { x: number; y: number };

  PubSub.publish(ZONE_EVENT, {
    x,
    y,
  });
};
