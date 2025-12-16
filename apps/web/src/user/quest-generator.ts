import { addHours, startOfHour } from "date-fns";
import { client } from "../database.js";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  Quest,
  TileQuest,
  type Tile,
  type TileObjective,
} from "../config.js";
import { getTileSelection } from "../world/index.js";
import { randomIndex } from "../lib/random.js";
import { quests } from "../config/quests.js";
import { isTileExploreObjective, isTileTalkObjective } from "@aederyn/types";

export class QuestManager {
  static VERSION = 2;
  static migrations() {
    // Create tables if they don't exist
    return [
      `
      DROP TABLE IF EXISTS quests_templates;`,
      `
      CREATE TABLE IF NOT EXISTS quests (
        quest_id TEXT NOT NULL,
        version INT NOT NULL,
        startX INT NOT NULL,
        startY INT NOT NULL,
        endX INT NOT NULL,
        endY INT NOT NULL,
        starts_at INT NOT NULL,
        ends_at INT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (quest_id)
      );`,
    ];
  }

  async rotateActiveQuests() {
    const inactiveQuests = await this.getInactiveQuests();
    const newTileQuests = await this.generateTileQuests(10);

    const inactiveQuestIds = inactiveQuests.map((quest) => quest.id);

    console.log("Removing old quests", inactiveQuestIds);
    await client.execute({
      sql: `
        DELETE FROM quests WHERE quest_id IN (${inactiveQuestIds
          .map(() => "?")
          .join(", ")})
      `,
      args: inactiveQuestIds,
    });

    console.log("Adding new quests", newTileQuests.length);

    for (const newTileQuest of newTileQuests) {
      await client.execute({
        sql: `
          INSERT INTO quests 
          (quest_id, version, startX, startY, endX, endY, starts_at, ends_at, data) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (quest_id) DO UPDATE SET
            starts_at = excluded.starts_at,
            ends_at = excluded.ends_at,
            data = excluded.data;
        `,
        args: [
          newTileQuest.id,
          QuestManager.VERSION,
          newTileQuest.giver.x,
          newTileQuest.giver.y,
          newTileQuest.completion.x,
          newTileQuest.completion.x,
          newTileQuest.starts_at,
          newTileQuest.ends_at,
          JSON.stringify(newTileQuest),
        ],
      });
    }
  }

  async getActiveQuests() {
    const activeQuestsTimeout = Date.now();
    const { rows } = await client.execute({
      sql: `
        SELECT * FROM quests WHERE ends_at > ?
      `,
      args: [activeQuestsTimeout],
    });

    return rows.map((row) => JSON.parse(row["data"] as string) as TileQuest);
  }

  private async getInactiveQuests() {
    const inactiveQuestTmeout = Date.now() - 1000 * 60 * 60;

    console.log("Removing inactive quests", inactiveQuestTmeout);
    const { rows } = await client.execute({
      sql: `
        SELECT * FROM quests WHERE ends_at < ?
      `,
      args: [inactiveQuestTmeout],
    });

    return rows.map((row) => JSON.parse(row["data"] as string) as TileQuest);
  }

  private async getRandomQuests(amount: number): Promise<Quest[]> {
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

  private async generateTileQuests(max: number): Promise<TileQuest[]> {
    console.log("Generating tile quests");
    const quests = await this.getRandomQuests(max);

    const tileQuests: TileQuest[] = [];
    const starts_at = startOfHour(new Date());
    const ends_at = addHours(starts_at, 2);

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
