import { repository } from "../repository/index.js";

export interface UsedByReference {
  entityId: string;
  entityName: string;
  entityType: "item" | "resource" | "tile" | "npc" | "quest" | "house-tile";
  context: string;
}

export async function findUsedBy(targetId: string): Promise<UsedByReference[]> {
  const references: UsedByReference[] = [];

  const [resources, tiles, quests, houseTiles] = await Promise.all([
    repository.resources.getAll(),
    repository.tiles.getAll(),
    repository.quests.getAll(),
    repository.houseTiles.getAll(),
  ]);

  // Check resources for item references
  for (const resource of resources) {
    // Check reward_items
    for (const reward of resource.reward_items || []) {
      if (reward.item_id === targetId) {
        references.push({
          entityId: resource.id,
          entityName: resource.name,
          entityType: "resource",
          context: `Yields ${reward.qty}x`,
        });
      }
    }

    // Check required_items
    for (const req of resource.required_items || []) {
      if (req.item_id === targetId) {
        references.push({
          entityId: resource.id,
          entityName: resource.name,
          entityType: "resource",
          context: `Requires ${req.qty}x`,
        });
      }
    }
  }

  // Check tiles for resource references
  for (const tile of tiles) {
    for (const resourceId of tile.resources || []) {
      if (resourceId === targetId) {
        references.push({
          entityId: tile.id,
          entityName: tile.name,
          entityType: "tile",
          context: "Contains resource",
        });
      }
    }
  }

  // Check quests for various references
  for (const quest of quests) {
    // Quest giver (NPC)
    if (quest.giver?.entity_id === targetId) {
      references.push({
        entityId: quest.id,
        entityName: quest.name,
        entityType: "quest",
        context: "Quest giver",
      });
    }

    // Quest rewards
    for (const reward of quest.rewards || []) {
      const rewardObj = reward as { item_id?: string };
      if (rewardObj.item_id === targetId) {
        references.push({
          entityId: quest.id,
          entityName: quest.name,
          entityType: "quest",
          context: "Reward item",
        });
      }
    }

    // Quest objectives
    for (const objective of quest.objectives || []) {
      const objData = objective as { item_id?: string };
      if (objData.item_id === targetId) {
        references.push({
          entityId: quest.id,
          entityName: quest.name,
          entityType: "quest",
          context: "Objective item",
        });
      }
    }

    // Prerequisites
    for (const prereq of quest.prerequisites || []) {
      if (prereq === targetId) {
        references.push({
          entityId: quest.id,
          entityName: quest.name,
          entityType: "quest",
          context: "Prerequisite",
        });
      }
    }
  }

  // Check house tiles for item references in actions
  for (const [id, houseTile] of Object.entries(houseTiles)) {
    for (const action of houseTile.availableActions || []) {
      // Check transform_to
      const result = action.result as { transform_to?: string } | undefined;
      if (result?.transform_to === targetId) {
        references.push({
          entityId: id,
          entityName: houseTile.name,
          entityType: "house-tile",
          context: `Transforms to via "${action.name}"`,
        });
      }

      // Check required items
      const requirements = action.requirements as { items?: Array<{ item_id: string }> } | undefined;
      if (requirements?.items) {
        for (const item of requirements.items) {
          if (item.item_id === targetId) {
            references.push({
              entityId: id,
              entityName: houseTile.name,
              entityType: "house-tile",
              context: `Required for "${action.name}"`,
            });
          }
        }
      }
    }
  }

  return references;
}

export function getEntityEditUrl(ref: UsedByReference): string {
  const typeToPath: Record<UsedByReference["entityType"], string> = {
    item: "items",
    resource: "resources",
    tile: "tiles",
    npc: "npcs",
    quest: "quests",
    "house-tile": "house-tiles",
  };
  return `/${typeToPath[ref.entityType]}/${ref.entityId}`;
}

export function getEntityTypeColor(type: UsedByReference["entityType"]): string {
  const colors: Record<UsedByReference["entityType"], string> = {
    item: "text-amber-400",
    resource: "text-emerald-400",
    tile: "text-blue-400",
    npc: "text-purple-400",
    quest: "text-rose-400",
    "house-tile": "text-cyan-400",
  };
  return colors[type];
}
