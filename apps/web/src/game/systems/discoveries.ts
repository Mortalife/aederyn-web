import type { GameUserModel, Monster, ResourceModel } from "../../config.js";
import { monstersById } from "../../config/monsters.js";
import { npcsById } from "../../config/npcs.js";
import { questsById } from "../../config/quests.js";
import { resourcesById } from "../../config/resources.js";
import { writer } from "../../db/writer.js";
import {
  pairKey,
  tileKey,
  type DiscoveryKind,
} from "../../user/discoveries.js";
import type { UserQuestState } from "../../user/quest-progress-manager.js";
import { getTileSelection, isOutOfBounds, type Point } from "../../world/index.js";
import type { PlacedQuest } from "../../world/quests.js";
import { discovered } from "../changes.js";
import { addSystemMessage } from "./system-messages.js";

const insertDiscovery = writer.prepare<[string, DiscoveryKind, string, number]>(
  "INSERT OR IGNORE INTO discoveries (user_id, kind, id, at) VALUES (?, ?, ?, ?)"
);

/** Record a discovery. Returns true only if it's new. */
export const discover = (
  userId: string,
  kind: DiscoveryKind,
  id: string,
  now: number
) => {
  if (insertDiscovery.run(userId, kind, id, now).changes === 0) {
    return false;
  }
  discovered(userId);
  return true;
};

const announce = (
  userId: string,
  name: string,
  id: string,
  now: number,
  at?: Point
) =>
  addSystemMessage(userId, `Discovered: ${name}`, "info", now, {
    action_type: "discovery",
    action_id: id,
    location_x: at?.x,
    location_y: at?.y,
  });

const recordTile = (userId: string, x: number, y: number, now: number) =>
  !isOutOfBounds(x, y) && discover(userId, "tile", tileKey(x, y), now);

/** The player is at a cell. Announced the first time they stand on it. */
export const discoverTile = (userId: string, x: number, y: number, now: number) => {
  if (recordTile(userId, x, y, now)) {
    const cell = getTileSelection(x, y);
    announce(userId, cell.name, pairKey("tile", tileKey(x, y)), now, { x, y });
  }
};

/** Where a quest sends the player: its objectives' cells and where it's handed in. */
const questTiles = (quest: PlacedQuest): Point[] => [
  ...quest.objectives.flatMap((o) => ("x" in o ? [{ x: o.x, y: o.y }] : [])),
  { x: quest.completion.x, y: quest.completion.y },
];

export const discoverQuestTiles = (userId: string, quest: PlacedQuest, now: number) => {
  for (const { x, y } of questTiles(quest)) {
    discover(userId, "heard_tile", tileKey(x, y), now);
  }
};

export const discoverMonster = (userId: string, monster: Monster, now: number) => {
  if (discover(userId, "monster", monster.id, now)) {
    announce(userId, monster.name, pairKey("monster", monster.id), now);
  }
};

export const discoverDrop = (
  userId: string,
  monsterId: string,
  itemId: string,
  now: number
) => discover(userId, "monster_drop", pairKey(monsterId, itemId), now);

const isRecipe = (resource: ResourceModel) => resource.type !== "resource";

/** Returns true if the recipe is new. */
const recordResource = (userId: string, resource: ResourceModel, now: number) => {
  for (const reward of resource.reward_items) {
    discover(userId, "resource_output", pairKey(resource.id, reward.item_id), now);
  }
  return isRecipe(resource) && discover(userId, "recipe", resource.id, now);
};

/** A completed resource: the recipe, if it's done at a station, and what it gave. */
export const discoverResource = (
  userId: string,
  resource: ResourceModel,
  now: number
) => {
  if (recordResource(userId, resource, now)) {
    announce(userId, resource.name, pairKey("recipe", resource.id), now);
  }
};

export const discoverItem = (userId: string, itemId: string, now: number) =>
  discover(userId, "item", itemId, now);

export const discoverNpc = (userId: string, npcId: string, now: number) => {
  const npc = npcsById.get(npcId);
  if (npc && discover(userId, "npc", npc.entity_id, now)) {
    announce(userId, npc.name, pairKey("npc", npc.entity_id), now);
  }
};

/**
 * Records what the player already knows from their state: where they stand,
 * what they hold, and what their quests have taken them through. Silent and
 * idempotent, so it can run on every login and connect; it's how players
 * from before discoveries existed get theirs.
 */
export const backfillDiscoveries = (
  user: GameUserModel,
  quests: PlacedQuest[],
  state: UserQuestState,
  now: number
) => {
  recordTile(user.id, user.p.x, user.p.y, now);

  for (const owned of [...user.i, ...Object.values(user.e)]) {
    discover(user.id, "item", owned.item_id, now);
  }

  const placed = new Map(quests.map((q) => [q.id, q]));

  for (const progress of state.quests.values()) {
    const quest = questsById.get(progress.quest_id);
    if (quest?.kind === "story" && progress.status === "completed") {
      discover(user.id, "npc", quest.completion.entity_id, now);
    }

    const current = placed.get(progress.quest_id);
    if (current && progress.status !== "completed") {
      for (const { x, y } of questTiles(current)) {
        discover(user.id, "heard_tile", tileKey(x, y), now);
      }
    }
  }

  for (const progress of state.objectives.values()) {
    if (progress.current <= 0 && !progress.completed) {
      continue;
    }
    const objective = questsById
      .get(progress.quest_id)
      ?.objectives.find((o) => o.id === progress.objective_id);

    switch (objective?.type) {
      case "talk":
        discover(user.id, "npc", objective.entity_id, now);
        break;
      case "gather":
      case "craft": {
        const resource = resourcesById.get(objective.resource_id);
        if (resource) {
          recordResource(user.id, resource, now);
        }
        break;
      }
      case "kill":
        if (monstersById.has(objective.monster_id)) {
          discover(user.id, "monster", objective.monster_id, now);
        }
        break;
    }
  }
};
