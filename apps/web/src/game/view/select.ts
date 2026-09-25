import {
  worldMap,
  type AttackStyle,
  type Defence,
  type Item,
  type Monster,
  type NPC,
  type Resource,
  type ResourceModel,
} from "../../config.js";
import { itemsById } from "../../config/items.js";
import { monstersById } from "../../config/monsters.js";
import { resourcesById } from "../../config/resources.js";
import type { UserAction } from "../../user/action.js";
import { npcs as allNpcs } from "../../config/npcs.js";
import type { SystemMessage } from "../../user/system.js";
import {
  selectBoardContracts,
  selectMapIndicators,
  selectTrackedQuests,
  selectZoneNPCInteractions,
  selectZoneQuests,
  type ZoneQuests,
} from "../../user/quest-progress-manager.js";
import { boardLandmarks, type PlacedQuest } from "../../world/quests.js";
import {
  allCells,
  generateMap,
  getTileSelection,
  type Point,
  type WorldTile,
} from "../../world/index.js";
import { pairKey, type Discoveries } from "../../user/discoveries.js";
import {
  COMBAT_LOG_MS,
  type Combat,
  type CombatHit,
  type MonsterState,
} from "../../world/monsters.js";
import { collectEffects, resolveEffects } from "../../world/effects.js";
import type { ViewInput } from "./load.js";

export const FLASH_MS = 5000;
export const FIGHT_LINGER_MS = 2000;

/**
 * `now` rounded up to the minute, for relative times ("5 minutes ago"), so
 * a render only changes when the text would. Rounded up so nothing that
 * already happened reads as being in the future.
 */
export const clockMinute = (now: number) => Math.ceil(now / 60_000) * 60_000;

export const selectGame = (
  input: ViewInput,
  { now }: { now: number }
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

  const landmark = user.z ? here?.tile?.landmark ?? null : null;
  const npcs = npcsAtHome(landmark).map((npc) => ({
    npc,
    offers: quests.availableQuests.filter(
      (q) => q.kind === "story" && q.giver.entity_id === npc.entity_id
    ),
  }));
  const board =
    landmark && boardLandmarks.has(landmark)
      ? selectBoardContracts(activeQuests, questState, user.p.x, user.p.y)
      : null;

  const contextFlashes = selectContextFlashes(input.messages, user.p, now);
  const activity = selectActivity(
    user.id,
    input.inprogress,
    here?.tile?.resources ?? [],
    monsters,
    now
  );
  const combatLog = monsters.flatMap(({ monster, hits }) =>
    hits
      .filter((hit) => hit.user_id === user.id)
      .map((hit) => ({ hit, monsterName: monster.name }))
  );

  const effects = resolveEffects(
    collectEffects(
      user.p,
      Object.values(user.e).map((owned) => owned.item.id),
      input.timedEffects,
      now
    )
  );

  return {
    map,
    mapIndicators: selectMapIndicators(activeQuests, questState, map),
    user,
    effects,
    messages: input.messages,
    inprogress: input.inprogress ?? undefined,
    zoneUsers: input.zoneUsers,
    monsters,
    npcs,
    board,
    players: input.zoneUsers.filter((player) => player.id !== user.id),
    chatMessages: input.chatMessages,
    quests,
    tracked: selectTrackedQuests(activeQuests, questState),
    npcInteractions: selectZoneNPCInteractions(
      activeQuests,
      questState,
      user.p.x,
      user.p.y
    ),
    resourceObjectives: selectResourceObjectives(quests, map),
    monsterObjectives: new Set(
      quests.inProgressQuests.flatMap(({ currentObjective }) =>
        currentObjective?.type === "kill" ? [currentObjective.monster_id] : []
      )
    ),
    objectiveItems: selectObjectiveItems(quests),
    usableHere: selectUsableHere(user.z ? here : undefined),
    contextFlashes,
    totalPlayersOnline: input.totalPlayersOnline,
    /** What the player has found. Don't mutate: it's shared between renders. */
    discoveries: input.discoveries.discoveries,
    /** Changes only when something new is found, for fragment keys. */
    discoveryVersion: input.discoveries.version,
    now,
    clock: clockMinute(now),
    /** Identifies what's flashing, so renders can be memoized on it. */
    flashKey: [...contextFlashes]
      .map(([key, message]) => `${key}=${message.id}`)
      .join(","),
    /** Identifies the hits in the monsters' combat logs. */
    hitsKey: monsters.flatMap((m) => m.hits.map((hit) => hit.id)).join(","),
    activity,
    activityKey: !activity
      ? "idle"
      : activity.kind === "gather"
      ? `gather:${activity.resourceId}:${activity.startedAt}`
      : `fight:${activity.fight.spawn}:${activity.active ? "on" : "won"}`,
    combatLog,
    /** Identifies the player's system messages, for the log. */
    messagesKey: input.messages.map((m) => m.id).join(","),
    /** When a flash, a hit or a won fight leaves the screen. */
    wakeAt: Math.min(
      ...[...contextFlashes.values()].map((m) => m.sent_at + FLASH_MS),
      ...monsters.flatMap((m) => m.hits.map((hit) => hit.at + COMBAT_LOG_MS)),
      activity?.kind === "fight" && !activity.active
        ? activity.fight.hits[0]!.at + FIGHT_LINGER_MS
        : Infinity
    ),
  };
};

