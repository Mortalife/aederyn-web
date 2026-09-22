import { writer } from "../../db/writer.js";
import { onlineChanged, zoneChanged } from "../changes.js";
import { emit } from "../events.js";

const upsertOnline = writer.prepare<[string, number]>(
  "INSERT INTO online (user_id, online_at) VALUES (?, ?) ON CONFLICT (user_id) DO UPDATE SET online_at = excluded.online_at"
);
const deleteOnline = writer.prepare<[string]>(
  "DELETE FROM online WHERE user_id = ?"
);
const upsertZoneUser = writer.prepare<[string, number, number, number]>(
  "INSERT INTO zone_users (user_id, x, y, entered_at) VALUES (?, ?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET x = excluded.x, y = excluded.y"
);
const deleteZoneUser = writer.prepare<[string], { x: number; y: number }>(
  "DELETE FROM zone_users WHERE user_id = ? RETURNING x, y"
);

export const markUserOnline = (user_id: string, now: number) => {
  upsertOnline.run(user_id, now);
  onlineChanged();
};

export const markUserOffline = (user_id: string) => {
  if (deleteOnline.run(user_id).changes > 0) {
    onlineChanged();
  }
};

export const addUserToZone = (
  user_id: string,
  x: number,
  y: number,
  now: number
) => {
  upsertZoneUser.run(user_id, x, y, now);
  emit({ type: "zone_entered", userId: user_id, x, y });
  zoneChanged(x, y);
};

export const removeUserFromZone = (user_id: string) => {
  const removed = deleteZoneUser.get(user_id);

  if (removed) {
    zoneChanged(removed.x, removed.y);
  }
};
