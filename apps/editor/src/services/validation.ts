import { repository } from "../repository/index.js";

export interface ValidationError {
  type: "missing_item" | "missing_resource" | "missing_npc" | "missing_tile" | "missing_quest" | "missing_house_tile";
  source: string;
  sourceName: string;
  sourceType: string;
  reference: string;
  location: string;
}

export interface ValidationWarning {
  type: "orphaned" | "duplicate_id" | "balance";
  entity: string;
  entityName: string;
  entityType: string;
  message: string;
}

export interface BalanceAnalysis {
  itemValueDistribution: Record<string, number>;
  collectionTimeVsReward: Array<{ resource: string; time: number; value: number; ratio: number }>;
  rarityDistribution: Record<string, number>;
}

export interface ValidationResult {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  balance: BalanceAnalysis;
  summary: {
    totalErrors: number;
    totalWarnings: number;
    healthScore: number;
  };
}

export async function runValidation(): Promise<ValidationResult> {
  const [items, resources, tiles, npcs, quests, houseTiles] = await Promise.all([
    repository.items.getAll(),
    repository.resources.getAll(),
    repository.tiles.getAll(),
    repository.npcs.getAll(),
    repository.quests.getAll(),
    repository.houseTiles.getAll(),
  ]);

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Build lookup sets for quick reference checking
  const itemIds = new Set(items.map((i) => i.id));
  const resourceIds = new Set(resources.map((r) => r.id));
  const tileIds = new Set(tiles.map((t) => t.id));
  const npcIds = new Set(npcs.map((n) => n.entity_id));
  const questIds = new Set(quests.map((q) => q.id));
  const houseTileIds = new Set(Object.keys(houseTiles));

  // Track which entities are referenced
  const referencedItems = new Set<string>();
  const referencedResources = new Set<string>();
  const referencedNpcs = new Set<string>();
  const referencedQuests = new Set<string>();

  // Step 33: Missing Reference Detection

  // Check resources for missing item references
  for (const resource of resources) {
    for (const reward of resource.reward_items || []) {
      if (!itemIds.has(reward.item_id)) {
        errors.push({
          type: "missing_item",
          source: resource.id,
          sourceName: resource.name,
          sourceType: "resource",
          reference: reward.item_id,
          location: "reward_items",
        });
      } else {
        referencedItems.add(reward.item_id);
      }
    }

    for (const req of resource.required_items || []) {
      if (!itemIds.has(req.item_id)) {
        errors.push({
          type: "missing_item",
          source: resource.id,
          sourceName: resource.name,
          sourceType: "resource",
          reference: req.item_id,
          location: "required_items",
        });
      } else {
        referencedItems.add(req.item_id);
      }
    }
  }

  // Check tiles for missing resource references
  for (const tile of tiles) {
    for (const resourceId of tile.resources || []) {
      if (!resourceIds.has(resourceId)) {
        errors.push({
          type: "missing_resource",
          source: tile.id,
          sourceName: tile.name,
          sourceType: "tile",
          reference: resourceId,
          location: "resources",
        });
      } else {
        referencedResources.add(resourceId);
      }
    }
  }

  // Check quests for missing references
  for (const quest of quests) {
    // Check quest giver NPC
    if (quest.giver?.entity_id && !npcIds.has(quest.giver.entity_id)) {
      errors.push({
        type: "missing_npc",
        source: quest.id,
        sourceName: quest.name,
        sourceType: "quest",
        reference: quest.giver.entity_id,
        location: "giver.entity_id",
      });
    } else if (quest.giver?.entity_id) {
      referencedNpcs.add(quest.giver.entity_id);
    }

    // Check quest rewards
    for (const reward of quest.rewards || []) {
      const rewardObj = reward as { item_id?: string };
      if (rewardObj.item_id && !itemIds.has(rewardObj.item_id)) {
        errors.push({
          type: "missing_item",
          source: quest.id,
          sourceName: quest.name,
          sourceType: "quest",
          reference: rewardObj.item_id,
          location: "rewards",
        });
      } else if (rewardObj.item_id) {
        referencedItems.add(rewardObj.item_id);
      }
    }

    // Check quest objectives
    for (const objective of quest.objectives || []) {
      const objData = objective as { item_id?: string };
      if (objData.item_id && !itemIds.has(objData.item_id)) {
        errors.push({
          type: "missing_item",
          source: quest.id,
          sourceName: quest.name,
          sourceType: "quest",
          reference: objData.item_id,
          location: "objectives",
        });
      } else if (objData.item_id) {
        referencedItems.add(objData.item_id);
      }
    }

    // Check prerequisites
    for (const prereq of quest.prerequisites || []) {
      if (!questIds.has(prereq)) {
        errors.push({
          type: "missing_quest",
          source: quest.id,
          sourceName: quest.name,
          sourceType: "quest",
          reference: prereq,
          location: "prerequisites",
        });
      } else {
        referencedQuests.add(prereq);
      }
    }
  }

  // Check house tiles for missing references
  for (const [id, houseTile] of Object.entries(houseTiles)) {
    for (const action of houseTile.availableActions || []) {
      const result = action.result as { transform_to?: string } | undefined;
      if (result?.transform_to && !houseTileIds.has(result.transform_to)) {
        errors.push({
          type: "missing_house_tile",
          source: id,
          sourceName: houseTile.name,
          sourceType: "house-tile",
          reference: result.transform_to,
          location: `action "${action.name}" result.transform_to`,
        });
      }

      const requirements = action.requirements as { items?: Array<{ item_id: string }> } | undefined;
      if (requirements?.items) {
        for (const item of requirements.items) {
          if (!itemIds.has(item.item_id)) {
            errors.push({
              type: "missing_item",
              source: id,
              sourceName: houseTile.name,
              sourceType: "house-tile",
              reference: item.item_id,
              location: `action "${action.name}" requirements`,
            });
          } else {
            referencedItems.add(item.item_id);
          }
        }
      }
    }
  }

  // Step 34: Orphaned Entity Detection
  for (const item of items) {
    if (!referencedItems.has(item.id)) {
      warnings.push({
        type: "orphaned",
        entity: item.id,
        entityName: item.name,
        entityType: "item",
        message: "Item is not referenced by any resource, quest, or house tile",
      });
    }
  }

  for (const resource of resources) {
    if (!referencedResources.has(resource.id)) {
      warnings.push({
        type: "orphaned",
        entity: resource.id,
        entityName: resource.name,
        entityType: "resource",
        message: "Resource is not found on any tile",
      });
    }
  }

  for (const npc of npcs) {
    if (!referencedNpcs.has(npc.entity_id)) {
      warnings.push({
        type: "orphaned",
        entity: npc.entity_id,
        entityName: npc.name,
        entityType: "npc",
        message: "NPC is not a quest giver for any quest",
      });
    }
  }

  // Step 35: Duplicate ID Detection (check for similar IDs)
  const allIds = [
    ...items.map((i) => ({ id: i.id, name: i.name, type: "item" })),
    ...resources.map((r) => ({ id: r.id, name: r.name, type: "resource" })),
    ...tiles.map((t) => ({ id: t.id, name: t.name, type: "tile" })),
    ...npcs.map((n) => ({ id: n.entity_id, name: n.name, type: "npc" })),
    ...quests.map((q) => ({ id: q.id, name: q.name, type: "quest" })),
  ];

  // Check for exact duplicates across types (shouldn't happen but check anyway)
  const idCounts = new Map<string, number>();
  for (const entity of allIds) {
    idCounts.set(entity.id, (idCounts.get(entity.id) || 0) + 1);
  }

  for (const [id, count] of idCounts) {
    if (count > 1) {
      const entity = allIds.find((e) => e.id === id);
      if (entity) {
        warnings.push({
          type: "duplicate_id",
          entity: id,
          entityName: entity.name,
          entityType: entity.type,
          message: `ID "${id}" appears ${count} times across entities`,
        });
      }
    }
  }

  // Step 36: Balance Analysis
  const balance = analyzeBalance(items, resources);

  // Calculate health score
  const totalIssues = errors.length + warnings.length;
  const totalEntities = items.length + resources.length + tiles.length + npcs.length + quests.length + Object.keys(houseTiles).length;
  const healthScore = totalEntities > 0 ? Math.max(0, Math.round(100 - (totalIssues / totalEntities) * 100)) : 100;

  return {
    errors,
    warnings,
    balance,
    summary: {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      healthScore,
    },
  };
}