export type GameView = ReturnType<typeof selectGame>;

export type Resident = { npc: NPC; offers: PlacedQuest[] };

const npcsByHome = Map.groupBy(
  allNpcs.filter((npc) => npc.home),
  (npc) => npc.home!
);

export const npcsAtHome = (landmark: string | null): NPC[] =>
  (landmark && npcsByHome.get(landmark)) || [];

export type TileContents = {
  stations: string[];
  gather: number;
  monsters: { monster: Monster; count: number }[];
  people: NPC[];
  board: boolean;
};

const contentsByCell = new Map<string, TileContents>();

export const tileContents = (tile: WorldTile): TileContents | null => {
  const cell = tile.tile;
  if (!cell) {
    return null;
  }
  const key = `${tile.x},${tile.y}`;
  let contents = contentsByCell.get(key);
  if (!contents) {
    const monsters = new Map<string, { monster: Monster; count: number }>();
    for (const id of cell.monsters) {
      const monster = monstersById.get(id);
      if (monster) {
        const entry = monsters.get(id) ?? { monster, count: 0 };
        entry.count++;
        monsters.set(id, entry);
      }
    }
    contents = {
      stations: [
        ...new Set(
          cell.resources.filter((r) => r.type !== "resource").map((r) => r.type)
        ),
      ],
      gather: cell.resources.filter((r) => r.type === "resource").length,
      monsters: [...monsters.values()],
      people: npcsAtHome(cell.landmark),
      board: !!cell.landmark && boardLandmarks.has(cell.landmark),
    };
    contentsByCell.set(key, contents);
  }
  return contents;
};

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

export type Activity =
  | {
      kind: "gather";
      resourceId: string;
      /** The resource as placed here, with its items; null elsewhere. */
      resource: Resource | null;
      name: string;
      startedAt: number;
      endsAt: number;
    }
  | {
      kind: "fight";
      fight: ZoneMonster;
      /** False for a moment after the player's killing blow. */
      active: boolean;
    };

/**
 * The one thing the player is doing: a gather or craft, or a fight, which
 * stays on screen briefly after a kill so the last blow can be seen.
 */
const selectActivity = (
  userId: string,
  inprogress: UserAction | null,
  resources: Resource[],
  monsters: ZoneMonster[],
  now: number
): Activity | null => {
  if (inprogress) {
    const resource =
      resources.find((r) => r.id === inprogress.resource_id) ?? null;
    return {
      kind: "gather",
      resourceId: inprogress.resource_id,
      resource,
      name:
        resource?.name ??
        resourcesById.get(inprogress.resource_id)?.name ??
        inprogress.resource_id,
      startedAt: inprogress.inprogress_at,
      endsAt: inprogress.completed_at,
    };
  }

  const fighting = monsters.find((m) => m.combat?.user_id === userId);
  if (fighting) {
    return { kind: "fight", fight: fighting, active: true };
  }

  const won = monsters.find(
    ({ hits: [last] }) =>
      last &&
      last.user_id === userId &&
      !last.by_monster &&
      last.fatal &&
      last.at + FIGHT_LINGER_MS > now
  );
  return won ? { kind: "fight", fight: won, active: false } : null;
};

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

const selectObjectiveItems = (quests: ZoneQuests) => {
  const items = new Set<string>();
  for (const { currentObjective } of [
    ...quests.inProgressQuests,
    ...quests.elsewhereQuests,
  ]) {
    if (currentObjective?.type === "collect") {
      items.add(currentObjective.item_id);
    }
    if (
      currentObjective?.type === "gather" ||
      currentObjective?.type === "craft"
    ) {
      const resource = resourcesById.get(currentObjective.resource_id);
      for (const required of resource?.required_items ?? []) {
        items.add(required.item_id);
      }
    }
  }
  return items;
};

export const selectUsableHere = (here: WorldTile | undefined) =>
  new Set(
    (here?.tile?.resources ?? []).flatMap((resource) =>
      resource.required_items.map((required) => required.item.id)
    )
  );

export type ZoneMonster = {
  spawn: number;
  monster: Monster;
  hp: number;
  respawnAt: number | null;
  engaged: boolean;
  combat: Combat | null;
  hits: CombatHit[];
  weakTo: AttackStyle[];
};

