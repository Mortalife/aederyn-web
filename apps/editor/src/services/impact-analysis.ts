import { repository } from "../repository/index.js";

export type EntityType = "item" | "resource" | "tile" | "npc" | "quest" | "houseTile";

export interface ImpactNode {
  type: EntityType;
  id: string;
  name: string;
  relationship: string;
}

export interface ImpactAnalysis {
  entity: {
    type: EntityType;
    id: string;
    name: string;
  };
  directImpacts: ImpactNode[];
  indirectImpacts: ImpactNode[];
  totalAffected: number;
}

export async function analyzeItemImpact(itemId: string): Promise<ImpactAnalysis | null> {
  const item = await repository.items.getById(itemId);
  if (!item) return null;

  const directImpacts: ImpactNode[] = [];
  const indirectImpacts: ImpactNode[] = [];

  // Check resources that use this item
  const resources = await repository.resources.getAll();
  for (const resource of resources) {
    const usedInRewards = resource.reward_items.some((r) => r.item_id === itemId);
    const usedInRequired = resource.required_items.some((r) => r.item_id === itemId);

    if (usedInRewards) {
      directImpacts.push({
        type: "resource",
        id: resource.id,
        name: resource.name,
        relationship: "rewards this item",
      });
    }
    if (usedInRequired) {
      directImpacts.push({
        type: "resource",
        id: resource.id,
        name: resource.name,
        relationship: "requires this item",
      });
    }
  }

  // Check quests that reference this item
  const quests = await repository.quests.getAll();
  for (const quest of quests) {
    const usedInRewards = quest.rewards?.some(
      (r: { type: string; item_id?: string }) => r.type === "item" && r.item_id === itemId
    );
    const usedInObjectives = quest.objectives?.some(
      (o: { type: string; item_id?: string }) => o.type === "collect" && o.item_id === itemId
    );

    if (usedInRewards) {
      directImpacts.push({
        type: "quest",
        id: quest.id,
        name: quest.name,
        relationship: "rewards this item",
      });
    }
    if (usedInObjectives) {
      directImpacts.push({
        type: "quest",
        id: quest.id,
        name: quest.name,
        relationship: "requires collecting this item",
      });
    }
  }

  // Find indirect impacts through resources -> tiles
  const affectedResourceIds = new Set(
    directImpacts.filter((i) => i.type === "resource").map((i) => i.id)
  );
  
  const tiles = await repository.tiles.getAll();
  for (const tile of tiles) {
    const hasAffectedResource = tile.resources.some((r) => affectedResourceIds.has(r));
    if (hasAffectedResource) {
      indirectImpacts.push({
        type: "tile",
        id: tile.id,
        name: tile.name,
        relationship: "contains affected resource",
      });
    }
  }

  return {
    entity: { type: "item", id: itemId, name: item.name },
    directImpacts,
    indirectImpacts,
    totalAffected: directImpacts.length + indirectImpacts.length,
  };
}

export async function analyzeResourceImpact(resourceId: string): Promise<ImpactAnalysis | null> {
  const resource = await repository.resources.getById(resourceId);
  if (!resource) return null;

  const directImpacts: ImpactNode[] = [];
  const indirectImpacts: ImpactNode[] = [];

  // Check tiles that contain this resource
  const tiles = await repository.tiles.getAll();
  for (const tile of tiles) {
    if (tile.resources.includes(resourceId)) {
      directImpacts.push({
        type: "tile",
        id: tile.id,
        name: tile.name,
        relationship: "contains this resource",
      });
    }
  }

  // Check quests that reference this resource
  const quests = await repository.quests.getAll();
  for (const quest of quests) {
    const usedInObjectives = quest.objectives?.some(
      (o: { type: string; resource_id?: string }) =>
        (o.type === "gather" || o.type === "craft") && o.resource_id === resourceId
    );

    if (usedInObjectives) {
      directImpacts.push({
        type: "quest",
        id: quest.id,
        name: quest.name,
        relationship: "requires gathering/crafting from this resource",
      });
    }
  }

  // Check items used by this resource (indirect - if item changes, this resource is affected)
  const items = await repository.items.getAll();
  for (const rewardItem of resource.reward_items) {
    const item = items.find((i) => i.id === rewardItem.item_id);
    if (item) {
      indirectImpacts.push({
        type: "item",
        id: item.id,
        name: item.name,
        relationship: "rewarded by this resource",
      });
    }
  }
  for (const reqItem of resource.required_items) {
    const item = items.find((i) => i.id === reqItem.item_id);
    if (item) {
      indirectImpacts.push({
        type: "item",
        id: item.id,
        name: item.name,
        relationship: "required by this resource",
      });
    }
  }

  return {
    entity: { type: "resource", id: resourceId, name: resource.name },
    directImpacts,
    indirectImpacts,
    totalAffected: directImpacts.length + indirectImpacts.length,
  };
}

