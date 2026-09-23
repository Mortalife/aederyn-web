import {
  type AttackStyle,
  type Defence,
  type Monster,
} from "../../config.js";
import { monstersById } from "../../config/monsters.js";
import type { SystemMessage } from "../../user/system.js";
import {
  selectMapIndicators,
  selectZoneNPCInteractions,
  selectZoneQuests,
  type ZoneQuests,
} from "../../user/quest-progress-manager.js";
import {
  generateMap,
  type Point,
  type WorldTile,
} from "../../world/index.js";
import {
  COMBAT_LOG_MS,
  type Combat,
  type CombatHit,
  type MonsterState,
} from "../../world/monsters.js";
import type { ViewInput } from "./load.js";

/** How long an action's message flashes next to it. */
export const FLASH_MS = 5000;
/** How long the menu badge takes the colour of the newest message. */
export const ALERT_MS = 10_000;

/**
 * `now` rounded up to the minute, for relative times ("5 minutes ago"), so
 * a render only changes when the text would. Rounded up so nothing that
 * already happened reads as being in the future.
 */
export const clockMinute = (now: number) => Math.ceil(now / 60_000) * 60_000;

/** Turns loaded view input into the screen's view model. Pure. */
export const selectGame = (
  input: ViewInput,
  { now, isMobile }: { now: number; isMobile?: boolean }
) => {
  const { user, activeQuests, questState } = input;

  const map = generateMap(user.p, input.resourceUsage);
  const quests = selectZoneQuests(
    activeQuests,
    questState,
    user.p.x,
    user.p.y
  );

  const here = map.find((tile) => tile.here);
  const monsters = here
    ? selectZoneMonsters(here, input.monsterState, input.combat, input.combatHits)
    : [];

  const contextFlashes = selectContextFlashes(input.messages, user.p, now);
  const recent = input.messages[0];
  const alert = recent && recent.sent_at > now - ALERT_MS ? recent : null;

  return {
    map,
    mapIndicators: selectMapIndicators(activeQuests, questState, map),
    user,
    messages: input.messages,
    inprogress: input.inprogress ?? undefined,
    zoneUsers: input.zoneUsers,
    monsters,
    players: input.zoneUsers.filter((player) => player.id !== user.id),
    chatMessages: input.chatMessages,
    quests,
    npcInteractions: selectZoneNPCInteractions(
      activeQuests,
      questState,
      user.p.x,
      user.p.y
    ),
    isMobile,
    resourceObjectives: selectResourceObjectives(quests, map),
    contextFlashes,
    totalPlayersOnline: input.totalPlayersOnline,
    now,
    clock: clockMinute(now),
    /** Identifies what's flashing, so renders can be memoized on it. */
    flashKey: [...contextFlashes]
      .map(([key, message]) => `${key}=${message.id}`)
      .join(","),
    alertKey: alert ? String(alert.id) : "",
    /** Identifies the hits in the monsters' combat logs. */
    hitsKey: monsters.flatMap((m) => m.hits.map((hit) => hit.id)).join(","),
    /** When a flash or alert ends, so the screen must be drawn again. */
    wakeAt: Math.min(
      ...[...contextFlashes.values()].map((m) => m.sent_at + FLASH_MS),
      alert ? alert.sent_at + ALERT_MS : Infinity,
      ...monsters.flatMap((m) => m.hits.map((hit) => hit.at + COMBAT_LOG_MS))
    ),
  };
};

export type GameView = ReturnType<typeof selectGame>;

/**
 * Recent messages tied to an action, for flashing next to it. Keys are
 * either "action_type" or "action_type:action_id"; the newest wins. A
 * message with a location only flashes there, so gathering on one tile
 * doesn't flash on another tile with the same resource.
 */
const selectContextFlashes = (
  messages: SystemMessage[],
  position: Point,
  now: number
) => {
  const contextFlashes = new Map<string, SystemMessage>();
  for (const msg of messages) {
    const elsewhere =
      msg.location_x != null &&
      msg.location_y != null &&
      (msg.location_x !== position.x || msg.location_y !== position.y);
    if (msg.action_type && !elsewhere && msg.sent_at > now - FLASH_MS) {
      if (msg.action_id) {
        const key = `${msg.action_type}:${msg.action_id}`;
        if (!contextFlashes.has(key)) {
          contextFlashes.set(key, msg);
        }
      }
      if (!contextFlashes.has(msg.action_type)) {
        contextFlashes.set(msg.action_type, msg);
      }
    }
  }
  return contextFlashes;
};

/** Resources here that would move an in-progress quest along. */
const selectResourceObjectives = (quests: ZoneQuests, map: WorldTile[]) => {
  const resourceObjectives = new Set<string>();
  const here = map.find((tile) => tile.here);

  for (const { currentObjective } of quests.inProgressQuests) {
    if (
      currentObjective &&
      (currentObjective.type === "gather" ||
        currentObjective.type === "craft") &&
      currentObjective.resource_id
    ) {
      resourceObjectives.add(currentObjective.resource_id);
    }

    if (
      currentObjective &&
      currentObjective.type === "collect" &&
      currentObjective.item_id
    ) {
      // Resources that reward the item this collect objective needs
      for (const resource of here?.tile?.resources ?? []) {
        if (
          resource.reward_items?.some(
            (r) => r.item.id === currentObjective.item_id
          )
        ) {
          resourceObjectives.add(resource.id);
        }
      }
    }
  }

  return resourceObjectives;
};

export type ZoneMonster = {
  /** Its index in the tile's `monsters`, which identifies it on the tile. */
  spawn: number;
  monster: Monster;
  hp: number;
  /** Set while dead. */
  respawnAt: number | null;
  /** Someone is fighting it. */
  engaged: boolean;
  combat: Combat | null;
  /** Recent hits on or by it, newest first. */
  hits: CombatHit[];
  /** The styles it defends least against, or none if all are equal. */
  weakTo: AttackStyle[];
};

/** The styles with the lowest defence, or none if every style is equal. */
export const weakestStyles = (defence: Defence): AttackStyle[] => {
  const styles = Object.keys(defence) as AttackStyle[];
  const lowest = Math.min(...styles.map((style) => defence[style]));
  const weakest = styles.filter((style) => defence[style] === lowest);
  return weakest.length === styles.length ? [] : weakest;
};

/** The monsters on a tile, with their HP and whether they're dead or engaged. */
const selectZoneMonsters = (
  tile: WorldTile,
  state: MonsterState[],
  combat: Combat[],
  hits: CombatHit[]
): ZoneMonster[] =>
  (tile.tile?.monsters ?? []).flatMap((id, spawn) => {
    const monster = monstersById.get(id);
    if (!monster) {
      return [];
    }

    const here = (row: { x: number; y: number; spawn: number }) =>
      row.x === tile.x && row.y === tile.y && row.spawn === spawn;
    const row = state.find(here);

    return [
      {
        spawn,
        monster,
        hp: row ? row.hp : monster.health,
        respawnAt: row?.respawn_at ?? null,
        engaged: combat.some(here),
        combat: combat.find(here) ?? null,
        hits: hits.filter(here),
        weakTo: weakestStyles(monster.defence),
      },
    ];
  });
