import type { Monster } from "../../config.js";
import { writer } from "../../db/writer.js";
import { zoneChanged } from "../changes.js";

const upsertDead = writer.prepare<[number, number, number, string, number]>(
  `INSERT INTO monster_state (x, y, spawn, monster_id, hp, respawn_at) VALUES (?, ?, ?, ?, 0, ?)
  ON CONFLICT (x, y, spawn) DO UPDATE SET hp = 0, respawn_at = excluded.respawn_at`
);
const deleteRespawned = writer.prepare<[number], { x: number; y: number }>(
  "DELETE FROM monster_state WHERE respawn_at <= ? RETURNING x, y"
);

/** Marks a monster dead until its respawn time has passed. */
export const markMonsterKilled = (
  x: number,
  y: number,
  spawn: number,
  monster: Monster,
  now: number
) => {
  upsertDead.run(x, y, spawn, monster.id, now + monster.respawnTime * 1000);
  zoneChanged(x, y);
};

/** Brings back monsters whose respawn time has passed, at full HP. */
export const respawnMonsters = (now: number) => {
  for (const { x, y } of deleteRespawned.all(now)) {
    zoneChanged(x, y);
  }
};
