import type { Database } from "better-sqlite3";
import { reader } from "../db/reader.js";
import { buildTile, isOutOfBounds, type WorldTile } from "../world/index.js";
import { getItemName } from "./items.js";
import { questsVersion } from "../game/versions.js";
import type {
  RequirementReward,
  TileObjective,
  TileQuest,
  TileTalkObjective,
} from "../config/types.js";

export const getRewardDisplayName = (reward: RequirementReward): string => {
  switch (reward.type) {
    case "item":
      return getItemName(reward.item_id);
    case "gold":
      return "Gold";
    case "skill":
      return reward.skill_id;
  }
};

export interface ZoneQuests {
  availableQuests: TileQuest[];
  inProgressQuests: TileQuest[];
  completableQuests: TileQuest[];
  elsewhereQuests: TileQuest[];
  discoverableQuests: TileQuest[];
}

export interface QuestProgress {
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

export interface ObjectiveProgress {
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

/** A user's quest and objective progress rows, loaded once per read. */
export type UserQuestState = {
  quests: Map<string, QuestProgress>;
  /** Keyed by `objectiveKey`. */
  objectives: Map<string, ObjectiveProgress>;
};

const objectiveKey = (questId: string, objectiveId: string) =>
  `${questId}-${objectiveId}`;

// Pure selectors: active quests plus a user's progress in, view data out.

export const selectZoneQuests = (
  quests: TileQuest[],
  state: UserQuestState,
  x: number,
  y: number
): ZoneQuests => {
  const result: ZoneQuests = {
    availableQuests: [],
    inProgressQuests: [],
    completableQuests: [],
    elsewhereQuests: [],
    discoverableQuests: [],
  };

  if (isOutOfBounds(x, y)) {
    return result;
  }

  const tile = buildTile(x, y);

  for (const quest of quests) {
    const userQuestProgress = progressForCurrentRun(
      quest,
      state.quests.get(quest.id)
    );

    // Handle available tasks
    if (!userQuestProgress) {
      if (quest.giver.x === x && quest.giver.y === y) {
        result.availableQuests.push(quest);
      } else {
        result.discoverableQuests.push(quest);
      }

      continue;
    }

    // Skip completed quests
    if (userQuestProgress.status === "completed") {
      continue;
    }

    // Handle in-progress tasks
    if (userQuestProgress.status === "in_progress") {
      const currentObjective = findCurrentObjective(quest, state.objectives);

      if (currentObjective) {
        switch (currentObjective.type) {
          case "gather":
          case "craft":
            if (
              currentObjective.resource_id &&
              tile.resources.some((r) => r.id === currentObjective.resource_id)
            ) {
              result.inProgressQuests.push({ ...quest, currentObjective });
              continue;
            }
            break;
          case "collect":
            if (
              currentObjective.item_id &&
              tile.resources.some((r) =>
                r.reward_items.some(
                  (i) => i.item.id === currentObjective.item_id
                )
              )
            ) {
              result.inProgressQuests.push({ ...quest, currentObjective });
              continue;
            }
            break;
          case "kill":
            if (tile.monsters?.includes(currentObjective.monster_id)) {
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
      const tileQuest = withObjectiveProgress(quest, state.objectives);

      if (quest.completion.x === x && quest.completion.y === y) {
        result.completableQuests.push(tileQuest);
      } else {
        result.elsewhereQuests.push(tileQuest);
      }
    }
  }

  return result;
};

export const selectMapIndicators = (
  quests: TileQuest[],
  state: UserQuestState,
  worldMap: WorldTile[]
): MapIndicator[] => {
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

  const addObjective = (x: number, y: number) =>
    addToMap(x, y, {
      x,
      y,
      available: false,
      completable: false,
      objective: true,
    });

  for (const quest of quests) {
    const userQuestProgress = progressForCurrentRun(
      quest,
      state.quests.get(quest.id)
    );

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
      const currentObjective = findCurrentObjective(quest, state.objectives);

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
                  addObjective(tile.x, tile.y);
                }
              }
            }
            break;
          case "collect":
            if (currentObjective.item_id) {
              for (const tile of worldMap) {
                if (
                  tile.tile?.resources.some((r) =>
                    r.reward_items.some(
                      (i) => i.item.id === currentObjective.item_id
                    )
                  )
                ) {
                  addObjective(tile.x, tile.y);
                }
              }
            }
            break;
          case "kill":
            for (const tile of worldMap) {
              if (tile.tile?.monsters?.includes(currentObjective.monster_id)) {
                addObjective(tile.x, tile.y);
              }
            }
            break;
          case "talk":
          case "explore":
            if (inRange(currentObjective.x, currentObjective.y)) {
              addObjective(currentObjective.x, currentObjective.y);
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
};

export const selectInProgressQuests = (
  quests: TileQuest[],
  state: UserQuestState
): TileQuest[] => {
  const result: TileQuest[] = [];

  for (const quest of quests) {
    if (state.quests.get(quest.id)?.status !== "in_progress") {
      continue;
    }

    result.push({
      ...withObjectiveProgress(quest, state.objectives),
      currentObjective: findCurrentObjective(quest, state.objectives) ?? undefined,
    });
  }

  return result;
};

export const selectZoneNPCInteractions = (
  quests: TileQuest[],
  state: UserQuestState,
  x: number,
  y: number
): ZoneInteraction[] => {
  const objectives: ZoneInteraction[] = [];

  for (const quest of selectInProgressQuests(quests, state)) {
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
};

const withObjectiveProgress = (
  quest: TileQuest,
  objectives: Map<string, ObjectiveProgress>
): TileQuest => ({
  ...quest,
  objectives: quest.objectives.map<TileObjective>((o) => {
    const progress = objectives.get(objectiveKey(quest.id, o.id));

    if (!progress) {
      return o;
    }

    return {
      ...o,
      progress: mapProgress(progress, o),
    };
  }),
});

const mapProgress = (
  progress: ObjectiveProgress | undefined,
  objective: TileObjective
): TileObjective["progress"] => {
  if (!progress) {
    //TODO: Here and on quest start, we should probably check for current and required  being 0 and complete
    return {
      current: 0,
      required: getDefaultRequiredAmount(objective),
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
};

// Non-tutorial quests can be redone each time they rotate back in, so a
// completion from an earlier appearance doesn't count against this one.
// In-progress runs carry over and continue until the new ends_at.
const progressForCurrentRun = (
  quest: TileQuest,
  progress: QuestProgress | undefined
): QuestProgress | undefined => {
  if (
    progress?.status === "completed" &&
    !quest.is_tutorial &&
    (progress.completed_at ?? 0) < quest.starts_at
  ) {
    return undefined;
  }

  return progress;
};

const findCurrentObjective = (
  quest: TileQuest,
  objectives: Map<string, ObjectiveProgress>
): TileObjective | null => {
  for (const objective of quest.objectives) {
    const progress = objectives.get(objectiveKey(quest.id, objective.id));
    if (!progress || !progress.completed) {
      return {
        ...objective,
        progress: mapProgress(progress, objective),
      };
    }
  }
  return null;
};

/** Re-read active quests at least this often, to pick up `pnpm cron`. */
const ACTIVE_QUESTS_MAX_AGE = 60_000;

/**
 * Quest reads, bound to a connection: the reader for renders, the writer's
 * own instance for command handlers (which must see their tick's writes).
 */
export class QuestQueries {
  private selectUserQuests;
  private selectUserObjectives;
  private selectQuest;
  private selectQuestObjectives;
  private selectActiveQuests;

  private activeQuests: {
    version: number;
    fetchedAt: number;
    validUntil: number;
    quests: TileQuest[];
  } | null = null;

  constructor(db: Database) {
    this.selectUserQuests = db.prepare<[string], QuestProgress>(
      "SELECT * FROM quest_progress WHERE user_id = ?"
    );
    this.selectUserObjectives = db.prepare<[string], ObjectiveProgress>(
      "SELECT * FROM objective_progress WHERE user_id = ?"
    );
    this.selectQuest = db.prepare<[string, string], QuestProgress>(
      "SELECT * FROM quest_progress WHERE user_id = ? AND quest_id = ?"
    );
    this.selectQuestObjectives = db.prepare<[string, string], ObjectiveProgress>(
      "SELECT * FROM objective_progress WHERE user_id = ? AND quest_id = ?"
    );
    this.selectActiveQuests = db.prepare<[number], { data: string }>(
      "SELECT data FROM quests WHERE ends_at > ?"
    );
  }

  /**
   * The quests active at `now`, parsed once and shared until a rotation
   * bumps the quests version or one of them ends. Don't mutate the result.
   */
  getActiveQuests(now = Date.now()) {
    const cached = this.activeQuests;

    if (
      cached &&
      cached.version === questsVersion() &&
      now >= cached.fetchedAt &&
      now < cached.validUntil
    ) {
      return cached.quests;
    }

    const quests = this.selectActiveQuests
      .all(now)
      .map((row) => JSON.parse(row.data) as TileQuest);

    this.activeQuests = {
      version: questsVersion(),
      fetchedAt: now,
      validUntil: Math.min(
        now + ACTIVE_QUESTS_MAX_AGE,
        ...quests.map((q) => q.ends_at)
      ),
      quests,
    };

    return quests;
  }

  getUserQuestState(userId: string): UserQuestState {
    return {
      quests: new Map(
        this.selectUserQuests.all(userId).map((qp) => [qp.quest_id, qp])
      ),
      objectives: new Map(
        this.selectUserObjectives
          .all(userId)
          .map((op) => [objectiveKey(op.quest_id, op.objective_id), op])
      ),
    };
  }

  getZoneQuestsForUser(userId: string, x: number, y: number, now = Date.now()) {
    return selectZoneQuests(
      this.getActiveQuests(now),
      this.getUserQuestState(userId),
      x,
      y
    );
  }

  getZoneNPCInteractionsForUser(
    userId: string,
    x: number,
    y: number,
    now = Date.now()
  ) {
    return selectZoneNPCInteractions(
      this.getActiveQuests(now),
      this.getUserQuestState(userId),
      x,
      y
    );
  }

  getQuestStatus(userId: string, questId: string): QuestStatus | null {
    const questProgress = this.selectQuest.get(userId, questId);

    if (!questProgress) {
      return null;
    }

    return {
      status: questProgress.status,
      started_at: questProgress.started_at,
      completed_at: questProgress.completed_at,
    };
  }

  getQuestProgress(
    userId: string,
    questId: string
  ): {
    quest: QuestProgress;
    objectives: ObjectiveProgress[];
  } | null {
    const quest = this.selectQuest.get(userId, questId);

    if (!quest) return null;

    const objectives = this.selectQuestObjectives.all(userId, questId);

    return { quest, objectives };
  }
}

export const getDefaultRequiredAmount = (objective: TileObjective): number => {
  switch (objective.type) {
    case "gather":
    case "collect":
    case "craft":
      return objective.amount;
    case "kill":
      return objective.count;
    case "talk":
      return objective.dialog_steps.length + 1; // 0 is not started, 1-length are steps - User needs to complete all dialog steps
    case "explore":
      return 1;
    default:
      return 0;
  }
};

export const questProgressManager = new QuestQueries(reader);
