import { poolIds, poolThings, questNpcReferences } from "@aederyn/types";
import { repository } from "../repository/index.js";

export type EntityType = "item" | "resource" | "tile" | "effect" | "npc" | "quest" | "houseTile" | "map";

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
    const hasAffectedResource = poolIds(tile.resources).some((r) => affectedResourceIds.has(r));
    if (hasAffectedResource) {
      indirectImpacts.push({
        type: "tile",
        id: tile.id,
        name: tile.name,
        relationship: "contains affected resource",
      });
    }
  }

  const effects = await repository.effects.getAll();
  for (const itemEffect of [...(item.effects || []), ...(item.wornEffects || [])]) {
    const effect = effects.find((e) => e.id === itemEffect.id);
    if (effect && !indirectImpacts.some((i) => i.id === effect.id)) {
      indirectImpacts.push({
        type: "effect",
        id: effect.id,
        name: effect.name,
        relationship: "applied by this item",
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
    if (poolIds(tile.resources).includes(resourceId)) {
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

  // Quests that send the player to a landmark showing this tile, or to a
  // region cell showing it
  const quests = await repository.quests.getAll();
  const [questMap, allNpcs] = await Promise.all([repository.map.get(), repository.npcs.getAll()]);
  const tileLandmarks = new Set(questMap.landmarks.filter((l) => l.tile === tileId).map((l) => l.id));
  const homes = new Map(allNpcs.map((n) => [n.entity_id, n.home]));
  for (const quest of quests) {
    const places = [
      ...questNpcReferences(quest).map(({ ref }) => ref.landmark ?? homes.get(ref.entity_id)),
      quest.kind === "contract" ? quest.board : undefined,
      ...quest.objectives.map((o) => (o.type === "explore" ? o.landmark : undefined)),
    ];
    if (places.some((id) => id && tileLandmarks.has(id))) {
      directImpacts.push({
        type: "quest",
        id: quest.id,
        name: quest.name,
        relationship: "takes place at a landmark showing this tile",
      });
    }
    if (quest.objectives.some((o) => o.type === "explore" && o.tile === tileId)) {
      directImpacts.push({
        type: "quest",
        id: quest.id,
        name: quest.name,
        relationship: "explores a cell showing this tile",
      });
    }
  }

  // Where the map places this tile, and who lives at those landmarks
  const [map, npcs] = await Promise.all([repository.map.get(), repository.npcs.getAll()]);
  for (const region of map.regions) {
    const weighted = region.tiles.find((t) => t.id === tileId);
    if (weighted) {
      directImpacts.push({
        type: "map",
        id: region.id,
        name: `Region ${region.id}`,
        relationship: `fills the region (weight ${weighted.weight})`,
      });
    }
  }
  const landmarks = map.landmarks.filter((l) => l.tile === tileId);
  for (const landmark of landmarks) {
    directImpacts.push({
      type: "map",
      id: landmark.id,
      name: `Landmark ${landmark.id}`,
      relationship: `pinned at ${landmark.x},${landmark.y}${landmark.spawn ? " (spawn)" : ""}`,
    });
  }
  for (const npc of npcs) {
    if (npc.home && landmarks.some((l) => l.id === npc.home)) {
      indirectImpacts.push({
        type: "npc",
        id: npc.entity_id,
        name: npc.name,
        relationship: `lives at ${npc.home}`,
      });
    }
  }

  // Resources on this tile
  const resources = await repository.resources.getAll();
  for (const resourceId of poolIds(tile.resources)) {
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

  const effects = await repository.effects.getAll();
  for (const tileEffect of poolThings(tile.effects)) {
    const effect = effects.find((e) => e.id === tileEffect.id);
    if (effect) {
      indirectImpacts.push({
        type: "effect",
        id: effect.id,
        name: effect.name,
        relationship: `applied on this tile (strength ${tileEffect.strength})`,
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

export async function analyzeEffectImpact(effectId: string): Promise<ImpactAnalysis | null> {
  const effect = await repository.effects.getById(effectId);
  if (!effect) return null;

  const directImpacts: ImpactNode[] = [];
  const indirectImpacts: ImpactNode[] = [];

  const [tiles, items, effects, resources, map] = await Promise.all([
    repository.tiles.getAll(),
    repository.items.getAll(),
    repository.effects.getAll(),
    repository.resources.getAll(),
    repository.map.get(),
  ]);

  for (const tile of tiles) {
    if (poolIds(tile.effects).includes(effectId)) {
      directImpacts.push({ type: "tile", id: tile.id, name: tile.name, relationship: "applies this effect" });
    }
  }
  for (const region of map.regions) {
    const effect = region.effects.find((e) => e.id === effectId);
    if (effect) {
      directImpacts.push({
        type: "map",
        id: region.id,
        name: `Region ${region.id}`,
        relationship: `applies this effect to every cell (strength ${effect.strength})`,
      });
    }
  }

  const affectedItems = new Set<string>();
  for (const item of items) {
    if ((item.effects || []).some((e) => e.id === effectId)) {
      directImpacts.push({ type: "item", id: item.id, name: item.name, relationship: "applies this effect on use" });
      affectedItems.add(item.id);
    }
    if ((item.wornEffects || []).some((e) => e.id === effectId)) {
      directImpacts.push({ type: "item", id: item.id, name: item.name, relationship: "applies this effect while worn" });
      affectedItems.add(item.id);
    }
  }

  for (const other of effects) {
    if (other.kind === "protects" && other.target === effectId) {
      directImpacts.push({ type: "effect", id: other.id, name: other.name, relationship: "protects against this effect" });
    }
  }
  if (effect.kind === "protects") {
    const target = effects.find((e) => e.id === effect.target);
    if (target) {
      directImpacts.push({ type: "effect", id: target.id, name: target.name, relationship: "protected against by this effect" });
    }
  }

  for (const resource of resources) {
    if (resource.reward_items.some((r) => affectedItems.has(r.item_id))) {
      indirectImpacts.push({ type: "resource", id: resource.id, name: resource.name, relationship: "produces an affected item" });
    }
  }

  return {
    entity: { type: "effect", id: effectId, name: effect.name },
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
    const isGiver = quest.kind === "story" && quest.giver.entity_id === npcId;
    const inObjectives = quest.objectives?.some(
      (o) => o.type === "talk" && o.entity_id === npcId
    );
    const inCompletion = quest.kind === "story" && quest.completion.entity_id === npcId;

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
    case "effect":
      return analyzeEffectImpact(entityId);
    case "npc":
      return analyzeNpcImpact(entityId);
    default:
      return null;
  }
}