/** The styles with the lowest defence, or none if every style is equal. */
export const weakestStyles = (defence: Defence): AttackStyle[] => {
  const styles = Object.keys(defence) as AttackStyle[];
  const lowest = Math.min(...styles.map((style) => defence[style]));
  const weakest = styles.filter((style) => defence[style] === lowest);
  return weakest.length === styles.length ? [] : weakest;
};

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

    // Rows left from a different spawn (the map changed) don't apply.
    const here = (row: { x: number; y: number; spawn: number; monster_id: string }) =>
      row.x === tile.x &&
      row.y === tile.y &&
      row.spawn === spawn &&
      row.monster_id === id;
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

/** Everything there is to find, from the config alone, worked out once. */
const findable = (() => {
  let cached: {
    regions: Map<string, Map<string, string>>;
    monsters: Monster[];
    recipes: ResourceModel[];
    people: { npc: NPC; home: { name: string; x: number; y: number } | null }[];
  } | null = null;

  return () => {
    if (cached) return cached;
    const regions = new Map<string, Map<string, string>>();
    const monsters = new Set<string>();
    const recipes = new Set<string>();
    for (const { tile } of allCells()) {
      if (tile.accessible) {
        const region = tile.region?.id ?? "";
        const places = regions.get(region) ?? new Map<string, string>();
        places.set(tile.id, tile.name);
        regions.set(region, places);
      }
      for (const id of tile.monsters) monsters.add(id);
      for (const id of tile.resources) {
        if (resourcesById.get(id)?.type !== "resource") recipes.add(id);
      }
    }

    const landmarks = new Map(worldMap.landmarks.map((l) => [l.id, l]));
    const order = worldMap.regions.map((r) => r.id);
    cached = {
      regions: new Map(
        [...regions].sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
      ),
      monsters: [...monsters].flatMap((id) => monstersById.get(id) ?? []),
      recipes: [...recipes].flatMap((id) => resourcesById.get(id) ?? []),
      people: allNpcs
        .filter((npc) => npc.home && landmarks.has(npc.home))
        .map((npc) => {
          const { x, y } = landmarks.get(npc.home!)!;
          const tile = getTileSelection(x, y);
          return { npc, home: tile.accessible ? { name: tile.name, x, y } : null };
        }),
    };
    return cached;
  };
})();

export type Journal = ReturnType<typeof selectJournal>;

/**
 * What the player has found, against what there is to find: places by
 * region, creatures, recipes by station, and people.
 */
export const selectJournal = (discoveries: Discoveries) => {
  const all = findable();

  const visited = new Map<string, Set<string>>();
  for (const key of discoveries.tiles) {
    const [x, y] = key.split(",").map(Number) as [number, number];
    const cell = getTileSelection(x, y);
    const region = cell.region?.id ?? "";
    visited.set(region, (visited.get(region) ?? new Set()).add(cell.id));
  }

  const places = [...all.regions].map(([region, tiles]) => ({
    region,
    found: [...tiles]
      .filter(([id]) => visited.get(region)?.has(id))
      .map(([, name]) => name),
    total: tiles.size,
  }));

  const creatures = all.monsters
    .filter((monster) => discoveries.monsters.has(monster.id))
    .map((monster) => ({
      monster,
      weakTo: weakestStyles(monster.defence),
      drops: monster.drops.flatMap(({ item_id }): { item: Item; found: boolean }[] => {
        const item = itemsById.get(item_id);
        return item
          ? [{ item, found: discoveries.monsterDrops.has(pairKey(monster.id, item_id)) }]
          : [];
      }),
    }));

  const recipes = Object.entries(Object.groupBy(all.recipes, (r) => r.type)).map(
    ([type, list]) => ({
      type: type as Resource["type"],
      found: list!.filter((r) => discoveries.recipes.has(r.id)).map((r) => r.name),
      total: list!.length,
    })
  );

  const people = all.people.filter(({ npc }) => discoveries.npcs.has(npc.entity_id));

  const sections = {
    places: {
      found: places.reduce((sum, p) => sum + p.found.length, 0),
      total: places.reduce((sum, p) => sum + p.total, 0),
    },
    creatures: { found: creatures.length, total: all.monsters.length },
    recipes: {
      found: recipes.reduce((sum, r) => sum + r.found.length, 0),
      total: all.recipes.length,
    },
    people: { found: people.length, total: all.people.length },
  };
  const counts = Object.values(sections);

  return {
    places,
    creatures,
    recipes,
    people,
    sections,
    found: counts.reduce((sum, c) => sum + c.found, 0),
    total: counts.reduce((sum, c) => sum + c.total, 0),
  };
};
