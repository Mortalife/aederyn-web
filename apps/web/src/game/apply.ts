import { resourcesById } from "../config/resources.js";
import { getTileSelection, isOutOfBounds } from "../world/index.js";
import type { Command } from "./commands.js";
import {
  blockedMessage,
  blockingEffect,
  gatherDurationMultiplier,
} from "../world/effects.js";
import { markActionComplete, markActionInProgress } from "./systems/actions.js";
import {
  backfillDiscoveries,
  discoverNpc,
  discoverTile,
} from "./systems/discoveries.js";
import { effectsOn } from "./systems/effects.js";
import { useItem } from "./systems/use.js";
import { combatForUser, startCombat, stopCombat } from "./systems/combat.js";
import { saveMessage } from "./systems/chat.js";
import {
  addUserToZone,
  markUserOffline,
  markUserOnline,
  removeUserFromZone,
} from "./systems/presence.js";
import { rotateContracts } from "./systems/contract-rotation.js";
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
  equipItem,
  loadUser,
  loginUser,
  removeFromInventoryById,
  saveUser,
  unequipItem,
} from "./systems/users.js";
import type { GameUserModel } from "../config.js";

const backfill = (user: GameUserModel, now: number) =>
  backfillDiscoveries(
    user,
    questQueries.getActiveQuests(now),
    questQueries.getUserQuestState(user.id),
    now
  );

/**
 * Apply one command. Runs inside the tick's transaction, so it must stay
 * synchronous. Game-rule checks live here, not in the HTTP handlers: the
 * reader can't see commands that are still queued.
 */
export const apply = (command: Command, now: number): unknown => {
  switch (command.type) {
    case "login": {
      const user = loginUser(command.userId);
      if (user) {
        backfill(user, now);
      }
      return user?.id ?? null;
    }
    case "rotate_contracts":
      rotateContracts(now, { force: command.force });
      return;
  }

  const user = loadUser(command.userId);

  if (!user) {
    return;
  }

  switch (command.type) {
    case "connect": {
      backfill(user, now);
      markUserOnline(user.id, now);
      if (user.z) {
        addUserToZone(user.id, user.p.x, user.p.y, now);
      }
      return;
    }

    case "disconnect": {
      stopCombat(user.id, now);
      markUserOffline(user.id);
      removeUserFromZone(user.id);
      return;
    }

    case "move": {
      const { direction } = command;
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
      }
      const stepping = p.x !== user.p.x || p.y !== user.p.y;
      const reachable =
        !isOutOfBounds(p.x, p.y) && getTileSelection(p.x, p.y).accessible;

      // A step from inside a zone leaves it first, so it's refused whole
      // rather than leaving the zone for a cell it can't reach.
      if (user.z && (direction === "enter" || (stepping && !reachable))) {
        return;
      }

      stopCombat(user.id, now);
      markActionComplete(user.id, user.p.x, user.p.y);

      if (direction === "enter") {
        user.z = true;
        addUserToZone(user.id, p.x, p.y, now);
      } else if (user.z || direction === "exit") {
        user.z = false;
        removeUserFromZone(user.id);
      }

      if (reachable) {
        user.p = p;
        saveUser(user);
        discoverTile(user.id, p.x, p.y, now);
      }
      return;
    }

    case "gather_start": {
      if (combatForUser(user.id)) {
        addSystemMessage(user.id, "You can't gather while fighting.", "warning", now, {
          action_type: "resource",
          action_id: command.resourceId,
          location_x: user.p.x,
          location_y: user.p.y,
        });
        return;
      }
      const tile = isOutOfBounds(user.p.x, user.p.y)
        ? null
        : getTileSelection(user.p.x, user.p.y);
      const resource = tile?.resources.includes(command.resourceId)
        ? resourcesById.get(command.resourceId)
        : undefined;

      if (!resource) {
        return;
      }

      const effects = effectsOn(user, now);
      const blocker = blockingEffect(effects, "gather");
      if (blocker) {
        addSystemMessage(user.id, blockedMessage(blocker, "gather"), "warning", now, {
          action_type: "resource",
          action_id: resource.id,
          location_x: user.p.x,
          location_y: user.p.y,
        });
        return;
      }

      const speed = gatherDurationMultiplier(effects);
      if (!markActionInProgress(user.id, user.p.x, user.p.y, resource, now, speed)) {
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

    case "attack":
      return startCombat(user, command.spawn, now);

    case "flee":
      return stopCombat(user.id, now);

    case "chat":
      return saveMessage(user.id, command.message, now);

    case "inventory_drop":
      removeFromInventoryById(user.id, command.inventoryId, now);
      return;

    case "use":
      useItem(user.id, command.inventoryId, now);
      return;

    case "equip":
      equipItem(user.id, command.inventoryId, now);
      return;

    case "unequip":
      unequipItem(user.id, command.slot, now);
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

      discoverNpc(user.id, interaction.objective.entity_id, now);
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
        case "completable": {
          const here = questQueries
            .getZoneQuestsForUser(user.id, user.p.x, user.p.y, now)
            .completableQuests.some((q) => q.id === command.questId);
          if (!here) {
            return addSystemMessage(
              user.id,
              "This isn't where you hand that in.",
              "error",
              now,
              context
            );
          }
          return completeQuest(user.id, command.questId, now);
        }
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