export async function analyzeTileImpact(tileId: string): Promise<ImpactAnalysis | null> {
  const tile = await repository.tiles.getById(tileId);
  if (!tile) return null;

  const directImpacts: ImpactNode[] = [];
  const indirectImpacts: ImpactNode[] = [];

  // Check quests that reference this tile's zone
  const quests = await repository.quests.getAll();
  for (const quest of quests) {
    const usedAsGiverZone = quest.giver?.zone_id === tileId;
    const usedInObjectives = quest.objectives?.some(
      (o) => "zone_id" in o && o.zone_id === tileId
    );
    const usedInCompletion = quest.completion?.zone_id === tileId;

    if (usedAsGiverZone) {
      directImpacts.push({
        type: "quest",
        id: quest.id,
        name: quest.name,
        relationship: "quest giver located here",
      });
    }
    if (usedInObjectives) {
      directImpacts.push({
        type: "quest",
        id: quest.id,
        name: quest.name,
        relationship: "has objectives in this zone",
      });
    }
    if (usedInCompletion) {
      directImpacts.push({
        type: "quest",
        id: quest.id,
        name: quest.name,
        relationship: "quest completion here",
      });
    }
  }

  // Check NPCs that might be in this zone
  const npcs = await repository.npcs.getAll();
  // NPCs don't have zone_id in current schema, but we can check relationships
  
  // Resources on this tile
  const resources = await repository.resources.getAll();
  for (const resourceId of tile.resources) {
    const resource = resources.find((r) => r.id === resourceId);
    if (resource) {
      indirectImpacts.push({
        type: "resource",
        id: resource.id,
        name: resource.name,
        relationship: "available on this tile",
      });
    }
  }

  return {
    entity: { type: "tile", id: tileId, name: tile.name },
    directImpacts,
    indirectImpacts,
    totalAffected: directImpacts.length + indirectImpacts.length,
  };
}

export async function analyzeNpcImpact(npcId: string): Promise<ImpactAnalysis | null> {
  const npc = await repository.npcs.getById(npcId);
  if (!npc) return null;

  const directImpacts: ImpactNode[] = [];
  const indirectImpacts: ImpactNode[] = [];

  // Check quests that reference this NPC
  const quests = await repository.quests.getAll();
  for (const quest of quests) {
    const isGiver = quest.giver?.entity_id === npcId;
    const inObjectives = quest.objectives?.some(
      (o: { type: string; entity_id?: string }) => o.type === "talk" && o.entity_id === npcId
    );
    const inCompletion = quest.completion?.entity_id === npcId;

    if (isGiver) {
      directImpacts.push({
        type: "quest",
        id: quest.id,
        name: quest.name,
        relationship: "given by this NPC",
      });
    }
    if (inObjectives) {
      directImpacts.push({
        type: "quest",
        id: quest.id,
        name: quest.name,
        relationship: "requires talking to this NPC",
      });
    }
    if (inCompletion) {
      directImpacts.push({
        type: "quest",
        id: quest.id,
        name: quest.name,
        relationship: "completed with this NPC",
      });
    }
  }

  // Check other NPCs with relationships to this NPC
  const npcs = await repository.npcs.getAll();
  for (const otherNpc of npcs) {
    if (otherNpc.entity_id === npcId) continue;
    
    const hasRelationship = Object.values(otherNpc.relationships || {}).some(
      (relations) => Array.isArray(relations) && relations.includes(npcId)
    );
    
    if (hasRelationship) {
      indirectImpacts.push({
        type: "npc",
        id: otherNpc.entity_id,
        name: otherNpc.name,
        relationship: "has relationship with this NPC",
      });
    }
  }

  return {
    entity: { type: "npc", id: npcId, name: npc.name },
    directImpacts,
    indirectImpacts,
    totalAffected: directImpacts.length + indirectImpacts.length,
  };
}

export async function analyzeImpact(
  entityType: EntityType,
  entityId: string
): Promise<ImpactAnalysis | null> {
  switch (entityType) {
    case "item":
      return analyzeItemImpact(entityId);
    case "resource":
      return analyzeResourceImpact(entityId);
    case "tile":
      return analyzeTileImpact(entityId);
    case "npc":
      return analyzeNpcImpact(entityId);
    default:
      return null;
  }
}
