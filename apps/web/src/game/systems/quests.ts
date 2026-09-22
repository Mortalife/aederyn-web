import { quests, questsById } from "../../config/quests.js";
import type { Quest, TileQuest } from "../../config/types.js";
import { writer } from "../../db/writer.js";
import {
  getDefaultRequiredAmount,
  getRewardDisplayName,
  QuestQueries,
  selectInProgressQuests,
} from "../../user/quest-progress-manager.js";
import { userChanged } from "../changes.js";
import type { GameEvent } from "../events.js";
import { addSystemMessage } from "./system-messages.js";
import { addGold, addToInventory } from "./users.js";

/** Quest reads on the writer, so they see this tick's earlier writes. */
export const questQueries = new QuestQueries(writer);

const deleteQuestObjectives = writer.prepare<[string, string]>(
  "DELETE FROM objective_progress WHERE user_id = ? AND quest_id = ?"
);
const deleteQuest = writer.prepare<[string, string]>(
  "DELETE FROM quest_progress WHERE user_id = ? AND quest_id = ?"
);
const insertQuest = writer.prepare<[string, string, number]>(
  `INSERT INTO quest_progress (
    user_id, quest_id, status, started_at, completed_at
  ) VALUES (?, ?, 'in_progress', ?, NULL)`
);
const insertObjective = writer.prepare<
  [string, string, string, number, number]
>(
  `INSERT INTO objective_progress (
    user_id, quest_id, objective_id, current, required, completed, updated_at, completed_at
  ) VALUES (?, ?, ?, 0, ?, 0, ?, NULL)`
);
const completeQuestProgress = writer.prepare<{
  completed_at: number;
  user_id: string;
  quest_id: string;
}>(
  `UPDATE quest_progress
  SET
    status = 'completed',
    completed_at = :completed_at
  WHERE user_id = :user_id AND quest_id = :quest_id`
);
const selectObjectiveState = writer.prepare<
  [string, string, string],
  { current: number; required: number; completed: number }
>(
  "SELECT current, required, completed FROM objective_progress WHERE user_id = ? AND quest_id = ? AND objective_id = ?"
);
const updateObjective = writer.prepare<{
  current: number;
  completed: number;
  updated_at: number;
  completed_at: number | null;
  user_id: string;
  quest_id: string;
  objective_id: string;
}>(
  `UPDATE objective_progress
  SET
    current = :current,
    completed = :completed,
    updated_at = :updated_at,
    completed_at = :completed_at
  WHERE user_id = :user_id AND quest_id = :quest_id AND objective_id = :objective_id`
);
const countCompletedObjectives = writer.prepare<
  [string, string],
  { total: number; completed: number }
>(
  `SELECT COUNT(*) as total,
         SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
  FROM objective_progress
  WHERE user_id = ? AND quest_id = ?`
);
const markQuestCompletable = writer.prepare<[string, string]>(
  `UPDATE quest_progress
  SET status = 'completable'
  WHERE user_id = ? AND quest_id = ?`
);

export const startQuest = (userId: string, quest: TileQuest, now: number) => {
  // Clear any completed run from a previous appearance of this quest
  deleteQuestObjectives.run(userId, quest.id);
  deleteQuest.run(userId, quest.id);

  insertQuest.run(userId, quest.id, now);

  // Initialize objective progress
  for (const objective of quest.objectives) {
    const required = getDefaultRequiredAmount(objective);
    insertObjective.run(userId, quest.id, objective.id, required, now);
  }

  userChanged(userId);
};

export const completeQuest = (userId: string, questId: string, now: number) => {
  // Tutorials aren't in questsById
  const quest: Quest | undefined =
    questsById.get(questId) ?? quests.find((q) => q.id === questId);

  if (!quest) {
    addSystemMessage(userId, "Quest not found", "error", now, {
      action_type: "quest",
      action_id: questId,
    });
    return;
  }

  completeQuestProgress.run({
    completed_at: now,
    user_id: userId,
    quest_id: questId,
  });

  for (const reward of quest.rewards) {
    if (reward.type === "item") {
      addToInventory(
        userId,
        { qty: reward.amount, item_id: reward.item_id },
        now
      );
    } else if (reward.type === "gold") {
      addGold(userId, reward.amount);
    }
  }

  addSystemMessage(
    userId,
    `Quest completed - You have gained ${quest.rewards
      .map((r) => `${r.amount} x ${getRewardDisplayName(r)}`)
      .join(", ")}`,
    "success",
    now,
    { action_type: "quest", action_id: questId }
  );
};

