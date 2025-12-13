import { tutorialQuests } from "../config/quests.js";
import { client } from "../database.js";
import { getTile, type WorldTile } from "../world/index.js";
import { addToInventory } from "./inventory.js";
import { getItemName } from "./items.js";
import type {
  Quest,
  TileObjective,
  TileQuest,
  TileTalkObjective,
} from "./quest.js";
import { questManager, type QuestManager } from "./quest-generator.js";
import { addSystemMessage } from "./system.js";
import { PubSub, USER_EVENT } from "../sse/pubsub.js";

export interface ZoneQuests {
  availableQuests: TileQuest[];
  inProgressQuests: TileQuest[];
  completableQuests: TileQuest[];
  elsewhereQuests: TileQuest[];
}

interface QuestProgress {
  user_id: string;
  quest_id: string;
  status: "available" | "in_progress" | "completable" | "completed";
  started_at: number;
  completed_at: number | null;
}

export type QuestStatus = {
  status: "available" | "in_progress" | "completable" | "completed";
  started_at: number;
  completed_at: number | null;
};

// Whether there is a quest to pick up
// Whether there is a quest to complete
// Whether there is a objective to complete
export type MapIndicator = {
  x: number;
  y: number;
  available: boolean;
  completable: boolean;
  objective: boolean;
};

export type ZoneInteraction = {
  x: number;
  y: number;
  quest_id: string;
  objective: TileTalkObjective;
};

interface ObjectiveProgress {
  user_id: string;
  quest_id: string;
  objective_id: string;
  // I considered putting the type and resource_id here for quick progress allocations
  // But decided against it because of the complexity around which task is the current task
  current: number;
  required: number;
  completed: boolean;
  updated_at: number | null;
  completed_at: number | null;
}

export class QuestProgressManager {
  static migrations() {
    // Create tables if they don't exist
    return [
      `
      CREATE TABLE IF NOT EXISTS quest_progress (
        user_id TEXT NOT NULL,
        quest_id TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER,
        completed_at INTEGER,
        PRIMARY KEY (user_id, quest_id)
        FOREIGN KEY (quest_id) 
          REFERENCES quests(quest_id)
          ON DELETE CASCADE
      );`,

      `CREATE TABLE IF NOT EXISTS objective_progress (
        user_id TEXT NOT NULL,
        quest_id TEXT NOT NULL,
        objective_id TEXT NOT NULL,
        current INTEGER NOT NULL DEFAULT 0,
        required INTEGER NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT 0,
        updated_at INTEGER,
        completed_at INTEGER,
        PRIMARY KEY (user_id, quest_id, objective_id),
        FOREIGN KEY (user_id, quest_id) 
          REFERENCES quest_progress(user_id, quest_id)
          ON DELETE CASCADE
      );`,

      `CREATE INDEX IF NOT EXISTS idx_quest_progress_user 
        ON quest_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_objective_progress_user 
        ON objective_progress(user_id);`,
    ];
  }

  async getZoneQuestsForUser(
    userId: string,
    x: number,
    y: number,
    questManager: QuestManager
  ): Promise<ZoneQuests> {
    const result: ZoneQuests = {
      availableQuests: [],
      inProgressQuests: [],
      completableQuests: [],
      elsewhereQuests: [],
    };

    const tile = await getTile(x, y);

    if (!tile) {
      return result;
    }

    // Get all quest progress for user
    const { rows: questProgressRows } = await client.execute({
      sql: `
      SELECT * FROM quest_progress WHERE user_id = ?
    `,
      args: [userId],
    });
    const questProgress = questProgressRows as unknown as QuestProgress[];

    const quests = await questManager.getActiveQuests();

    // Get all objective progress for user
    const { rows: objectiveProgressRows } = await client.execute({
      sql: `
      SELECT * FROM objective_progress WHERE user_id = ?
    `,
      args: [userId],
    });

    const objectiveProgress =
      objectiveProgressRows as unknown as ObjectiveProgress[];

    // Create a map for quick lookups
    const questProgressMap = new Map(
      questProgress.map((qp) => [qp.quest_id, qp])
    );
    const objectiveProgressMap = new Map(
      objectiveProgress.map((op) => [`${op.quest_id}-${op.objective_id}`, op])
    );

    for (const quest of quests) {
      const userQuestProgress = questProgressMap.get(quest.id);

      // Handle available tasks
      if (!userQuestProgress) {
        if (quest.giver.x === x && quest.giver.y === y) {
          result.availableQuests.push(quest);
        }

        continue;
      }

      // Skip completed quests
      if (userQuestProgress.status === "completed") {
        continue;
      }

      // Handle in-progress tasks
      if (userQuestProgress.status === "in_progress") {
        const currentObjective = this.findCurrentObjective(
          quest,
          objectiveProgressMap
        );

        if (currentObjective) {
          switch (currentObjective.type) {
            case "gather":
            case "craft":
              if (
                currentObjective.resource_id &&
                tile.resources.some(
                  (r) => r.id === currentObjective.resource_id
                )
              ) {
                result.inProgressQuests.push({ ...quest, currentObjective });
                continue;
              }
              break;
            case "talk":
            case "explore":
              if (currentObjective.x === x && currentObjective.y === y) {
                result.inProgressQuests.push({ ...quest, currentObjective });
                continue;
              }
              break;
          }

          result.elsewhereQuests.push({ ...quest, currentObjective });
        }
      }

      // Handle completable tasks
      if (userQuestProgress?.status === "completable") {
        const tileQuest = {
          ...quest,
          objectives: quest.objectives.map<TileObjective>((o) => {
            const progress = objectiveProgressMap.get(`${quest.id}-${o.id}`);

            if (!progress) {
              return o;
            }

            return {
              ...o,
              progress: this.mapProgress(progress, o),
            };
          }),
        };

        if (quest.completion.x === x && quest.completion.y === y) {
          result.completableQuests.push(tileQuest);
        } else {
          result.elsewhereQuests.push(tileQuest);
        }
      }
    }

    return result;
  }

