import type { ZodTypeAny } from "zod";
import {
  ItemSchema,
  ResourceModelSchema,
  TileSchema,
  NPCSchema,
  QuestSchema,
  TileQuestSchema,
  HouseTileSchema,
  WorldBibleSchema,
} from "@aederyn/types";
import { repository } from "../repository/index.js";

export interface ValidationError {
  type:
    | "missing_item"
    | "missing_resource"
    | "missing_npc"
    | "missing_tile"
    | "missing_quest"
    | "missing_house_tile"
    | "missing_world_ref"
    | "inaccessible_tile"
    | "invalid_schema"
    | "duplicate_id";
  source: string;
  sourceName: string;
  sourceType: string;
  reference: string;
  location: string;
}

export interface ValidationWarning {
  type: "orphaned" | "duplicate_id" | "balance" | "unobtainable" | "unused" | "circular_dependency";
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
  const [items, resources, tiles, npcs, quests, houseTiles, worldBible] = await Promise.all([
    repository.items.getAll(),
    repository.resources.getAll(),
    repository.tiles.getAll(),
    repository.npcs.getAll(),
    repository.quests.getAll(),
    repository.houseTiles.getAll(),
    repository.worldBible.get(),
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

  // Schema validation: every record must parse against its @aederyn/types schema
  const checkSchema = (
    records: Array<{ id: string; name: string; data: unknown }>,
    schema: ZodTypeAny,
    sourceType: string
  ) => {
    for (const record of records) {
      const result = schema.safeParse(record.data);
      if (result.success) continue;
      for (const issue of result.error.issues) {
        errors.push({
          type: "invalid_schema",
          source: record.id,
          sourceName: record.name,
          sourceType,
          reference: issue.message,
          location: issue.path.join(".") || "(root)",
        });
      }
    }
  };
  checkSchema(items.map((i) => ({ id: i.id, name: i.name, data: i })), ItemSchema, "item");
  checkSchema(resources.map((r) => ({ id: r.id, name: r.name, data: r })), ResourceModelSchema, "resource");
  checkSchema(tiles.map((t) => ({ id: t.id, name: t.name, data: t })), TileSchema, "tile");
  checkSchema(npcs.map((n) => ({ id: n.entity_id, name: n.name, data: n })), NPCSchema, "npc");
  checkSchema(
    quests.map((q) => ({ id: q.id, name: q.name, data: q })),
    QuestSchema.or(TileQuestSchema),
    "quest"
  );
  checkSchema(
    Object.entries(houseTiles).map(([id, h]) => ({ id, name: h.name, data: h })),
    HouseTileSchema,
    "house-tile"
  );
  for (const [key, houseTile] of Object.entries(houseTiles)) {
    if (houseTile.id !== key) {
      errors.push({
        type: "invalid_schema",
        source: key,
        sourceName: houseTile.name,
        sourceType: "house-tile",
        reference: `id "${houseTile.id}" does not match its key "${key}"`,
        location: "id",
      });
    }
  }

  // The game equips items by slot, so an equippable item without one can't be equipped
  for (const item of items) {
    if (item.equippable && !item.equipSlot) {
      errors.push({
        type: "invalid_schema",
        source: item.id,
        sourceName: item.name,
        sourceType: "item",
        reference: "equippable items need an equipSlot",
        location: "equipSlot",
      });
    }
  }

  checkSchema([{ id: "world-bible", name: worldBible.name, data: worldBible }], WorldBibleSchema, "world-bible");

  // Duplicate IDs within a type: lookups by ID silently return the first match
  const checkDuplicates = (records: Array<{ id: string; name: string }>, sourceType: string) => {
    const seen = new Set<string>();
    for (const record of records) {
      if (seen.has(record.id)) {
        errors.push({
          type: "duplicate_id",
          source: record.id,
          sourceName: record.name,
          sourceType,
          reference: record.id,
          location: "id",
        });
      }
      seen.add(record.id);
    }
  };
  checkDuplicates(items, "item");
  checkDuplicates(resources, "resource");
  checkDuplicates(tiles, "tile");
  checkDuplicates(npcs.map((n) => ({ id: n.entity_id, name: n.name })), "npc");
  checkDuplicates(quests, "quest");
  checkDuplicates(worldBible.regions, "world-region");
  checkDuplicates(worldBible.factions, "world-faction");
  checkDuplicates(worldBible.history, "world-history");
  checkDuplicates(worldBible.themes, "world-theme");
  checkDuplicates(worldBible.systems, "world-system");

  // World bible internal references
  const factionIds = new Set(worldBible.factions.map((f) => f.id));
  const themeIds = new Set(worldBible.themes.map((t) => t.id));
  const worldIds = new Set([
    ...factionIds,
    ...themeIds,
    ...worldBible.regions.map((r) => r.id),
    ...worldBible.systems.map((s) => s.id),
  ]);
  const missingWorldRef = (source: { id: string; name: string }, sourceType: string, reference: string, location: string) =>
    errors.push({ type: "missing_world_ref", source: source.id, sourceName: source.name, sourceType, reference, location });
  for (const faction of worldBible.factions) {
    for (const id of faction.rivals) if (!factionIds.has(id)) missingWorldRef(faction, "world-faction", id, "rivals");
    for (const id of faction.allies) if (!factionIds.has(id)) missingWorldRef(faction, "world-faction", id, "allies");
  }
  for (const region of worldBible.regions) {
    for (const id of region.themes) if (!themeIds.has(id)) missingWorldRef(region, "world-region", id, "themes");
  }
  for (const event of worldBible.history) {
    for (const id of event.relatedEntities) {
      if (!worldIds.has(id)) missingWorldRef(event, "world-history", id, "relatedEntities");
    }
  }

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
    if (quest.giver?.zone_id && !tileIds.has(quest.giver.zone_id)) {
      errors.push({
        type: "missing_tile",
        source: quest.id,
        sourceName: quest.name,
        sourceType: "quest",
        reference: quest.giver.zone_id,
        location: "giver.zone_id",
      });
    }

    // Check completion NPC and zone
    if (quest.completion?.entity_id && !npcIds.has(quest.completion.entity_id)) {
      errors.push({
        type: "missing_npc",
        source: quest.id,
        sourceName: quest.name,
        sourceType: "quest",
        reference: quest.completion.entity_id,
        location: "completion.entity_id",
      });
    } else if (quest.completion?.entity_id) {
      referencedNpcs.add(quest.completion.entity_id);
    }
    if (quest.completion?.zone_id && !tileIds.has(quest.completion.zone_id)) {
      errors.push({
        type: "missing_tile",
        source: quest.id,
        sourceName: quest.name,
        sourceType: "quest",
        reference: quest.completion.zone_id,
        location: "completion.zone_id",
      });
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
    (quest.objectives || []).forEach((objective, idx) => {
      const obj = objective as {
        type: string;
        item_id?: string;
        resource_id?: string;
        entity_id?: string;
        zone_id?: string;
      };
      const location = `objectives[${idx}] (${obj.type})`;
      const missing = (type: ValidationError["type"], reference: string, field: string) =>
        errors.push({
          type,
          source: quest.id,
          sourceName: quest.name,
          sourceType: "quest",
          reference,
          location: `${location}.${field}`,
        });

      if (obj.item_id !== undefined) {
        if (!itemIds.has(obj.item_id)) missing("missing_item", obj.item_id, "item_id");
        else referencedItems.add(obj.item_id);
      }
      if (obj.resource_id !== undefined) {
        if (!resourceIds.has(obj.resource_id)) missing("missing_resource", obj.resource_id, "resource_id");
        else referencedResources.add(obj.resource_id);
      }
      if (obj.entity_id !== undefined) {
        if (!npcIds.has(obj.entity_id)) missing("missing_npc", obj.entity_id, "entity_id");
        else referencedNpcs.add(obj.entity_id);
      }
      if (obj.zone_id !== undefined && !tileIds.has(obj.zone_id)) {
        missing("missing_tile", obj.zone_id, "zone_id");
      }
    });

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

  // Players can't enter inaccessible tiles, so nothing may be placed on them or send the player there
  const inaccessibleTileIds = new Set(tiles.filter((t) => !t.accessible).map((t) => t.id));
  for (const tile of tiles) {
    if (!tile.accessible && (tile.resources || []).length > 0) {
      errors.push({
        type: "inaccessible_tile",
        source: tile.id,
        sourceName: tile.name,
        sourceType: "tile",
        reference: tile.id,
        location: "resources",
      });
    }
  }
  for (const quest of quests) {
    const zones: Array<[string | undefined, string]> = [
      [quest.giver?.zone_id, "giver.zone_id"],
      [quest.completion?.zone_id, "completion.zone_id"],
      ...(quest.objectives || []).map(
        (o, idx): [string | undefined, string] => [
          (o as { zone_id?: string }).zone_id,
          `objectives[${idx}] (${o.type}).zone_id`,
        ]
      ),
    ];
    for (const [zoneId, location] of zones) {
      if (zoneId && inaccessibleTileIds.has(zoneId)) {
        errors.push({
          type: "inaccessible_tile",
          source: quest.id,
          sourceName: quest.name,
          sourceType: "quest",
          reference: zoneId,
          location,
        });
      }
    }
  }

  // Check house tiles for missing references
  for (const [id, houseTile] of Object.entries(houseTiles)) {
    const missing = (type: ValidationError["type"], reference: string, location: string) =>
      errors.push({
        type,
        source: id,
        sourceName: houseTile.name,
        sourceType: "house-tile",
        reference,
        location,
      });

    for (const resourceId of houseTile.availableResources || []) {
      if (!resourceIds.has(resourceId)) missing("missing_resource", resourceId, "availableResources");
      else referencedResources.add(resourceId);
    }

    for (const action of houseTile.availableActions || []) {
      const where = `action "${action.name}"`;
      if (action.result?.resultingTileId && !houseTileIds.has(action.result.resultingTileId)) {
        missing("missing_house_tile", action.result.resultingTileId, `${where} result.resultingTileId`);
      }
      for (const adjacent of action.requirements?.prerequisites?.adjacentTiles || []) {
        if (!houseTileIds.has(adjacent)) {
          missing("missing_house_tile", adjacent, `${where} requirements.prerequisites.adjacentTiles`);
        }
      }
      const itemRefs = [
        ...(action.requirements?.requirements || []).map((r) => ({ r, field: "requirements.requirements" })),
        ...(action.result?.yields || []).map((r) => ({ r, field: "result.yields" })),
      ];
      for (const { r, field } of itemRefs) {
        if (r.type !== "item") continue;
        if (!itemIds.has(r.item_id)) missing("missing_item", r.item_id, `${where} ${field}`);
        else referencedItems.add(r.item_id);
      }
    }
  }

  // Check NPC relationships: entries are prose ("Name - why"), but any entry
  // written as a bare ID must point at a real NPC
  for (const npc of npcs) {
    for (const [category, entries] of Object.entries(npc.relationships || {})) {
      for (const entry of entries) {
        if (/^npc_[a-z0-9_]+$/.test(entry) && !npcIds.has(entry)) {
          errors.push({
            type: "missing_npc",
            source: npc.entity_id,
            sourceName: npc.name,
            sourceType: "npc",
            reference: entry,
            location: `relationships.${category}`,
          });
        }
      }
    }
  }

  // Quest objectives the player can't actually complete: an item nothing
  // produces, or a resource that isn't placed anywhere
  const questRewardItems = quests.flatMap((q) =>
    (q.rewards || []).flatMap((r) => (r.type === "item" ? [r.item_id] : []))
  );
  const producedItems = new Set<string>([
    ...resources.flatMap((r) => (r.reward_items || []).map((ri) => ri.item_id)),
    ...Object.values(houseTiles).flatMap((h) =>
      (h.availableActions || []).flatMap((a) =>
        (a.result?.yields || []).flatMap((y) => (y.type === "item" ? [y.item_id] : []))
      )
    ),
    ...questRewardItems,
  ]);
  const placedResources = new Set<string>([
    ...tiles.flatMap((t) => t.resources || []),
    ...Object.values(houseTiles).flatMap((h) => h.availableResources || []),
  ]);
  for (const quest of quests) {
    (quest.objectives || []).forEach((objective, idx) => {
      const where = `objectives[${idx}] (${objective.type})`;
      if (objective.type === "collect" && itemIds.has(objective.item_id) && !producedItems.has(objective.item_id)) {
        warnings.push({
          type: "unobtainable",
          entity: quest.id,
          entityName: quest.name,
          entityType: "quest",
          message: `${where}: no resource or house-tile action produces item "${objective.item_id}"`,
        });
      }
      if (
        (objective.type === "gather" || objective.type === "craft") &&
        resourceIds.has(objective.resource_id) &&
        !placedResources.has(objective.resource_id)
      ) {
        warnings.push({
          type: "unobtainable",
          entity: quest.id,
          entityName: quest.name,
          entityType: "quest",
          message: `${where}: resource "${objective.resource_id}" is not on any tile or house tile`,
        });
      }
      if (objective.type === "craft") {
        const station = resources.find((r) => r.id === objective.resource_id);
        if (station && station.type === "resource") {
          warnings.push({
            type: "unobtainable",
            entity: quest.id,
            entityName: quest.name,
            entityType: "quest",
            message: `${where}: "${objective.resource_id}" is a gathering resource, not a crafting station (workbench/furnace/magic)`,
          });
        }
      }
    });
  }

  // Items that are referenced somewhere but can never enter a player's
  // inventory. Unreferenced items are already reported as orphaned.
  for (const item of items) {
    if (referencedItems.has(item.id) && !producedItems.has(item.id)) {
      warnings.push({
        type: "unobtainable",
        entity: item.id,
        entityName: item.name,
        entityType: "item",
        message: "No resource, house-tile action or quest reward produces this item",
      });
    }
  }

  // Items the player can get but never do anything with
  const usedItems = new Set<string>([
    ...resources.flatMap((r) => (r.required_items || []).map((ri) => ri.item_id)),
    ...Object.values(houseTiles).flatMap((h) =>
      (h.availableActions || []).flatMap((a) =>
        (a.requirements?.requirements || []).flatMap((r) => (r.type === "item" ? [r.item_id] : []))
      )
    ),
    ...quests.flatMap((q) =>
      (q.objectives || []).flatMap((o) => (o.type === "collect" ? [o.item_id] : []))
    ),
  ]);
  for (const item of items) {
    const hasUse = usedItems.has(item.id) || item.equippable || (item.effects?.length ?? 0) > 0;
    if (referencedItems.has(item.id) && !hasUse) {
      warnings.push({
        type: "unused",
        entity: item.id,
        entityName: item.name,
        entityType: "item",
        message: "Item has no effects, isn't equippable, and isn't required by any resource, house-tile action or quest",
      });
    }
  }

  // Recipe reachability: starting from nothing, repeatedly unlock every placed
  // resource and house-tile action whose required items are already
  // obtainable. Anything still locked at the end needs an item that only comes
  // from itself (a dependency cycle) or from nowhere at all.
  const obtainable = new Set<string>(questRewardItems);
  const producers = [
    ...resources
      .filter((r) => placedResources.has(r.id))
      .map((r) => ({
        requires: (r.required_items || []).map((ri) => ri.item_id),
        yields: (r.reward_items || []).map((ri) => ri.item_id),
      })),
    ...Object.values(houseTiles).flatMap((h) =>
      (h.availableActions || []).map((a) => ({
        requires: (a.requirements?.requirements || []).flatMap((r) => (r.type === "item" ? [r.item_id] : [])),
        yields: (a.result?.yields || []).flatMap((y) => (y.type === "item" ? [y.item_id] : [])),
      }))
    ),
  ];
  for (let changed = true; changed; ) {
    changed = false;
    for (const producer of producers) {
      if (!producer.requires.every((id) => obtainable.has(id))) continue;
      for (const id of producer.yields) {
        if (!obtainable.has(id)) {
          obtainable.add(id);
          changed = true;
        }
      }
    }
  }
  for (const resource of resources) {
    if (!placedResources.has(resource.id)) continue;
    const locked = [...new Set((resource.required_items || []).map((ri) => ri.item_id))].filter(
      (id) => itemIds.has(id) && !obtainable.has(id)
    );
    if (locked.length === 0) continue;
    // Items nothing produces are reported on the item itself; only the ones
    // that do have a producer point at a cycle
    const cyclic = locked.filter((id) => producedItems.has(id));
    warnings.push({
      type: cyclic.length > 0 ? "circular_dependency" : "unobtainable",
      entity: resource.id,
      entityName: resource.name,
      entityType: "resource",
      message:
        cyclic.length > 0
          ? `Requires ${cyclic.join(", ")}, but every recipe producing it is locked behind a dependency cycle`
          : `Requires ${locked.join(", ")}, which nothing produces`,
    });
  }

  // Walkable tiles with nothing on them and no quest that sends the player there
  const questZones = new Set<string>(
    quests.flatMap((q) => [
      q.giver?.zone_id,
      q.completion?.zone_id,
      ...(q.objectives || []).map((o) => (o as { zone_id?: string }).zone_id),
    ]).filter((id): id is string => !!id)
  );
  for (const tile of tiles) {
    if (tile.accessible && (tile.resources || []).length === 0 && !questZones.has(tile.id)) {
      warnings.push({
        type: "unused",
        entity: tile.id,
        entityName: tile.name,
        entityType: "tile",
        message: "Accessible tile has no resources and no quest takes the player there",
      });
    }
  }

  // Tile rarity is a spawn weight in [0, 1]
  for (const tile of tiles) {
    if (tile.rarity < 0 || tile.rarity > 1) {
      warnings.push({
        type: "balance",
        entity: tile.id,
        entityName: tile.name,
        entityType: "tile",
        message: `rarity ${tile.rarity} is outside the 0-1 spawn-weight range used by other tiles`,
      });
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
    invalid_schema: "Invalid Schema",
    duplicate_id: "Duplicate ID",
    missing_world_ref: "Missing World Bible Reference",
    inaccessible_tile: "Inaccessible Tile",
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
    "world-bible": "world",
    "world-region": "world/regions",
    "world-faction": "world/factions",
    "world-history": "world/history",
    "world-theme": "world/themes",
    "world-system": "world/systems",
  };
  if (type === "world-bible") return "/world";
  return `/${typeToPath[type] || type}/${id}`;
}
