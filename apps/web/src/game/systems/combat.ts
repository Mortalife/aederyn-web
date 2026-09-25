import {
  BASE_USER,
  START_POSITION,
  UNARMED,
  type AttackStyle,
  type GameUserModel,
  type Monster,
} from "../../config.js";
import { itemsById } from "../../config/items.js";
import { monstersById } from "../../config/monsters.js";
import { writer } from "../../db/writer.js";
import { MITIGATION_K } from "../../lib/mitigation.js";
import { getTileSelection, isOutOfBounds } from "../../world/index.js";
import { COMBAT_LOG_MS, type Combat } from "../../world/monsters.js";
import { userChanged, zoneChanged } from "../changes.js";
import { emit } from "../events.js";
import { currentDurability, wearItem } from "./actions.js";
import { blockedMessage, blockingEffect } from "../../world/effects.js";
import { discoverDrop, discoverMonster, discoverTile } from "./discoveries.js";
import { effectsOn } from "./effects.js";
import { markMonsterKilled } from "./monsters.js";
import { removeUserFromZone } from "./presence.js";
import { addSystemMessage } from "./system-messages.js";
import { addToInventory, loadUser, saveInventory, saveUser } from "./users.js";

const selectUserCombat = writer.prepare<[string], Combat>(
  "SELECT * FROM combat WHERE user_id = ?"
);
const selectMonsterCombat = writer.prepare<[number, number, number], Combat>(
  "SELECT * FROM combat WHERE x = ? AND y = ? AND spawn = ?"
);
const selectMonsterState = writer.prepare<
  [number, number, number],
  { hp: number; respawn_at: number | null; monster_id: string }
>("SELECT hp, respawn_at, monster_id FROM monster_state WHERE x = ? AND y = ? AND spawn = ?");
const countActions = writer.prepare<[string], { count: number }>(
  "SELECT count(*) AS count FROM inprogress WHERE user_id = ?"
);
const insertCombat = writer.prepare<
  [string, number, number, number, string, number, number, number]
>(
  "INSERT INTO combat (user_id, x, y, spawn, monster_id, started_at, next_player_at, next_monster_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
);
const deleteCombat = writer.prepare<[string]>("DELETE FROM combat WHERE user_id = ?");
const clearMonsterState = writer.prepare<[number, number, number]>(
  "DELETE FROM monster_state WHERE x = ? AND y = ? AND spawn = ?"
);
const setMonsterHp = writer.prepare<[number, number, number, string, number]>(
  `INSERT INTO monster_state (x, y, spawn, monster_id, hp, respawn_at) VALUES (?, ?, ?, ?, ?, NULL)
   ON CONFLICT (x, y, spawn) DO UPDATE SET hp = excluded.hp, respawn_at = NULL`
);
const updateCombat = writer.prepare<[number, number, string]>(
  "UPDATE combat SET next_player_at = ?, next_monster_at = ? WHERE user_id = ?"
);
const insertHit = writer.prepare<
  [number, number, number, string, string, number, number, number, number]
