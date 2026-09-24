import type { GameUserModel } from "../../config.js";
import { writer } from "../../db/writer.js";
import {
  collectEffects,
  resolveEffects,
  type TimedEffect,
} from "../../world/effects.js";
import { userChanged } from "../changes.js";

const selectTimed = writer.prepare<[string, number], TimedEffect>(
  "SELECT * FROM active_effects WHERE user_id = ? AND expires_at > ? ORDER BY started_at, effect_id"
);
const upsertTimed = writer.prepare<[string, string, string, number, number, number]>(
  `INSERT INTO active_effects (user_id, item_id, effect_id, strength, started_at, expires_at)
   VALUES (?, ?, ?, ?, ?, ?)
   ON CONFLICT (user_id, item_id, effect_id) DO UPDATE SET
     strength = excluded.strength, started_at = excluded.started_at, expires_at = excluded.expires_at`
);
const deleteExpired = writer.prepare<[number], { user_id: string }>(
  "DELETE FROM active_effects WHERE expires_at <= ? RETURNING user_id"
);

/** Everything acting on the player right now, with protection applied. */
export const effectsOn = (user: GameUserModel, now: number) =>
  resolveEffects(
    collectEffects(
      user.p,
      Object.values(user.e).map((owned) => owned.item_id),
      selectTimed.all(user.id, now),
      now
    )
  );

/**
 * Start a consumable's effect. Using the same item again restarts the
 * timer (and takes the new strength) rather than stacking.
 */
export const startTimedEffect = (
  userId: string,
  itemId: string,
  effectId: string,
  strength: number,
  now: number,
  durationMs: number
) => {
  upsertTimed.run(userId, itemId, effectId, strength, now, now + durationMs);
  userChanged(userId);
};

export const expireEffects = (now: number) => {
  const expired = new Set(deleteExpired.all(now).map((row) => row.user_id));
  for (const userId of expired) {
    userChanged(userId);
  }
};
