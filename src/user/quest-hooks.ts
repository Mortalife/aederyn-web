import type { UserInventoryItem } from "../config";
import { questProgressManager } from "./quest-progress-manager";
import { addSystemMessage } from "./system";

class QuestProgressHooks {
  // Zone change
  async onZoneChange(user_id: string, newX: number, newY: number) {
    const inprogress = await questProgressManager.getInProgressQuestsForUser(
      user_id
    );

    for (const quest of inprogress) {
      if (
        quest.currentObjective &&
        quest.currentObjective.type === "explore" &&
        !quest.currentObjective.progress?.completed &&
        quest.currentObjective.x === newX &&
        quest.currentObjective.y === newY
      ) {
        await questProgressManager.updateObjectiveProgress(
          user_id,
          quest.id,
          quest.currentObjective.id,
          1
        );
        await addSystemMessage(
          user_id,
          quest.currentObjective.found_message ??
            `Discovered: ${quest.currentObjective.description}`,
          "success"
        );
      }
    }
  }

  // Inventory change
  async onInventoryChange(user_id: string, newInventory: UserInventoryItem[]) {
    const inprogress = await questProgressManager.getInProgressQuestsForUser(
      user_id
    );

    for (const quest of inprogress) {
      if (
        quest.currentObjective &&
        quest.currentObjective.type === "collect" &&
        !quest.currentObjective.progress?.completed
      ) {
        const sum = newInventory.reduce((a, b) => {
          const amount =
            quest.currentObjective?.type === "collect" &&
            quest.currentObjective.item_id === b.item_id
              ? b.qty
              : 0;

          return a + amount;
        }, 0);

        // We don't care about the amount, just updating how many they have
        if (
          sum > (quest.currentObjective.progress?.current ?? 0) ||
          sum < (quest.currentObjective.progress?.current ?? 0)
        ) {
          await questProgressManager.updateObjectiveProgress(
            user_id,
            quest.id,
            quest.currentObjective.id,
            sum
          );
        }
      }
    }
  }

  // Resource completed
  async onResourceCompleted(user_id: string, resource_id: string) {
    const inprogress = await questProgressManager.getInProgressQuestsForUser(
      user_id
    );

    for (const quest of inprogress) {
      if (
        quest.currentObjective &&
        (quest.currentObjective.type === "craft" ||
          quest.currentObjective.type === "gather") &&
        !quest.currentObjective.progress?.completed &&
        quest.currentObjective.resource_id === resource_id
      ) {
        await questProgressManager.updateObjectiveProgress(
          user_id,
          quest.id,
          quest.currentObjective.id,
          (quest.currentObjective.progress?.current ?? 0) + 1
        );
      }
    }
  }
}

export const progressHooks = new QuestProgressHooks();