>(
  "INSERT INTO combat_hits (x, y, spawn, monster_id, user_id, by_monster, damage, fatal, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
const deleteOldHits = writer.prepare<[number]>("DELETE FROM combat_hits WHERE at <= ?");

const recordHit = (
  combat: Combat,
  byMonster: boolean,
  damage: number,
  fatal: boolean,
  at: number
) =>
  insertHit.run(
    combat.x,
    combat.y,
    combat.spawn,
    combat.monster_id,
    combat.user_id,
    Number(byMonster),
    damage,
    Number(fatal),
    at
  );
const selectDueCombat = writer.prepare<[number, number], Combat>(
  "SELECT * FROM combat WHERE next_player_at <= ? OR next_monster_at <= ?"
);

export const combatForUser = (userId: string) => selectUserCombat.get(userId);

export const damageAfterDefence = (damage: number, defence: number) =>
  Math.max(1, Math.floor((damage * MITIGATION_K) / (Math.max(0, defence) + MITIGATION_K)));

const userDefence = (user: GameUserModel, style: AttackStyle) =>
  Object.values(user.e).reduce(
    (total, owned) =>
      total + (itemsById.get(owned.item_id)?.defence?.[style] ?? 0),
    0
  );

const spawnContext = (x: number, y: number, spawn: number) => ({
  action_type: "combat" as const,
  action_id: String(spawn),
  location_x: x,
  location_y: y,
});

/** The main hand's weapon while it has durability left, otherwise fists. */
const playerAttack = (user: GameUserModel) => {
  const owned = user.e.mainHand;
  const item = owned && itemsById.get(owned.item_id);
  return owned && item?.weapon && currentDurability(owned) > 0
    ? { attack: item.weapon, owned, name: item.name }
    : { attack: UNARMED, owned: null, name: null };
};

const context = (combat: Combat) =>
  spawnContext(combat.x, combat.y, combat.spawn);

export const startCombat = (
  user: GameUserModel,
  spawn: number,
  now: number
) => {
  const here =
    user.z && !isOutOfBounds(user.p.x, user.p.y)
      ? getTileSelection(user.p.x, user.p.y)
      : null;
  const monsterId = here?.monsters?.[spawn];
  const monster = monsterId && monstersById.get(monsterId);
  if (!monster) return false;

  let state = selectMonsterState.get(user.p.x, user.p.y, spawn);
  if (
    state &&
    (state.monster_id !== monster.id ||
      (state.respawn_at != null && state.respawn_at <= now))
  ) {
    clearMonsterState.run(user.p.x, user.p.y, spawn);
    zoneChanged(user.p.x, user.p.y);
    state = undefined;
  }
  const blocker = blockingEffect(effectsOn(user, now), "attack");
  const reason = blocker
    ? blockedMessage(blocker, "attack")
    : combatForUser(user.id)
    ? "You're already fighting."
    : countActions.get(user.id)!.count > 0
    ? "Finish gathering before fighting."
    : state?.respawn_at != null
    ? `${monster.name} is dead. Wait for it to respawn.`
    : selectMonsterCombat.get(user.p.x, user.p.y, spawn)
    ? `${monster.name} is already fighting someone.`
    : null;

  if (reason) {
    addSystemMessage(
      user.id,
      reason,
      "warning",
      now,
      spawnContext(user.p.x, user.p.y, spawn)
    );
    return false;
  }

  insertCombat.run(
    user.id,
    user.p.x,
    user.p.y,
    spawn,
    monster.id,
    now,
    now,
    now + monster.attack.speed
  );
  zoneChanged(user.p.x, user.p.y);
  userChanged(user.id);
  addSystemMessage(
    user.id,
    `You attack ${monster.name}.`,
    "info",
    now,
    spawnContext(user.p.x, user.p.y, spawn)
  );
  return true;
};

/** An unfinished fight gives the monster its full health back. */
export const stopCombat = (
  userId: string,
  now: number,
  message = "You flee the fight."
) => {
  const combat = combatForUser(userId);
  if (!combat) return false;
  deleteCombat.run(userId);
  clearMonsterState.run(combat.x, combat.y, combat.spawn);
  zoneChanged(combat.x, combat.y);
  userChanged(userId);
  addSystemMessage(userId, message, "info", now, context(combat));
  const monster = monstersById.get(combat.monster_id);
  if (monster) discoverMonster(userId, monster, now);
  return true;
};

const killMonster = (combat: Combat, monster: Monster, now: number) => {
  deleteCombat.run(combat.user_id);
  markMonsterKilled(combat.x, combat.y, combat.spawn, monster, now);
  userChanged(combat.user_id);

  const drops: string[] = [];
  const discarded: string[] = [];
  for (const drop of monster.drops) {
    if (Math.random() >= drop.chance) continue;
    discoverDrop(combat.user_id, monster.id, drop.item_id, now);
    const name = itemsById.get(drop.item_id)?.name ?? drop.item_id;
    const label = `${drop.qty} x ${name}`;
    if (
      addToInventory(
        combat.user_id,
        { item_id: drop.item_id, qty: drop.qty },
        now
      )
    ) {
      drops.push(label);
    } else {
      discarded.push(label);
    }
  }

  emit({
    type: "monster_killed",
    userId: combat.user_id,
    monsterId: monster.id,
    x: combat.x,
    y: combat.y,
  });
  addSystemMessage(
    combat.user_id,
    `You defeated ${monster.name}.${drops.length ? ` Acquired: ${drops.join(", ")}.` : ""}`,
    "success",
    now,
    context(combat)
  );
  if (discarded.length) {
    addSystemMessage(
      combat.user_id,
      `Your inventory is full. Discarded: ${discarded.join(", ")}`,
      "error",
      now,
      context(combat)
    );
  }
  discoverMonster(combat.user_id, monster, now);
};

const killPlayer = (combat: Combat, user: GameUserModel, now: number) => {
  deleteCombat.run(combat.user_id);
  clearMonsterState.run(combat.x, combat.y, combat.spawn);
  zoneChanged(combat.x, combat.y);
  removeUserFromZone(user.id);
  user.p = { ...START_POSITION };
  user.z = false;
  user.h = Math.ceil(BASE_USER.h * 0.1);
  saveUser(user);
  emit({ type: "player_died", userId: user.id, monsterId: combat.monster_id });
  addSystemMessage(
    user.id,
    `You were defeated by ${monstersById.get(combat.monster_id)?.name ?? "a monster"} and returned to camp.`,
    "error",
    now,
    context(combat)
  );
  const monster = monstersById.get(combat.monster_id);
  if (monster) discoverMonster(user.id, monster, now);
  discoverTile(user.id, user.p.x, user.p.y, now);
};

/**
 * Resolve all swings due by `now`, in time order; the player wins ties. A fight
 * that outlasts the monster's respawn time ends and a fresh monster spawns.
 */
export const processCombat = (now: number) => {
  deleteOldHits.run(now - COMBAT_LOG_MS);
  for (const combat of selectDueCombat.all(now, now)) {
    const monster = monstersById.get(combat.monster_id);
    if (!monster) {
      stopCombat(combat.user_id, now, "The fight has ended.");
      continue;
    }
    const deadline =
      monster.respawnTime > 0
        ? combat.started_at + monster.respawnTime * 1000
        : Infinity;
    const until = Math.min(now, deadline);
    let active = true;
    while (active && Math.min(combat.next_player_at, combat.next_monster_at) <= until) {
      const user = loadUser(combat.user_id);
      if (!user || !user.z || user.p.x !== combat.x || user.p.y !== combat.y) {
        stopCombat(combat.user_id, now);
        active = false;
        break;
      }

      if (combat.next_player_at <= combat.next_monster_at) {
        const { attack, owned, name } = playerAttack(user);
        const hp =
          selectMonsterState.get(combat.x, combat.y, combat.spawn)?.hp ??
          monster.health;
        const damage = damageAfterDefence(
          attack.damage,
          monster.defence[attack.style]
        );
        const remaining = Math.max(0, hp - damage);
        recordHit(combat, false, damage, remaining === 0, combat.next_player_at);
        if (owned) {
          wearItem(owned, 1);
          saveInventory(user);
          if (owned.qty === 0) {
            addSystemMessage(
              user.id,
              `Your ${name} broke. You're fighting barehanded.`,
              "warning",
              now,
              context(combat)
            );
          }
        }
        zoneChanged(combat.x, combat.y);
        userChanged(user.id);
        if (remaining === 0) {
          killMonster(combat, monster, now);
          active = false;
        } else {
          setMonsterHp.run(combat.x, combat.y, combat.spawn, monster.id, remaining);
          combat.next_player_at += attack.speed;
        }
      } else {
        const damage = damageAfterDefence(
          monster.attack.damage,
          userDefence(user, monster.attack.style)
        );
        user.h = Math.max(0, user.h - damage);
        recordHit(combat, true, damage, user.h === 0, combat.next_monster_at);
        if (user.h === 0) {
          killPlayer(combat, user, now);
          active = false;
        } else {
          saveUser(user);
          zoneChanged(combat.x, combat.y);
          combat.next_monster_at += monster.attack.speed;
        }
      }
    }
    if (!active) continue;
    if (now > deadline) {
      stopCombat(
        combat.user_id,
        now,
        `The fight dragged on and ${monster.name} slipped away. Another has taken its place.`
      );
    } else {
      updateCombat.run(combat.next_player_at, combat.next_monster_at, combat.user_id);
    }
  }
};