  async getMapIndicatorsForUser(
    userId: string,
    worldMap: WorldTile[]
  ): Promise<MapIndicator[]> {
    // Get all quest progress for user
    const { rows: questProgressRows } = await client.execute({
      sql: `
      SELECT * FROM quest_progress WHERE user_id = ?
    `,
      args: [userId],
    });
    const questProgress = questProgressRows as unknown as QuestProgress[];

    const quests = await questManager.getActiveQuests();

    // Get all objective progress for user
    const { rows: objectiveProgressRows } = await client.execute({
      sql: `
      SELECT * FROM objective_progress WHERE user_id = ?
    `,
      args: [userId],
    });

    const objectiveProgress =
      objectiveProgressRows as unknown as ObjectiveProgress[];

    // Create a map for quick lookups
    const questProgressMap = new Map(
      questProgress.map((qp) => [qp.quest_id, qp])
    );
    const objectiveProgressMap = new Map(
      objectiveProgress.map((op) => [`${op.quest_id}-${op.objective_id}`, op])
    );

    /**
     *  x: number;
        y: number;
        available: boolean;
        completable: boolean;
        objective: boolean;
     */

    const result = new Map<string, MapIndicator>();

    const fromX = worldMap[0].x;
    const toX = worldMap[worldMap.length - 1].x;
    const fromY = worldMap[0].y;
    const toY = worldMap[worldMap.length - 1].y;

    const inRange = (x: number, y: number) => {
      return x >= fromX && x <= toX && y >= fromY && y <= toY;
    };

    const addToMap = (x: number, y: number, indicator: MapIndicator) => {
      const key = `${x}-${y}`;
      const existing = result.get(key);
      if (existing) {
        existing.available = existing.available || indicator.available;
        existing.completable = existing.completable || indicator.completable;
        existing.objective = existing.objective || indicator.objective;
      } else {
        result.set(key, indicator);
      }
    };

    for (const quest of quests) {
      const userQuestProgress = questProgressMap.get(quest.id);

      // Handle available tasks
      if (!userQuestProgress) {
        if (inRange(quest.giver.x, quest.giver.y)) {
          addToMap(quest.giver.x, quest.giver.y, {
            x: quest.giver.x,
            y: quest.giver.y,
            available: true,
            completable: false,
            objective: false,
          });
        }

        continue;
      }

      // Skip completed quests
      if (userQuestProgress.status === "completed") {
        continue;
      }

      // Handle in-progress tasks
      if (userQuestProgress.status === "in_progress") {
        const currentObjective = this.findCurrentObjective(
          quest,
          objectiveProgressMap
        );

        if (currentObjective) {
          switch (currentObjective.type) {
            case "gather":
            case "craft":
              if (currentObjective.resource_id) {
                for (const tile of worldMap) {
                  if (
                    tile.tile?.resources.some(
                      (r) => r.id === currentObjective.resource_id
                    )
                  ) {
                    addToMap(tile.x, tile.y, {
                      x: tile.x,
                      y: tile.y,
                      available: false,
                      completable: false,
                      objective: true,
                    });
                  }
                }
              }
              break;
            case "talk":
            case "explore":
              for (const tile of worldMap) {
                if (
                  tile.x === currentObjective.x &&
                  tile.y === currentObjective.y
                ) {
                  addToMap(tile.x, tile.y, {
                    x: tile.x,
                    y: tile.y,
                    available: false,
                    completable: false,
                    objective: true,
                  });
                }
              }
              break;
          }
        }
      }

      // Handle completable tasks
      if (
        userQuestProgress?.status === "completable" &&
        inRange(quest.completion.x, quest.completion.y)
      ) {
        addToMap(quest.completion.x, quest.completion.y, {
          x: quest.completion.x,
          y: quest.completion.y,
          available: false,
          completable: true,
          objective: false,
        });
      }
    }

    return [...result.values()];
  }