export const cancelQuest = (userId: string, questId: string) => {
  deleteQuest.run(userId, questId);
  userChanged(userId);
};

export const updateObjectiveProgress = (
  userId: string,
  questId: string,
  objectiveId: string,
  current: number,
  now: number
) => {
  // Get current objective state to determine completion
  const beforeState = selectObjectiveState.get(userId, questId, objectiveId);

  if (!beforeState) {
    return;
  }

  const wasCompleted = beforeState.completed === 1;
  const isNowCompleted = current >= beforeState.required;

  updateObjective.run({
    current,
    completed: isNowCompleted ? 1 : 0,
    updated_at: now,
    completed_at: isNowCompleted ? now : null,
    user_id: userId,
    quest_id: questId,
    objective_id: objectiveId,
  });

  // Send system message when objective is newly completed
  if (isNowCompleted && !wasCompleted) {
    const quest = questQueries
      .getActiveQuests(now)
      .find((q) => q.id === questId);
    const objective = quest?.objectives.find((o) => o.id === objectiveId);

    if (objective) {
      addSystemMessage(
        userId,
        `Step complete: ${objective.description}`,
        "success",
        now,
        { action_type: "quest", action_id: questId }
      );
    }
  }

  // Check if all objectives are complete
  const allComplete = countCompletedObjectives.get(userId, questId)!;

  if (allComplete.total === allComplete.completed) {
    markQuestCompletable.run(userId, questId);
  }

  userChanged(userId);
};

/**
 * Moves quest objectives along in response to what happened this command
 * or system. Loads each user's progress once, and again only after it
 * changes it.
 */
export const handleQuestEvents = (events: GameEvent[], now: number) => {
  const byUser = new Map<string, GameEvent[]>();
  for (const event of events) {
    byUser.set(event.userId, [...(byUser.get(event.userId) ?? []), event]);
  }

  const quests = questQueries.getActiveQuests(now);

  for (const [userId, userEvents] of byUser) {
    let state = questQueries.getUserQuestState(userId);

    for (const event of userEvents) {
      if (applyQuestEvent(event, selectInProgressQuests(quests, state), now)) {
        state = questQueries.getUserQuestState(userId);
      }
    }
  }
};

/** Returns true if it changed any progress. */
const applyQuestEvent = (
  event: GameEvent,
  inProgress: TileQuest[],
  now: number
) => {
  let changed = false;

  for (const quest of inProgress) {
    const objective = quest.currentObjective;

    if (!objective || objective.progress?.completed) {
      continue;
    }

    const current = objective.progress?.current ?? 0;

    switch (event.type) {
      case "zone_entered":
        if (
          objective.type === "explore" &&
          objective.x === event.x &&
          objective.y === event.y
        ) {
          updateObjectiveProgress(event.userId, quest.id, objective.id, 1, now);
          addSystemMessage(
            event.userId,
            objective.found_message ?? `Discovered: ${objective.description}`,
            "success",
            now,
            {
              action_type: "quest",
              action_id: quest.id,
              location_x: event.x,
              location_y: event.y,
            }
          );
          changed = true;
        }
        break;

      case "inventory_changed":
        if (objective.type === "collect") {
          const sum = event.inventory.reduce(
            (a, b) => a + (objective.item_id === b.item_id ? b.qty : 0),
            0
          );

          // We don't care about the amount, just updating how many they have
          if (sum !== current) {
            updateObjectiveProgress(
              event.userId,
              quest.id,
              objective.id,
              sum,
              now
            );
            changed = true;
          }
        }
        break;

      case "resource_completed":
        if (
          (objective.type === "craft" || objective.type === "gather") &&
          objective.resource_id === event.resourceId
        ) {
          updateObjectiveProgress(
            event.userId,
            quest.id,
            objective.id,
            current + 1,
            now
          );
          changed = true;
        }
        break;
    }
  }

  return changed;
};
