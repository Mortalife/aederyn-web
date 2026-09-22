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
    /** When a flash or alert ends, so the screen must be drawn again. */
    wakeAt: Math.min(
      ...[...contextFlashes.values()].map((m) => m.sent_at + FLASH_MS),
      alert ? alert.sent_at + ALERT_MS : Infinity
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
