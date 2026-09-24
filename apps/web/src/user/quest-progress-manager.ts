import type { Database } from "better-sqlite3";
import { reader } from "../db/reader.js";
import { buildTile, isOutOfBounds, type WorldTile } from "../world/index.js";
import {
  storyQuests,
  type PlacedObjective,
  type PlacedQuest,
} from "../world/quests.js";
import { getItemName } from "./items.js";
import { questsVersion } from "../game/versions.js";
import type { RequirementReward, TalkObjective } from "../config/types.js";
import type { Point } from "../world/index.js";

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
  availableQuests: PlacedQuest[];
  inProgressQuests: PlacedQuest[];
  completableQuests: PlacedQuest[];
  elsewhereQuests: PlacedQuest[];
  discoverableQuests: PlacedQuest[];
}

/** A contract posted on the board here, and where the player is with it. */
export type BoardContract = {
  quest: PlacedQuest;
  status: "available" | "taken" | "done";
};

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
  objective: TalkObjective & Point;
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

/**
 * Whether the player has completed everything the quest needs first, and
 * hasn't taken or completed a quest that rules it out.
 */
const isUnlocked = (quest: PlacedQuest, state: UserQuestState) =>
  (quest.prerequisites ?? []).every(
    (id) => state.quests.get(id)?.status === "completed"
  ) && !(quest.excludes ?? []).some((id) => state.quests.has(id));

type CellContents = Pick<NonNullable<WorldTile["tile"]>, "resources" | "monsters" | "region">;

const inRegion = (objective: PlacedObjective, cell: CellContents) =>
  !("region" in objective) ||
  !objective.region ||
  cell.region?.id === objective.region;

/** Whether the objective can be worked on at this cell. */
const objectiveAt = (
  objective: PlacedObjective,
  cell: CellContents,
  x: number,
  y: number
) => {
  switch (objective.type) {
    case "gather":
    case "craft":
      return (
        cell.resources.some((r) => r.id === objective.resource_id) &&
        inRegion(objective, cell)
      );
    case "collect":
      return cell.resources.some((r) =>
        r.reward_items.some((i) => i.item.id === objective.item_id)
      );
    case "kill":
      return cell.monsters.includes(objective.monster_id) && inRegion(objective, cell);
    case "talk":
    case "explore":
      return objective.x === x && objective.y === y;
  }
};

export const selectZoneQuests = (
  quests: PlacedQuest[],
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

    if (!userQuestProgress) {
      if (!isUnlocked(quest, state)) {
        continue;
      }

      if (quest.giver.x === x && quest.giver.y === y) {
        result.availableQuests.push(quest);
      } else {
        result.discoverableQuests.push(quest);
      }

      continue;
    }

    if (userQuestProgress.status === "completed") {
      continue;
    }

    if (userQuestProgress.status === "in_progress") {
      const currentObjective = findCurrentObjective(quest, state.objectives);

      if (currentObjective) {
        if (objectiveAt(currentObjective, tile, x, y)) {
          result.inProgressQuests.push({ ...quest, currentObjective });
        } else {
          result.elsewhereQuests.push({ ...quest, currentObjective });
        }
      }
    }

    if (userQuestProgress.status === "completable") {
      const placedQuest = withObjectiveProgress(quest, state.objectives);

      if (quest.completion.x === x && quest.completion.y === y) {
        result.completableQuests.push(placedQuest);
      } else {
        result.elsewhereQuests.push(placedQuest);
      }
    }
  }

  return result;
};

/** The contracts posted at this cell's board, whatever the player has done with them. */
export const selectBoardContracts = (
  quests: PlacedQuest[],
  state: UserQuestState,
  x: number,
  y: number
): BoardContract[] =>
  quests.flatMap((quest): BoardContract[] => {
    if (quest.kind !== "contract" || quest.giver.x !== x || quest.giver.y !== y) {
      return [];
    }

    const progress = progressForCurrentRun(quest, state.quests.get(quest.id));

    if (!progress) {
      return isUnlocked(quest, state) ? [{ quest, status: "available" }] : [];
    }

    return [{ quest, status: progress.status === "completed" ? "done" : "taken" }];
  });

export const selectMapIndicators = (
  quests: PlacedQuest[],
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

    if (!userQuestProgress) {
      if (isUnlocked(quest, state) && inRange(quest.giver.x, quest.giver.y)) {
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

    if (userQuestProgress.status === "in_progress") {
      const currentObjective = findCurrentObjective(quest, state.objectives);

      if (currentObjective) {
        for (const tile of worldMap) {
          if (tile.tile && objectiveAt(currentObjective, tile.tile, tile.x, tile.y)) {
            addObjective(tile.x, tile.y);
          }
        }
      }
    }

    if (
      userQuestProgress.status === "completable" &&
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
  quests: PlacedQuest[],
  state: UserQuestState
): PlacedQuest[] => {
  const result: PlacedQuest[] = [];

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
  quests: PlacedQuest[],
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
  quest: PlacedQuest,
  objectives: Map<string, ObjectiveProgress>
): PlacedQuest => ({
  ...quest,
  objectives: quest.objectives.map<PlacedObjective>((o) => {
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
  objective: PlacedObjective
): PlacedObjective["progress"] => {
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

// Contracts can be redone in each rotation that posts them, so a completion
// from an earlier rotation doesn't count against this one. In-progress runs
// carry over. Story quests are done once.
const progressForCurrentRun = (
  quest: PlacedQuest,
  progress: QuestProgress | undefined
): QuestProgress | undefined => {
  if (
    progress?.status === "completed" &&
    quest.kind === "contract" &&
    (progress.completed_at ?? 0) < quest.starts_at
  ) {
    return undefined;
  }

  return progress;
};

const findCurrentObjective = (
  quest: PlacedQuest,
  objectives: Map<string, ObjectiveProgress>
): PlacedObjective | null => {
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
    quests: PlacedQuest[];
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
    this.selectActiveQuests = db.prepare<[number, number], { data: string }>(
      "SELECT data FROM contracts WHERE starts_at <= ? AND ends_at > ?"
    );
  }

  /**
   * Every story quest and the contracts posted at `now`, parsed once and
   * shared until a rotation bumps the quests version or a contract ends.
   * Don't mutate the result.
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

    const contracts = this.selectActiveQuests
      .all(now, now)
      .map((row) => JSON.parse(row.data) as PlacedQuest);
    const quests = [...storyQuests, ...contracts];

    this.activeQuests = {
      version: questsVersion(),
      fetchedAt: now,
      validUntil: Math.min(
        now + ACTIVE_QUESTS_MAX_AGE,
        ...contracts.map((q) => q.ends_at)
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

  getBoardContractsForUser(userId: string, x: number, y: number, now = Date.now()) {
    return selectBoardContracts(
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

export const getDefaultRequiredAmount = (objective: PlacedObjective): number => {
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