  async getZoneNPCInteractionsForUser(
    userId: string,
    x: number,
    y: number
  ): Promise<ZoneInteraction[]> {
    const inprogress = await this.getInProgressQuestsForUser(userId);
    const objectives: ZoneInteraction[] = [];

    for (const quest of inprogress) {
      if (
        quest.currentObjective &&
        quest.currentObjective.type === "talk" &&
        quest.currentObjective.x === x &&
        quest.currentObjective.y === y
      ) {
        objectives.push({
          x: quest.currentObjective.x,
          y: quest.currentObjective.y,
          quest_id: quest.id,
          objective: quest.currentObjective,
        });
      }
    }

    return objectives;
  }

  async getInProgressQuestsForUser(userId: string): Promise<TileQuest[]> {
    const { rows: questProgressRows } = await client.execute({
      sql: `
      SELECT * FROM quest_progress WHERE user_id = ? AND status = 'in_progress'
    `,
      args: [userId],
    });
    const { rows: objectiveProgressRows } = await client.execute({
      sql: `
      SELECT * FROM objective_progress WHERE user_id = ?
    `,
      args: [userId],
    });

    const questsProgress = questProgressRows as unknown as QuestProgress[];
    const objectivesProgress =
      objectiveProgressRows as unknown as ObjectiveProgress[];

    const objectiveProgressMap = new Map(
      objectivesProgress.map((op) => [`${op.quest_id}-${op.objective_id}`, op])
    );

    const quests = await questManager.getActiveQuests();

    const questMap = new Map(quests.map((q) => [q.id, q]));

    return questsProgress
      .map((questProgress) => {
        const quest = questMap.get(questProgress.quest_id);

        if (!quest) {
          return null;
        }

        const currentObjective = this.findCurrentObjective(
          quest,
          objectiveProgressMap
        );

        return {
          ...quest,
          currentObjective,
          objectives: quest.objectives.map<TileObjective>((o) => {
            const progress = objectiveProgressMap.get(
              `${questProgress.quest_id}-${o.id}`
            );

            if (!progress) {
              return o;
            }

            return {
              ...o,
              progress: this.mapProgress(progress, o),
            };
          }),
        };
      })
      .filter((q) => q !== null) as TileQuest[];
  }

  private mapProgress(
    progress: ObjectiveProgress | undefined,
    objective: TileObjective
  ): TileObjective["progress"] {
    if (!progress) {
      //TODO: Here and on quest start, we should probably check for current and required  being 0 and complete
      return {
        current: 0,
        required: this.getDefaultRequiredAmount(objective),
        completed: false,
        updated_at: null,
        completed_at: null,
      };
    }
    return {
      current: progress.current,
      required: progress.required,
      completed: progress.completed,
      updated_at: progress.updated_at,
      completed_at: progress.completed_at,
    };
  }

  private findCurrentObjective(
    quest: TileQuest,
    progressMap: Map<string, ObjectiveProgress>
  ): TileObjective | null {
    for (const objective of quest.objectives) {
      const progress = progressMap.get(`${quest.id}-${objective.id}`);
      if (!progress || !progress.completed) {
        return {
          ...objective,
          progress: this.mapProgress(progress, objective),
        };
      }
    }
    return null;
  }

  async getQuestStatus(
    userId: string,
    questId: string
  ): Promise<QuestStatus | null> {
    const { rows: questProgressRows } = await client.execute({
      sql: `
      SELECT * FROM quest_progress WHERE user_id = ? AND quest_id = ?
    `,
      args: [userId, questId],
    });

    if (!questProgressRows.length) {
      return null;
    }

    const [questProgress] = questProgressRows as unknown as QuestProgress[];

    return {
      status: questProgress.status,
      started_at: questProgress.started_at,
      completed_at: questProgress.completed_at,
    };
  }

  async startQuest(userId: string, quest: TileQuest): Promise<void> {
    await client.execute({
      sql: `
      INSERT INTO quest_progress (
        user_id, quest_id, status, started_at, completed_at
      ) VALUES (?, ?, 'in_progress', ?, NULL)
    `,
      args: [userId, quest.id, Date.now()],
    });

    // Initialize objective progress
    for (const objective of quest.objectives) {
      const required = this.getDefaultRequiredAmount(objective);

      await client.execute({
        sql: `
        INSERT INTO objective_progress (
          user_id, quest_id, objective_id, current, required, completed, updated_at, completed_at
        ) VALUES (?, ?, ?, 0, ?, 0, ?, NULL)
      `,
        args: [userId, quest.id, objective.id, required, Date.now()],
      });
    }

    PubSub.publish(USER_EVENT, {
      user_id: userId,
    });
  }

