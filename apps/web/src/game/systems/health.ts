import { BASE_USER, START_POSITION, type GameUserModel } from "../../config.js";
import { writer } from "../../db/writer.js";
import { healthRates, type ResolvedEffect } from "../../world/effects.js";
import { emit } from "../events.js";
import { markActionComplete } from "./actions.js";
import { stopCombat } from "./combat.js";
import { effectsOn } from "./effects.js";
import { removeUserFromZone } from "./presence.js";
import { addSystemMessage } from "./system-messages.js";
import { saveUser } from "./users.js";

/** Natural regeneration: 1 HP per this many ms, unless something drains. */
export const HEALTH_REGEN_MS = 5_000;

const selectCandidates = writer.prepare<
  [number],
  { id: string; data: string; online: number; fighting: number }
>(
  `SELECT id, data,
     id IN (SELECT user_id FROM online) AS online,
     id IN (SELECT user_id FROM combat) AS fighting
   FROM users
   WHERE json_extract(data, '$.h') < ? OR id IN (SELECT user_id FROM online)`
);
const selectRegen = writer.prepare<[string], { last_at: number; rate: number }>(
  "SELECT last_at, rate FROM health_regen WHERE user_id = ?"
);
const setRegen = writer.prepare<[string, number, number]>(
  `INSERT INTO health_regen (user_id, last_at, rate) VALUES (?, ?, ?)
   ON CONFLICT (user_id) DO UPDATE SET last_at = excluded.last_at, rate = excluded.rate`
);
const deleteRegen = writer.prepare<[string]>(
  "DELETE FROM health_regen WHERE user_id = ?"
);
const clearStale = writer.prepare<[number]>(
  `DELETE FROM health_regen WHERE user_id NOT IN (
     SELECT id FROM users WHERE json_extract(data, '$.h') < ?
     UNION SELECT user_id FROM online
   )`
);

/**
 * Net HP per ms. A drain stops natural regeneration, and so does a fight,
 * which also stops positive effects. Drains only reach players who are
 * online, so logging out somewhere hostile isn't fatal.
 */
export const healthRate = (
  resolved: ResolvedEffect[],
  { fighting, online }: { fighting: boolean; online: boolean }
) => {
  const { gain, loss } = healthRates(resolved);
  const drain = online ? loss : 0;
  const natural = drain > 0 || fighting ? 0 : 1 / HEALTH_REGEN_MS;
  return natural + (fighting ? 0 : gain) - drain;
};

const strongestDrain = (resolved: ResolvedEffect[]) =>
  resolved
    .filter(
      ({ effect, effective }) =>
        effect.kind === "health" && effect.polarity === "negative" && effective > 0
    )
    .sort((a, b) => b.effective - a.effective)[0]?.effect;

/** Health ran out to an effect: back to camp with a tenth of it, as in combat. */
const collapse = (user: GameUserModel, cause: string, effectId: string, now: number) => {
  stopCombat(user.id, now, "You collapse mid-fight.");
  markActionComplete(user.id, user.p.x, user.p.y);
  removeUserFromZone(user.id);
  deleteRegen.run(user.id);
  user.p = { ...START_POSITION };
  user.z = false;
  user.h = Math.ceil(BASE_USER.h * 0.1);
  saveUser(user);
  emit({ type: "player_died", userId: user.id, effectId });
  addSystemMessage(
    user.id,
    `${cause} overcame you. You were carried back to camp.`,
    "error",
    now
  );
};

/** Add (or take) health now, up to the maximum. Running out sends the player to camp. */
export const changeHealth = (
  user: GameUserModel,
  delta: number,
  now: number,
  cause: { name: string; id: string }
) => {
  const h = Math.max(0, Math.min(BASE_USER.h, user.h + delta));
  if (h === 0) {
    collapse(user, cause.name, cause.id, now);
    return;
  }
  if (h !== user.h) {
    user.h = h;
    saveUser(user);
  }
};

export const regenerateHealth = (now: number) => {
  clearStale.run(BASE_USER.h);
  for (const row of selectCandidates.all(BASE_USER.h)) {
    const user = JSON.parse(row.data) as GameUserModel;
    const resolved = effectsOn(user, now);
    const rate = healthRate(resolved, {
      fighting: Boolean(row.fighting),
      online: Boolean(row.online),
    });

    if (rate === 0 || (rate > 0 && user.h >= BASE_USER.h)) {
      deleteRegen.run(user.id);
      continue;
    }

    // A new rate starts a fresh interval, so time spent at one rate never
    // counts toward another.
    const previous = selectRegen.get(user.id);
    if (!previous || previous.rate !== rate) {
      setRegen.run(user.id, now, rate);
      continue;
    }

    const steps = Math.floor(Math.abs(rate) * (now - previous.last_at) + 1e-9);
    if (steps < 1) continue;

    const lastAt = previous.last_at + Math.round(steps / Math.abs(rate));
    const h = Math.max(0, Math.min(BASE_USER.h, user.h + Math.sign(rate) * steps));
    if (h === 0) {
      const drain = strongestDrain(resolved);
      collapse(user, drain?.name ?? "Your wounds", drain?.id ?? "", now);
      continue;
    }

    user.h = h;
    saveUser(user);
    if (rate > 0 && h === BASE_USER.h) {
      deleteRegen.run(user.id);
    } else {
      setRegen.run(user.id, lastAt, rate);
    }
  }
};
