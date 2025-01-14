import { addHours, startOfHour } from "date-fns";
import { schemas, type Quest, type TileQuest } from "./quest";
import { client } from "../database";
import { generateQuestTemplates } from "../ai/quests";
import { MAP_HEIGHT, MAP_WIDTH, type Tile } from "../config";
import { getTileSelection } from "../world";
import { randomIndex } from "../lib/random";
import { tutorialQuests } from "../config/quests";

export class QuestManager {
  static VERSION = 1;
  static migrations() {
    // Create tables if they don't exist
    return [
      `
      CREATE TABLE IF NOT EXISTS quests_templates (
        quest_id TEXT NOT NULL,
        version INT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (quest_id)
      );`,
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

  static async addNewTemplates() {
    const templates = await generateQuestTemplates();

    if (!templates) {
      return;
    }

    for (const template of templates) {
      let id = template.id;
      const { rows } = await client.execute({
        sql: `
          SELECT * FROM quests_templates WHERE quest_id = ?
        `,
        args: [id],
      });

      if (rows.length) {
        id = `${id}-$v${Date.now()}`;
      }

      console.log("Adding new template", id, template.name);

      await client.execute({
        sql: `
        INSERT INTO quests_templates (quest_id, version, data) VALUES (?, ?, ?) ON CONFLICT (quest_id) DO NOTHING;
      `,
        args: [
          template.id,
          QuestManager.VERSION,
          JSON.stringify({ ...template, id }),
        ],
      });
    }
  }

  async getQuestTemplate(questId: string) {
    const { rows } = await client.execute({
      sql: `
        SELECT * FROM quests_templates WHERE quest_id = ?
      `,
      args: [questId],
    });

    if (!rows.length) {
      return null;
    }
    return JSON.parse(rows[0]["data"] as string) as Quest;
  }

  async rotateActiveQuests() {
    const inactiveQuests = await this.getInactiveQuests();
    const newTileQuests = await this.generateTileQuests(10);

    const inactiveQuestIds = inactiveQuests.map((quest) => quest.id);

    await client.execute({
      sql: `
        DELETE FROM quests WHERE quest_id IN (${inactiveQuestIds
          .map(() => "?")
          .join(", ")})
      `,
      args: inactiveQuestIds,
    });

    for (const newTileQuest of newTileQuests) {
      await client.execute({
        sql: `
          INSERT INTO quests 
          (quest_id, version, startX, startY, endX, endY, starts_at, ends_at, data) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (quest_id) DO NOTHING;
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
    const { rows } = await client.execute({
      sql: `
        SELECT * FROM quests WHERE ends_at > ?
      `,
      args: [Date.now()],
    });

    return rows.map((row) => JSON.parse(row["data"] as string) as TileQuest);
  }

  private async getInactiveQuests() {
    const { rows } = await client.execute({
      sql: `
        SELECT * FROM quests WHERE ends_at < ?
      `,
      args: [Date.now() - 1000 * 60 * 60],
    });

    return rows.map((row) => JSON.parse(row["data"] as string) as TileQuest);
  }

  private async getRandomQuests(amount: number): Promise<Quest[]> {
    const { rows } = await client.execute({
      sql: `
        SELECT * FROM quests_templates ORDER BY RANDOM() LIMIT ?
      `,
      args: [amount],
    });

    return rows.map((row) => JSON.parse(row["data"] as string) as Quest);
  }

  private async generateTileQuests(max: number): Promise<TileQuest[]> {
    const quests = await this.getRandomQuests(max);

    const tileQuests: TileQuest[] = [];
    const starts_at = startOfHour(new Date());
    const ends_at = addHours(starts_at, 2);

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

      if (objectives.some((objective) => objective === null)) {
        console.warn("No tile found for quest objective, skipping", quest.id);
        continue;
      }

      const tileQuest = schemas.TileQuest.safeParse({
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
        objectives: objectives,
        starts_at: starts_at.getTime(),
        ends_at: ends_at.getTime(),
      });

      if (tileQuest.error) {
        console.error(tileQuest.error);
        continue;
      }

      tileQuests.push(tileQuest.data);
    }

    for (const tileQuest of tutorialQuests) {
      const clone = structuredClone(tileQuest);
      clone.starts_at = starts_at.getTime();
      clone.ends_at = ends_at.getTime();
      tileQuests.push(clone);
    }

    return tileQuests;
  }
}

export const questManager = new QuestManager();
