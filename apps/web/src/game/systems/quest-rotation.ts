import { addHours, startOfHour } from "date-fns";
import { writer } from "../../db/writer.js";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  Quest,
  TileQuest,
  type Tile,
  type TileObjective,
} from "../../config.js";
import { getTileSelection } from "../../world/index.js";
import { randomIndex } from "../../lib/random.js";
import { quests } from "../../config/quests.js";
import { isTileExploreObjective, isTileTalkObjective } from "@aederyn/types";
import { questsChanged } from "../changes.js";

const upsertQuest = writer.prepare<
  [string, number, number, number, number, number, number, number, string]
>(`
  INSERT INTO quests
  (quest_id, version, startX, startY, endX, endY, starts_at, ends_at, data)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (quest_id) DO UPDATE SET
    version = excluded.version,
    startX = excluded.startX,
    startY = excluded.startY,
    endX = excluded.endX,
    endY = excluded.endY,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    data = excluded.data
`);
const selectAllQuests = writer.prepare<[], { data: string }>(
  "SELECT data FROM quests"
);
const hasQuestsEndingBy = writer.prepare<[number], { found: number }>(
  "SELECT 1 AS found FROM quests WHERE ends_at >= ? LIMIT 1"
);

const rotationWindow = (now: Date) => {
  const starts_at = startOfHour(now);
  return { starts_at, ends_at: addHours(starts_at, 2) };
};

/** Whether every located part of the quest still sits on a tile of its zone. */
const isPlacedInItsZones = (quest: TileQuest) =>
  [quest.giver, quest.completion, ...quest.objectives].every(
    (p) =>
      !("zone_id" in p && "x" in p) ||
      getTileSelection(p.x, p.y).id === p.zone_id
  );

export class QuestManager {
  static VERSION = 2;

  /**
   * Adds this hour's quests. Every rotation sets `ends_at` to the end of the
   * current window, so a quest ending that late means this hour has already
   * rotated; skip unless forced. That keeps the in-app schedule and any
   * leftover external cron from double-rotating.
   *
   * Runs inside the tick as the `rotate_quests` command, or inside its own
   * transaction from `pnpm cron`.
   */
  rotateActiveQuests(now: number, { force = false }: { force?: boolean } = {}) {
    const { ends_at } = rotationWindow(new Date(now));
    if (!force && hasQuestsEndingBy.get(ends_at.getTime())) {
      console.log("Quests already rotated this hour");
      return;
    }

    this.saveRotation(this.generateTileQuests(10, now));
  }

  private saveRotation(newTileQuests: TileQuest[]) {
    const existingQuests = this.getAllQuests();

    // Expired quests are kept rather than deleted: deleting would cascade away
    // user progress, and in-progress quests should resume if they come back.
    console.log("Adding new quests", newTileQuests.length);

    for (const generatedQuest of newTileQuests) {
      const existing = existingQuests.get(generatedQuest.id);

      // Still active from a previous rotation: extend it rather than
      // re-rolling locations or resetting when it became available. Unless
      // the map has changed under it (the tile config changed), in which
      // case its old locations are no longer in its zones.
      const newTileQuest =
        existing &&
        existing.ends_at >= generatedQuest.starts_at &&
        isPlacedInItsZones(existing)
          ? { ...existing, ends_at: generatedQuest.ends_at }
          : generatedQuest;

      upsertQuest.run(
        newTileQuest.id,
        QuestManager.VERSION,
        newTileQuest.giver.x,
        newTileQuest.giver.y,
        newTileQuest.completion.x,
        newTileQuest.completion.y,
        newTileQuest.starts_at,
        newTileQuest.ends_at,
        JSON.stringify(newTileQuest)
      );
    }

    questsChanged();
  }

  private getAllQuests() {
    const quests = selectAllQuests
      .all()
      .map((row) => JSON.parse(row.data) as TileQuest);

    return new Map(quests.map((quest) => [quest.id, quest]));
  }

  private getRandomQuests(amount: number): Quest[] {
    const selectedQuests: Quest[] = [];
    for (let i = 0; i < amount; i++) {
      const questIndex = randomIndex(quests);
      if (questIndex === null) {
        continue;
      }
      const quest = quests[questIndex];
      if (quest.is_tutorial) {
        continue;
      }
      selectedQuests.push(quest);
    }
    return [...selectedQuests, ...quests.filter((quest) => quest.is_tutorial)];
  }