function analyzeBalance(
  items: Awaited<ReturnType<typeof repository.items.getAll>>,
  resources: Awaited<ReturnType<typeof repository.resources.getAll>>
): BalanceAnalysis {
  // Item value distribution by rarity
  const itemValueDistribution: Record<string, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  };

  const rarityCounts: Record<string, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  };

  for (const item of items) {
    if (item.rarity && itemValueDistribution[item.rarity] !== undefined) {
      itemValueDistribution[item.rarity] += item.value || 0;
      rarityCounts[item.rarity]++;
    }
  }

  // Calculate average value per rarity
  for (const rarity of Object.keys(itemValueDistribution)) {
    if (rarityCounts[rarity] > 0) {
      itemValueDistribution[rarity] = Math.round(itemValueDistribution[rarity] / rarityCounts[rarity]);
    }
  }

  // Collection time vs reward value
  const collectionTimeVsReward: BalanceAnalysis["collectionTimeVsReward"] = [];

  for (const resource of resources) {
    let totalRewardValue = 0;
    for (const reward of resource.reward_items || []) {
      const item = items.find((i) => i.id === reward.item_id);
      if (item) {
        totalRewardValue += (item.value || 0) * reward.qty;
      }
    }

    if (resource.collectionTime > 0) {
      collectionTimeVsReward.push({
        resource: resource.name,
        time: resource.collectionTime,
        value: totalRewardValue,
        ratio: Math.round((totalRewardValue / resource.collectionTime) * 100) / 100,
      });
    }
  }

  // Sort by ratio (value per second)
  collectionTimeVsReward.sort((a, b) => b.ratio - a.ratio);

  return {
    itemValueDistribution,
    collectionTimeVsReward: collectionTimeVsReward.slice(0, 10), // Top 10
    rarityDistribution: rarityCounts,
  };
}

export function getErrorTypeLabel(type: ValidationError["type"]): string {
  const labels: Record<ValidationError["type"], string> = {
    missing_item: "Missing Item",
    missing_resource: "Missing Resource",
    missing_npc: "Missing NPC",
    missing_tile: "Missing Tile",
    missing_quest: "Missing Quest",
    missing_house_tile: "Missing House Tile",
  };
  return labels[type];
}

export function getEntityEditUrl(type: string, id: string): string {
  const typeToPath: Record<string, string> = {
    item: "items",
    resource: "resources",
    tile: "tiles",
    npc: "npcs",
    quest: "quests",
    "house-tile": "house-tiles",
  };
  return `/${typeToPath[type] || type}/${id}`;
}
