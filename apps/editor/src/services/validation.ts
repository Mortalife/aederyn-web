import type { ZodTypeAny } from "zod";
import {
  ItemSchema,
  ResourceModelSchema,
  TileSchema,
  MonsterSchema,
  EffectSchema,
  NPCSchema,
  QuestSchema,
  questNpcReferences,
  HouseTileSchema,
  WorldBibleSchema,
  MapDataSchema,
  inBounds,
  landmarkAt,
  regionAt,
  tileIdAt,
  poolIds,
  poolThings,
} from "@aederyn/types";
import { repository } from "../repository/index.js";

export interface ValidationError {
  type:
    | "missing_item"
    | "missing_resource"
    | "missing_npc"
    | "missing_tile"
    | "missing_monster"
    | "missing_effect"
    | "missing_quest"
    | "missing_house_tile"
    | "missing_landmark"
    | "missing_region"
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
  const [items, resources, tiles, monsters, effects, npcs, quests, houseTiles, worldBible, map] = await Promise.all([
    repository.items.getAll(),
    repository.resources.getAll(),
    repository.tiles.getAll(),
    repository.monsters.getAll(),
    repository.effects.getAll(),
    repository.npcs.getAll(),
    repository.quests.getAll(),
    repository.houseTiles.getAll(),
    repository.worldBible.get(),
    repository.map.get(),
  ]);

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Build lookup sets for quick reference checking
  const itemIds = new Set(items.map((i) => i.id));
  const resourceIds = new Set(resources.map((r) => r.id));
  const tileIds = new Set(tiles.map((t) => t.id));
  const monsterIds = new Set(monsters.map((m) => m.id));
  const effectsById = new Map(effects.map((e) => [e.id, e]));
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
  checkSchema(monsters.map((m) => ({ id: m.id, name: m.name, data: m })), MonsterSchema, "monster");
  checkSchema(effects.map((e) => ({ id: e.id, name: e.name, data: e })), EffectSchema, "effect");
  checkSchema(npcs.map((n) => ({ id: n.entity_id, name: n.name, data: n })), NPCSchema, "npc");
  checkSchema(
    quests.map((q) => ({ id: q.id, name: q.name, data: q })),
    QuestSchema,
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

  // Combat stats: weapons attack from the main hand, and defence only counts while worn
  for (const item of items) {
    const invalid = (reference: string, location: string) =>
      errors.push({ type: "invalid_schema", source: item.id, sourceName: item.name, sourceType: "item", reference, location });

    if (item.type === "weapon" && !item.weapon) invalid("weapons need weapon stats", "weapon");
    if (item.weapon && item.type !== "weapon") invalid('only items of type "weapon" can have weapon stats', "type");
    if (item.weapon && item.equipSlot !== "mainHand") invalid('weapons must equip to "mainHand"', "equipSlot");
    if (item.defence && !item.equippable) invalid("defence only applies to equippable items", "defence");
  }

  // Effects: every reference must exist, and each list must make sense for the effect's kind
  const usedEffects = new Set<string>();
  const effectRef = (
    source: { id: string; name: string },
    sourceType: string,
    effectId: string,
    location: string
  ) => {
    const effect = effectsById.get(effectId);
    if (!effect) {
      errors.push({ type: "missing_effect", source: source.id, sourceName: source.name, sourceType, reference: effectId, location });
    } else {
      usedEffects.add(effectId);
    }
    return effect;
  };
  for (const tile of tiles) {
    poolThings(tile.effects).forEach((e) => effectRef(tile, "tile", e.id, "effects"));
  }
  for (const region of map.regions) {
    region.effects.forEach((e, idx) =>
      effectRef({ id: region.id, name: `Region ${region.id}` }, "map", e.id, `regions.${region.id}.effects[${idx}]`)
    );
  }
  for (const item of items) {
    const invalid = (reference: string, location: string) =>
      errors.push({ type: "invalid_schema", source: item.id, sourceName: item.name, sourceType: "item", reference, location });
    (item.effects || []).forEach((e, idx) => {
      const effect = effectRef(item, "item", e.id, `effects[${idx}]`);
      if (effect && e.duration === 0 && effect.kind !== "health") {
        invalid(`only health effects can be instant (duration 0); "${effect.id}" is ${effect.kind}`, `effects[${idx}].duration`);
      }
    });
    (item.wornEffects || []).forEach((e, idx) => effectRef(item, "item", e.id, `wornEffects[${idx}]`));
    if ((item.wornEffects || []).length > 0 && !item.equippable) {
      invalid("worn effects only apply to equippable items", "wornEffects");
    }
  }
  for (const effect of effects) {
    if (effect.kind !== "protects") continue;
    const invalid = (reference: string, location: string) =>
      errors.push({ type: "invalid_schema", source: effect.id, sourceName: effect.name, sourceType: "effect", reference, location });
    const target = effectsById.get(effect.target);
    if (!target) {
      errors.push({ type: "missing_effect", source: effect.id, sourceName: effect.name, sourceType: "effect", reference: effect.target, location: "target" });
    } else if (target.kind === "protects") {
      invalid("a protects effect can't target another protects effect", "target");
    }
    if (effect.mode !== "none") {
      invalid('protects effects are protection themselves, so their mode must be "none"', "mode");
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
  checkDuplicates(monsters, "monster");
  checkDuplicates(effects, "effect");
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

  // The map: bounds, regions, landmarks, and NPC homes on landmarks
  checkSchema([{ id: "map", name: "Map", data: map }], MapDataSchema, "map");
  const mapError = (source: string, reference: string, location: string, type: ValidationError["type"] = "invalid_schema") =>
    errors.push({ type, source, sourceName: source === "map" ? "Map" : source, sourceType: "map", reference, location });
  const tilesById = new Map(tiles.map((t) => [t.id, t]));
  const bounds = map.bounds;
  const boundsLabel = bounds ? `${bounds.minX}..${bounds.maxX}, ${bounds.minY}..${bounds.maxY}` : "";
  const inMap = (x: number, y: number) => !bounds || inBounds(bounds, x, y);
  checkDuplicates((map.regions || []).map((r) => ({ id: r.id, name: `Region ${r.id}` })), "map");
  checkDuplicates((map.landmarks || []).map((l) => ({ id: l.id, name: `Landmark ${l.id}` })), "map");
  if ((map.regions || []).length === 0) {
    mapError("map", "the map needs at least one region to fill its cells", "regions");
  }
  for (const region of map.regions || []) {
    (region.anchors || []).forEach((anchor, idx) => {
      if (!inMap(anchor.x, anchor.y)) {
        mapError(region.id, `anchor ${anchor.x},${anchor.y} is outside the bounds (${boundsLabel})`, `anchors[${idx}]`);
      }
    });
    (region.tiles || []).forEach((t, idx) => {
      const tile = tilesById.get(t.id);
      if (!tile) mapError(region.id, t.id, `tiles[${idx}]`, "missing_tile");
      if (!(t.weight > 0)) mapError(region.id, `weight ${t.weight} must be greater than 0`, `tiles[${idx}].weight`);
    });
  }
  // Regions join the bible's lore to the map's structure by ID, both ways
  const bibleRegionIds = new Set(worldBible.regions.map((r) => r.id));
  const mapRegionIds = new Set((map.regions || []).map((r) => r.id));
  for (const region of map.regions || []) {
    if (!bibleRegionIds.has(region.id)) {
      errors.push({ type: "missing_world_ref", source: region.id, sourceName: `Region ${region.id}`, sourceType: "map", reference: region.id, location: "world bible regions" });
    }
  }
  for (const region of worldBible.regions) {
    if (!mapRegionIds.has(region.id)) {
      errors.push({ type: "missing_region", source: region.id, sourceName: region.name, sourceType: "world-region", reference: region.id, location: "map regions" });
    }
  }
  const landmarkIds = new Set((map.landmarks || []).map((l) => l.id));
  const landmarkCells = new Map<string, string>();
  for (const landmark of map.landmarks || []) {
    const tile = tilesById.get(landmark.tile);
    if (!tile) mapError(landmark.id, landmark.tile, "tile", "missing_tile");
    if (!inMap(landmark.x, landmark.y)) {
      mapError(landmark.id, `${landmark.x},${landmark.y} is outside the bounds (${boundsLabel})`, "x,y");
    }
    const cell = `${landmark.x},${landmark.y}`;
    const other = landmarkCells.get(cell);
    if (other) mapError(landmark.id, `shares ${cell} with ${other}`, "x,y");
    landmarkCells.set(cell, landmark.id);
    if (landmark.spawn && tile && !tile.accessible) {
      mapError(landmark.id, landmark.tile, "tile", "inaccessible_tile");
    }
  }
  const spawns = (map.landmarks || []).filter((l) => l.spawn);
  if (spawns.length !== 1) {
    mapError(
      "map",
      `exactly one landmark must be the spawn; found ${spawns.length}${spawns.length ? ` (${spawns.map((l) => l.id).join(", ")})` : ""}`,
      "landmarks"
    );
  }
  const bibleFactionIds = new Set(worldBible.factions.map((f) => f.id));
  for (const npc of npcs) {
    if (npc.home && !landmarkIds.has(npc.home)) {
      errors.push({ type: "missing_landmark", source: npc.entity_id, sourceName: npc.name, sourceType: "npc", reference: npc.home, location: "home" });
    }
    if (npc.faction && !bibleFactionIds.has(npc.faction)) {
      missingWorldRef({ id: npc.entity_id, name: npc.name }, "npc", npc.faction, "faction");
    }
  }
  const tilesOnMap = new Set<string>([
    ...(map.regions || []).flatMap((r) => (r.tiles || []).map((t) => t.id)),
    ...(map.landmarks || []).map((l) => l.tile),
  ]);

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
    for (const resourceId of poolIds(tile.resources)) {
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

  // Check tiles for missing monster references, and monsters for missing drops
  const placedMonsters = new Set<string>();
  for (const tile of tiles) {
    for (const monsterId of poolIds(tile.monsters)) {
      if (!monsterIds.has(monsterId)) {
        errors.push({
          type: "missing_monster",
          source: tile.id,
          sourceName: tile.name,
          sourceType: "tile",
          reference: monsterId,
          location: "monsters",
        });
      } else {
        placedMonsters.add(monsterId);
      }
    }
  }
  for (const monster of monsters) {
    for (const drop of monster.drops || []) {
      if (!itemIds.has(drop.item_id)) {
        errors.push({
          type: "missing_item",
          source: monster.id,
          sourceName: monster.name,
          sourceType: "monster",
          reference: drop.item_id,
          location: "drops",
        });
      } else {
        referencedItems.add(drop.item_id);
      }
    }
  }

  // Check quests for missing references. NPCs are met at their home unless a
  // reference names a landmark, and region-scoped objectives need a region.
  const npcsById = new Map(npcs.map((n) => [n.entity_id, n]));
  const regionsById = new Map((map.regions || []).map((r) => [r.id, r]));
  const landmarksById = new Map((map.landmarks || []).map((l) => [l.id, l]));
  const questLandmarks: Array<{ quest: (typeof quests)[number]; landmark: string; location: string }> = [];
  // Which tiles actually show on each region's non-landmark cells
  const regionCellTiles = new Map<string, Set<string>>();
  if (map.bounds) {
    for (let y = map.bounds.minY; y <= map.bounds.maxY; y++) {
      for (let x = map.bounds.minX; x <= map.bounds.maxX; x++) {
        if (landmarkAt(map, x, y)) continue;
        const region = regionAt(map, x, y);
        const tile = tileIdAt(map, x, y);
        if (!region || !tile) continue;
        if (!regionCellTiles.has(region.id)) regionCellTiles.set(region.id, new Set());
        regionCellTiles.get(region.id)!.add(tile);
      }
    }
  }
  for (const quest of quests) {
    const questError = (type: ValidationError["type"], reference: string, location: string) =>
      errors.push({ type, source: quest.id, sourceName: quest.name, sourceType: "quest", reference, location });
    const checkLandmark = (id: string | undefined, location: string) => {
      if (id === undefined) return;
      if (!landmarkIds.has(id)) questError("missing_landmark", id, location);
      else questLandmarks.push({ quest, landmark: id, location });
    };

    for (const { ref, location } of questNpcReferences(quest)) {
      const npc = npcsById.get(ref.entity_id);
      if (!npc) {
        questError("missing_npc", ref.entity_id, `${location}.entity_id`);
        continue;
      }
      referencedNpcs.add(ref.entity_id);
      if (ref.landmark !== undefined) {
        checkLandmark(ref.landmark, `${location}.landmark`);
      } else if (!npc.home) {
        questError(
          "missing_landmark",
          `${ref.entity_id} has no home: give them one, or name a landmark here`,
          `${location}.landmark`
        );
      } else {
        questLandmarks.push({ quest, landmark: npc.home, location: `${location} (home)` });
      }
    }
    if (quest.kind === "contract") checkLandmark(quest.board, "board");

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
        monster_id?: string;
        landmark?: string;
        region?: string;
        tile?: string;
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
      if (obj.monster_id !== undefined && !monsterIds.has(obj.monster_id)) {
        missing("missing_monster", obj.monster_id, "monster_id");
      }
      if (obj.type === "explore") checkLandmark(obj.landmark, `${location}.landmark`);
      if (obj.region !== undefined && !regionsById.has(obj.region)) {
        missing("missing_region", obj.region, "region");
      }
      if (obj.tile !== undefined) {
        if (!tileIds.has(obj.tile)) missing("missing_tile", obj.tile, "tile");
        else if (obj.region && regionsById.has(obj.region) && !regionCellTiles.get(obj.region)?.has(obj.tile)) {
          missing("missing_tile", `${obj.tile} (no cell of region ${obj.region} shows it)`, "tile");
        }
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

    // Exclusions must name other story quests, and be mutual
    for (const excluded of quest.kind === "story" ? quest.excludes || [] : []) {
      const other = quests.find((q) => q.id === excluded);
      const problem = !other
        ? excluded
        : other.kind !== "story" || other.id === quest.id
          ? `${excluded} (not another story quest)`
          : !(other.excludes || []).includes(quest.id)
            ? `${excluded} (doesn't exclude ${quest.id} back)`
            : null;
      if (problem) {
        errors.push({
          type: "missing_quest",
          source: quest.id,
          sourceName: quest.name,
          sourceType: "quest",
          reference: problem,
          location: "excludes",
        });
      } else {
        referencedQuests.add(excluded);
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
    if (!tile.accessible && (tile.monsters || []).length > 0) {
      errors.push({
        type: "inaccessible_tile",
        source: tile.id,
        sourceName: tile.name,
        sourceType: "tile",
        reference: tile.id,
        location: "monsters",
      });
    }
  }
  for (const { quest, landmark, location } of questLandmarks) {
    const tileId = landmarksById.get(landmark)?.tile;
    if (tileId && inaccessibleTileIds.has(tileId)) {
      errors.push({
        type: "inaccessible_tile",
        source: quest.id,
        sourceName: quest.name,
        sourceType: "quest",
        reference: `${landmark} (${tileId})`,
        location,
      });
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
    ...monsters.flatMap((m) => (m.drops || []).map((d) => d.item_id)),
  ]);
  const placedResources = new Set<string>([
    ...tiles.flatMap((t) => poolIds(t.resources)),
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
      if ((objective.type === "gather" || objective.type === "kill") && objective.region && regionsById.has(objective.region)) {
        const target = objective.type === "gather" ? objective.resource_id : objective.monster_id;
        const hosted = [...(regionCellTiles.get(objective.region) ?? [])].some((tileId) => {
          const tile = tilesById.get(tileId);
          return !!tile && poolIds(objective.type === "gather" ? tile.resources : tile.monsters).includes(target);
        });
        if (!hosted) {
          warnings.push({
            type: "unobtainable",
            entity: quest.id,
            entityName: quest.name,
            entityType: "quest",
            message: `${where}: no tile in region "${objective.region}" has "${target}"`,
          });
        }
      }
      if (objective.type === "craft") {
        const station = resources.find((r) => r.id === objective.resource_id);
        if (station && station.type === "resource") {
          warnings.push({
            type: "unobtainable",
            entity: quest.id,
            entityName: quest.name,
            entityType: "quest",
            message: `${where}: "${objective.resource_id}" is a gathering resource, not a crafting station`,
          });
        }
      }
      if (
        objective.type === "kill" &&
        monsterIds.has(objective.monster_id) &&
        !placedMonsters.has(objective.monster_id)
      ) {
        warnings.push({
          type: "unobtainable",
          entity: quest.id,
          entityName: quest.name,
          entityType: "quest",
          message: `${where}: monster "${objective.monster_id}" is not on any tile`,
        });
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
        message: "No resource, house-tile action, monster drop or quest reward produces this item",
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
  // Any placed monster can be fought barehanded, so its drops are obtainable
  const monsterProducers = monsters
    .filter((m) => placedMonsters.has(m.id))
    .map((m) => ({ yields: (m.drops || []).map((d) => d.item_id) }));
  for (let changed = true; changed; ) {
    changed = false;
    for (const producer of monsterProducers) {
      for (const id of producer.yields) {
        if (!obtainable.has(id)) {
          obtainable.add(id);
          changed = true;
        }
      }
    }
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

  // Walkable tiles with nothing on them, nobody living there, and no quest that sends the player there
  const questZones = new Set<string>([
    ...questLandmarks.flatMap(({ landmark }) => landmarksById.get(landmark)?.tile ?? []),
    ...npcs.flatMap((n) => (n.home ? landmarksById.get(n.home)?.tile ?? [] : [])),
    ...quests.flatMap((q) =>
      (q.objectives || []).flatMap((o) => (o.type === "explore" && o.tile ? [o.tile] : []))
    ),
  ]);
  for (const tile of tiles) {
    if (
      tile.accessible &&
      (tile.resources || []).length === 0 &&
      (tile.monsters || []).length === 0 &&
      !questZones.has(tile.id)
    ) {
      warnings.push({
        type: "unused",
        entity: tile.id,
        entityName: tile.name,
        entityType: "tile",
        message: "Accessible tile has no resources, monsters or residents, and no quest takes the player there",
      });
    }
  }

  for (const tile of tiles) {
    if (tile.accessible && !tilesOnMap.has(tile.id)) {
      warnings.push({
        type: "orphaned",
        entity: tile.id,
        entityName: tile.name,
        entityType: "tile",
        message: "Tile is not in any map region or landmark, so it never appears",
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
        message: "Item is not referenced by any resource, monster, quest, or house tile",
      });
    }
  }

  const protectedEffects = new Set(
    effects.flatMap((e) => (e.kind === "protects" && usedEffects.has(e.id) ? [e.target] : []))
  );
  for (const effect of effects) {
    if (!usedEffects.has(effect.id)) {
      warnings.push({
        type: "orphaned",
        entity: effect.id,
        entityName: effect.name,
        entityType: "effect",
        message: "Effect is not on any tile or item",
      });
    }
    if (effect.kind === "blocks" && effect.mode === "mitigation") {
      warnings.push({
        type: "balance",
        entity: effect.id,
        entityName: effect.name,
        entityType: "effect",
        message: "Mitigation never reaches zero, so protection can't lift a blocks effect; use binary",
      });
    }
    if (effect.mode !== "none" && effect.kind !== "protects" && usedEffects.has(effect.id) && !protectedEffects.has(effect.id)) {
      warnings.push({
        type: "unobtainable",
        entity: effect.id,
        entityName: effect.name,
        entityType: "effect",
        message: "Nothing on a tile or item protects against this effect",
      });
    }
  }

  for (const monster of monsters) {
    if (!placedMonsters.has(monster.id)) {
      warnings.push({
        type: "orphaned",
        entity: monster.id,
        entityName: monster.name,
        entityType: "monster",
        message: "Monster is not found on any tile",
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
    if (!referencedNpcs.has(npc.entity_id) && !npc.home) {
      warnings.push({
        type: "orphaned",
        entity: npc.entity_id,
        entityName: npc.name,
        entityType: "npc",
        message: "NPC has no home and is not a quest giver for any quest",
      });
    }
  }

  // Step 35: Duplicate ID Detection (check for similar IDs)
  const allIds = [
    ...items.map((i) => ({ id: i.id, name: i.name, type: "item" })),
    ...resources.map((r) => ({ id: r.id, name: r.name, type: "resource" })),
    ...tiles.map((t) => ({ id: t.id, name: t.name, type: "tile" })),
    ...monsters.map((m) => ({ id: m.id, name: m.name, type: "monster" })),
    ...effects.map((e) => ({ id: e.id, name: e.name, type: "effect" })),
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
  const totalEntities = items.length + resources.length + tiles.length + monsters.length + npcs.length + quests.length + Object.keys(houseTiles).length;
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
    missing_monster: "Missing Monster",
    missing_effect: "Missing Effect",
    missing_quest: "Missing Quest",
    missing_house_tile: "Missing House Tile",
    missing_landmark: "Missing Landmark",
    missing_region: "Missing Region",
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
    effect: "effects",
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
  if (type === "map") return "/map";
  return `/${typeToPath[type] || type}/${id}`;
}