  async completeQuest(
    userId: string,
    questId: string,
    questManager: QuestManager
  ): Promise<void> {
    let quest: Quest | TileQuest | undefined | null =
      await questManager.getQuestTemplate(questId);

    if (!quest) {
      // Is it a tutorial?
      quest = tutorialQuests.find((q) => q.id === questId);

      if (!quest) {
        await addSystemMessage(userId, "Quest not found", "error");
        return;
      }
    }

    await client.execute({
      sql: `
      UPDATE quest_progress 
      SET 
        status = 'completed',
        completed_at = :completed_at
      WHERE user_id = :user_id AND quest_id = :quest_id
    `,
      args: {
        completed_at: Date.now(),
        user_id: userId,
        quest_id: questId,
      },
    });

    for (const reward of quest.rewards) {
      if (reward.type === "item") {
        await addToInventory(userId, {
          qty: reward.amount,
          item_id: reward.item_id,
        });
      }
    }

    await addSystemMessage(
      userId,
      `Quest completed - You have gained ${quest.rewards
        .map(
          (r) =>
            `${r.amount} x ${
              r.type === "item" ? getItemName(r.item_id) : r.type
            }`
        )
        .join(", ")}`,
      "success"
    );

    PubSub.publish(USER_EVENT, {
      user_id: userId,
    });
  }

  private getDefaultRequiredAmount(objective: TileObjective): number {
    switch (objective.type) {
      case "gather":
      case "collect":
      case "craft":
        return objective.amount;
      case "talk":
        return objective.dialog_steps.length + 1; // 0 is not started, 1-length are steps - User needs to complete all dialog steps
      case "explore":
        return 1;
      default:
        return 0;
    }
  }

  async cancelQuest(userId: string, questId: string): Promise<void> {
    await client.execute({
      sql: `
      DELETE FROM quest_progress 
      WHERE user_id = :user_id AND quest_id = :quest_id
    `,
      args: {
        user_id: userId,
        quest_id: questId,
      },
    });
  }

  async updateObjectiveProgress(
    userId: string,
    questId: string,
    objectiveId: string,
    current: number
  ): Promise<void> {
    //TODO: Chat that that current required check works on the new current value not the old one, might need to replace
    //current with the value of the new current
    await client.execute({
      sql: `
      UPDATE objective_progress 
      SET 
        current = :current,
        completed = CASE WHEN :current >= required THEN 1 ELSE 0 END,
        updated_at = :updated_at,
        completed_at = CASE WHEN :current >= required THEN :completed_at ELSE NULL END
      WHERE user_id = :user_id AND quest_id = :quest_id AND objective_id = :objective_id
    `,
      args: {
        current,
        updated_at: Date.now(),
        completed_at: Date.now(),
        user_id: userId,
        quest_id: questId,
        objective_id: objectiveId,
      },
    });

    // Check if all objectives are complete
    const { rows: allCompleteRows } = await client.execute({
      sql: `
      SELECT COUNT(*) as total, 
             SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
      FROM objective_progress
      WHERE user_id = ? AND quest_id = ?
    `,
      args: [userId, questId],
    });

    const allComplete = allCompleteRows[0] as unknown as {
      total: number;
      completed: number;
    };

    if (allComplete.total === allComplete.completed) {
      await client.execute({
        sql: `
        UPDATE quest_progress
        SET status = 'completable'
        WHERE user_id = ? AND quest_id = ?
      `,
        args: [userId, questId],
      });
    }

    PubSub.publish(USER_EVENT, {
      user_id: userId,
    });
  }

  async getQuestProgress(
    userId: string,
    questId: string
  ): Promise<{
    quest: QuestProgress;
    objectives: ObjectiveProgress[];
  } | null> {
    const { rows: questRows } = await client.execute({
      sql: `
      SELECT * FROM quest_progress 
      WHERE user_id = ? AND quest_id = ?
    `,
      args: [userId, questId],
    });

    const quest = questRows[0] as unknown as QuestProgress;

    if (!quest) return null;

    const { rows: objectivesRows } = await client.execute({
      sql: `
      SELECT * FROM objective_progress 
      WHERE user_id = ? AND quest_id = ?
    `,
      args: [userId, questId],
    });

    const objectives = objectivesRows as unknown as ObjectiveProgress[];

    return { quest, objectives };
  }
}

export const questProgressManager = new QuestProgressManager();