  private generateTileQuests(max: number, now: number): TileQuest[] {
    console.log("Generating tile quests");
    const quests = this.getRandomQuests(max);

    const tileQuests: TileQuest[] = [];
    const { starts_at, ends_at } = rotationWindow(new Date(now));

    console.log("Assigning tiles");
    const tiles: Record<string, ({ x: number; y: number } & Tile)[]> = {};
    for (let xAxis = 0; xAxis < MAP_WIDTH; xAxis++) {
      for (let yAxis = 0; yAxis < MAP_HEIGHT; yAxis++) {
        const tile = getTileSelection(xAxis, yAxis);
        tiles[tile.id] = [
          ...(tiles[tile.id] || []),
          { ...tile, x: xAxis, y: yAxis },
        ];
      }
    }

    console.log("Assigning quests");
    for (const quest of quests) {
      //TODO: Ensure the zone_ids are valid
      if (typeof tiles[quest.giver.zone_id] === "undefined") {
        console.warn("No tiles for zone start", quest.giver.zone_id, quest.id);
        continue;
      }

      const startTileIndex = randomIndex(tiles[quest.giver.zone_id]);

      if (startTileIndex === null) {
        console.warn("No start tile found for task", quest);
        continue;
      }

      const finishTileIndex =
        quest.giver.zone_id === quest.completion.zone_id
          ? startTileIndex
          : randomIndex(tiles[quest.completion.zone_id]);

      //TODO: Ensure the zone_ids are valid
      if (typeof tiles[quest.completion.zone_id] === "undefined") {
        console.warn(
          "No tiles for zone completion",
          quest.completion.zone_id,
          quest.id
        );
        continue;
      }

      if (finishTileIndex === null) {
        console.warn("No end tile found for task", quest);
        continue;
      }

      const startTile = tiles[quest.giver.zone_id][startTileIndex];
      const finishTile = tiles[quest.completion.zone_id][finishTileIndex];

      if (!startTile || !finishTile) {
        console.warn(
          "POST SELECTION: No start or end tile found for task",
          quest
        );
        continue;
      }

      const objectives = quest.objectives.map((objective) => {
        if (objective.type !== "explore" && objective.type !== "talk") {
          return objective;
        }

        if (isTileExploreObjective(objective)) {
          return objective;
        }

        if (isTileTalkObjective(objective)) {
          return objective;
        }

        const index = randomIndex(tiles[objective.zone_id]);

        //TODO: Ensure the zone_ids are valid
        if (typeof tiles[objective.zone_id] === "undefined") {
          console.warn(
            "No tiles for zone objective",
            objective.zone_id,
            quest.id,
            objective.id
          );
          return null;
        }

        if (index === null) {
          console.warn("No zone tile found for objective", objective, quest.id);
          return null;
        }

        const tile = tiles[objective.zone_id][index];

        return {
          ...objective,
          x: tile.x,
          y: tile.y,
        };
      });

      const filteredObjectives = objectives.filter(
        (objective): objective is TileObjective => objective !== null
      );

      if (filteredObjectives.length !== objectives.length) {
        console.warn("No tile found for quest objective, skipping", quest.id);
        continue;
      }

      const tileQuest = {
        ...quest,
        giver: {
          ...quest.giver,
          x: startTile.x,
          y: startTile.y,
        },
        completion: {
          ...quest.completion,
          x: finishTile.x,
          y: finishTile.y,
        },
        objectives: filteredObjectives,
        starts_at: starts_at.getTime(),
        ends_at: ends_at.getTime(),
      };

      tileQuests.push(tileQuest);
    }

    return tileQuests;
  }
}

export const questManager = new QuestManager();

/**
 * For `pnpm cron`, which runs in its own process: a second writer while the
 * app is up. busy_timeout makes it wait for the current tick to commit.
 */
export const rotateQuestsOutsideLoop = ({ force = false } = {}) =>
  writer.transaction(() =>
    questManager.rotateActiveQuests(Date.now(), { force })
  )();
