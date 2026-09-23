import { BASE_USER, START_POSITION, type GameUserModel } from "../../config.js";
import { writer } from "../../db/writer.js";
import { saveUser } from "./users.js";

export const HEALTH_REGEN_MS = 5_000;
export const CAMP_HEALTH_REGEN_MS = 2_000;

const selectInjured = writer.prepare<[number], { id: string; data: string }>(
  "SELECT id, data FROM users WHERE json_extract(data, '$.h') < ? AND id NOT IN (SELECT user_id FROM combat)"
);
const selectRegen = writer.prepare<[string], { last_at: number; at_camp: number }>(
  "SELECT last_at, at_camp FROM health_regen WHERE user_id = ?"
);
const setRegen = writer.prepare<[string, number, number]>(
  `INSERT INTO health_regen (user_id, last_at, at_camp) VALUES (?, ?, ?)
   ON CONFLICT (user_id) DO UPDATE SET last_at = excluded.last_at, at_camp = excluded.at_camp`
);
const deleteRegen = writer.prepare<[string]>(
  "DELETE FROM health_regen WHERE user_id = ?"
);
const clearFullHealth = writer.prepare<[number]>(
  "DELETE FROM health_regen WHERE user_id NOT IN (SELECT id FROM users WHERE json_extract(data, '$.h') < ?)"
);
const clearCombat = writer.prepare(
  "DELETE FROM health_regen WHERE user_id IN (SELECT user_id FROM combat)"
);

export const resetHealthRegen = (userId: string) => deleteRegen.run(userId);

export const regenerateHealth = (now: number) => {
  clearFullHealth.run(BASE_USER.h);
  clearCombat.run();
  for (const row of selectInjured.all(BASE_USER.h)) {
    const user = JSON.parse(row.data) as GameUserModel;
    const atCamp = !user.z && user.p.x === START_POSITION.x && user.p.y === START_POSITION.y;
    const previous = selectRegen.get(user.id);
    if (!previous || Boolean(previous.at_camp) !== atCamp) {
      setRegen.run(user.id, now, Number(atCamp));
      continue;
    }

    const interval = atCamp ? CAMP_HEALTH_REGEN_MS : HEALTH_REGEN_MS;
    const recovered = Math.floor((now - previous.last_at) / interval);
    if (recovered < 1) continue;

    user.h = Math.min(BASE_USER.h, user.h + recovered);
    saveUser(user);
    if (user.h === BASE_USER.h) {
      deleteRegen.run(user.id);
    } else {
      setRegen.run(user.id, previous.last_at + recovered * interval, Number(atCamp));
    }
  }
};
