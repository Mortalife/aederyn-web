import { resourcesById } from "../config/resources.js";
import { getTileSelection, isOutOfBounds } from "../world/index.js";
import type { Command } from "./commands.js";
import { markActionComplete, markActionInProgress } from "./systems/actions.js";
import { saveMessage } from "./systems/chat.js";
import {
  addUserToZone,
  markUserOffline,
  markUserOnline,
  removeUserFromZone,
} from "./systems/presence.js";
import { questManager } from "./systems/quest-rotation.js";
import {
  cancelQuest,
  completeQuest,
  questQueries,
  startQuest,
  updateObjectiveProgress,
} from "./systems/quests.js";
import {
  addSystemMessage,
  clearAllUserSystemMessages,
  removeSystemMessage,
} from "./systems/system-messages.js";
import {
  loadUser,
  loginUser,
  removeFromInventoryById,
  saveUser,
} from "./systems/users.js";

/**
 * Apply one command. Runs inside the tick's transaction, so it must stay
 * synchronous. Game-rule checks live here, not in the HTTP handlers: the
 * reader can't see commands that are still queued.
 */
export const apply = (command: Command, now: number): unknown => {
  switch (command.type) {
    case "login":
      return loginUser(command.userId)?.id ?? null;
    case "rotate_quests":
      return questManager.rotateActiveQuests(now, { force: command.force });
  }

  const user = loadUser(command.userId);

  if (!user) {
    return;
  }

  switch (command.type) {
    case "connect": {
      markUserOnline(user.id, now);
      if (user.z) {
        addUserToZone(user.id, user.p.x, user.p.y, now);
      }
      return;
    }

    case "disconnect": {
      markUserOffline(user.id);
      removeUserFromZone(user.id);
      return;
    }

    case "move": {
      const { direction } = command;

      if (user.z && direction !== "exit") {
        return;
      }

      // Cancel in-progress actions
      markActionComplete(user.id, user.p.x, user.p.y);

      const p = { ...user.p };
      switch (direction) {
        case "up":
          p.y -= 1;
          break;
        case "down":
          p.y += 1;
          break;
        case "left":
          p.x -= 1;
          break;
        case "right":
          p.x += 1;
          break;
        case "enter":
          user.z = true;
          addUserToZone(user.id, p.x, p.y, now);
          break;
        case "exit":
          user.z = false;
          removeUserFromZone(user.id);
          break;
      }

      if (!isOutOfBounds(p.x, p.y) && getTileSelection(p.x, p.y).accessible) {
        user.p = p;
        saveUser(user);
      }
      return;
    }

    case "gather_start": {
      const tile = isOutOfBounds(user.p.x, user.p.y)
        ? null
        : getTileSelection(user.p.x, user.p.y);
      const resource = tile?.resources.includes(command.resourceId)
        ? resourcesById.get(command.resourceId)
        : undefined;

      if (!resource) {
        return;
      }

      if (!markActionInProgress(user.id, user.p.x, user.p.y, resource, now)) {
        addSystemMessage(user.id, "You can't do that yet.", "warning", now, {
          action_type: "resource",
          action_id: resource.id,
          location_x: user.p.x,
          location_y: user.p.y,
        });
      }
      return;
    }

    case "gather_cancel": {
      if (
        !isOutOfBounds(user.p.x, user.p.y) &&
        getTileSelection(user.p.x, user.p.y).resources.includes(
          command.resourceId
        )
      ) {
        markActionComplete(user.id, user.p.x, user.p.y);
      }
      return;
    }

    case "chat":
      return saveMessage(user.id, command.message, now);

    case "inventory_drop":
      removeFromInventoryById(user.id, command.inventoryId, now);
      return;

    case "system_messages_clear":
      return clearAllUserSystemMessages(user.id);

    case "system_message_remove":
      return removeSystemMessage(user.id, command.messageId);

    case "quest_start": {
      const { availableQuests } = questQueries.getZoneQuestsForUser(
        user.id,
        user.p.x,
        user.p.y,
        now
      );
      const quest = availableQuests.find((q) => q.id === command.questId);

      if (!quest) {
        addSystemMessage(user.id, "No such quest", "error", now, {
          action_type: "quest",
          action_id: command.questId,
        });
        return;
      }

      return startQuest(user.id, quest, now);
    }

    case "quest_advance": {
      const interaction = questQueries
        .getZoneNPCInteractionsForUser(user.id, user.p.x, user.p.y, now)
        .find(
          (i) =>
            i.quest_id === command.questId &&
            i.objective.id === command.objectiveId
        );

      if (!interaction || !interaction.objective.progress) {
        addSystemMessage(
          user.id,
          "Not sure what we're doing here...",
          "error",
          now,
          { action_type: "quest", action_id: command.questId }
        );
        return;
      }

      return updateObjectiveProgress(
        user.id,
        interaction.quest_id,
        interaction.objective.id,
        interaction.objective.progress.current + 1,
        now
      );
    }

    case "quest_complete": {
      const status = questQueries.getQuestStatus(user.id, command.questId);
      const context = {
        action_type: "quest",
        action_id: command.questId,
      } as const;

      switch (status?.status) {
        case "completable":
          return completeQuest(user.id, command.questId, now);
        case undefined:
          return addSystemMessage(user.id, "No such quest", "error", now, context);
        case "in_progress":
          return addSystemMessage(
            user.id,
            "You're still on this quest!",
            "error",
            now,
            context
          );
        case "completed":
          return addSystemMessage(
            user.id,
            "You've already completed this quest!",
            "error",
            now,
            context
          );
        case "available":
          return addSystemMessage(
            user.id,
            "You haven't started this quest!",
            "error",
            now,
            context
          );
      }
      return;
    }

    case "quest_cancel":
      return cancelQuest(user.id, command.questId);
  }
};
