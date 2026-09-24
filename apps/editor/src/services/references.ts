import { poolIds, poolThings, questNpcReferences } from "@aederyn/types";
import { repository } from "../repository/index.js";

export interface UsedByReference {
  entityId: string;
  entityName: string;
  entityType: "item" | "resource" | "tile" | "effect" | "npc" | "quest" | "house-tile" | "map";
  context: string;
}

export async function findUsedBy(targetId: string): Promise<UsedByReference[]> {
  const references: UsedByReference[] = [];

  const [items, resources, tiles, effects, npcs, quests, houseTiles, map] = await Promise.all([
    repository.items.getAll(),
    repository.resources.getAll(),
    repository.tiles.getAll(),
    repository.effects.getAll(),
    repository.npcs.getAll(),
    repository.quests.getAll(),
    repository.houseTiles.getAll(),
    repository.map.get(),
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

  // Tile pools, which can hold resources, monsters and effects
  for (const tile of tiles) {
    if (poolIds(tile.resources).includes(targetId)) {
      references.push({
        entityId: tile.id,
        entityName: tile.name,
        entityType: "tile",
        context: "Resource pool",
      });
    }
    if (poolIds(tile.monsters).includes(targetId)) {
      references.push({
        entityId: tile.id,
        entityName: tile.name,
        entityType: "tile",
        context: "Monster pool",
      });
    }
    for (const effect of poolThings(tile.effects)) {
      if (effect.id === targetId) {
        references.push({
          entityId: tile.id,
          entityName: tile.name,
          entityType: "tile",
          context: `Effect pool (strength ${effect.strength})`,
        });
      }
    }
  }

  // The map: region fills and effects, landmarks' tiles, and NPC homes
  for (const region of map.regions) {
    for (const tile of region.tiles) {
      if (tile.id === targetId) {
        references.push({
          entityId: region.id,
          entityName: `Region ${region.id}`,
          entityType: "map",
          context: `Fills the region (weight ${tile.weight})`,
        });
      }
    }
    for (const effect of region.effects) {
      if (effect.id === targetId) {
        references.push({
          entityId: region.id,
          entityName: `Region ${region.id}`,
          entityType: "map",
          context: `Region effect (strength ${effect.strength})`,
        });
      }
    }
  }
  for (const landmark of map.landmarks) {
    if (landmark.tile === targetId) {
      references.push({
        entityId: landmark.id,
        entityName: `Landmark ${landmark.id}`,
        entityType: "map",
        context: `Pinned at ${landmark.x},${landmark.y}${landmark.spawn ? " (spawn)" : ""}`,
      });
    }
  }
  for (const npc of npcs) {
    if (npc.home && npc.home === targetId) {
      references.push({
        entityId: npc.entity_id,
        entityName: npc.name,
        entityType: "npc",
        context: "Lives here",
      });
    }
  }

  for (const item of items) {
    for (const effect of item.effects || []) {
      if (effect.id === targetId) {
        references.push({
          entityId: item.id,
          entityName: item.name,
          entityType: "item",
          context: `On use (strength ${effect.strength}, ${effect.duration}s)`,
        });
      }
    }
    for (const effect of item.wornEffects || []) {
      if (effect.id === targetId) {
        references.push({
          entityId: item.id,
          entityName: item.name,
          entityType: "item",
          context: `Worn (strength ${effect.strength})`,
        });
      }
    }
  }
  for (const effect of effects) {
    if (effect.kind === "protects" && effect.target === targetId) {
      references.push({
        entityId: effect.id,
        entityName: effect.name,
        entityType: "effect",
        context: "Protects against",
      });
    }
  }

  // Check quests for various references
  for (const quest of quests) {
    // NPCs: giver, talk objectives, turn-in
    for (const { ref, location } of questNpcReferences(quest)) {
      if (ref.entity_id === targetId) {
        references.push({
          entityId: quest.id,
          entityName: quest.name,
          entityType: "quest",
          context: location === "giver" ? "Quest giver" : location === "completion" ? "Turn-in NPC" : "Talk objective",
        });
      }
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
      if (objective.type === "explore" && objective.tile === targetId) {
        references.push({
          entityId: quest.id,
          entityName: quest.name,
          entityType: "quest",
          context: `Explores a ${objective.region} cell showing it`,
        });
      }
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

    for (const excluded of quest.kind === "story" ? quest.excludes || [] : []) {
      if (excluded === targetId) {
        references.push({
          entityId: quest.id,
          entityName: quest.name,
          entityType: "quest",
          context: "Excludes",
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
  if (ref.entityType === "map") return "/map";
  const typeToPath: Record<Exclude<UsedByReference["entityType"], "map">, string> = {
    item: "items",
    resource: "resources",
    tile: "tiles",
    effect: "effects",
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
    effect: "text-yellow-400",
    npc: "text-purple-400",
    quest: "text-rose-400",
    "house-tile": "text-cyan-400",
    map: "text-lime-400",
  };
  return colors[type];
}
