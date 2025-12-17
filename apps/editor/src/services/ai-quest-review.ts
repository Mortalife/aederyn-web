import type {
  QuestOutlay,
  EntityPlan,
  GeneratedEntities,
  PlannedNPC,
  PlannedItem,
  PlannedLocation,
  ReviewAction,
} from "./ai-quest-schemas.js";

// ============================================================================
// Review Gate Types
// ============================================================================

export interface OutlayReviewData {
  questId: string;
  outlay: QuestOutlay;
  wordCount: number;
  detectedThemes: string[];
  detectedFactions: string[];
  detectedRegions: string[];
}

export interface EntityPlanReviewData {
  questId: string;
  entityPlan: EntityPlan;
  existingMatches: {
    npcs: Array<{
      planned: { tempId: string; suggestedName?: string; narrativeFunction: string };
      existing: { entity_id: string; name: string };
      matchScore: number;
      matchReason: string;
    }>;
    items: Array<{
      planned: { tempId: string; suggestedName?: string; narrativeFunction: string };
      existing: { id: string; name: string; type: string };
      matchScore: number;
      matchReason: string;
    }>;
    locations: Array<{
      planned: { tempId: string; suggestedName?: string; narrativeFunction: string };
      existing: { id: string; name: string; theme: string };
      matchScore: number;
      matchReason: string;
    }>;
  };
  summary: {
    npcCount: number;
    itemCount: number;
    locationCount: number;
    objectiveCount: number;
  };
}

export interface EntityReviewData {
  questId: string;
  entities: GeneratedEntities;
  validationIssues: Array<{
    type: "error" | "warning";
    entityType: string;
    entityId: string;
    message: string;
  }>;
  summary: {
    itemsGenerated: number;
    npcsGenerated: number;
    locationsGenerated: number;
    errorsCount: number;
    warningsCount: number;
  };
}

// ============================================================================
// Review Data Builders
// ============================================================================

export function buildOutlayReviewData(
  questId: string,
  outlay: QuestOutlay,
  worldBible: { themes: Array<{ id: string; name: string }>; factions: Array<{ id: string; name: string }>; regions: Array<{ id: string; name: string }> }
): OutlayReviewData {
  const fullText = [
    outlay.questHook,
    outlay.backgroundContext,
    outlay.coreConflict,
    outlay.keyCharacters,
    outlay.stakesConsequences,
    outlay.thematicConnections,
    outlay.regionalIntegration,
    outlay.factionInvolvement,
  ].join(" ");

  const wordCount = fullText.split(/\s+/).length;

  // Detect themes mentioned in the outlay
  const detectedThemes = worldBible.themes
    .filter((t) => fullText.toLowerCase().includes(t.name.toLowerCase()))
    .map((t) => t.id);

  // Detect factions mentioned
  const detectedFactions = worldBible.factions
    .filter((f) => fullText.toLowerCase().includes(f.name.toLowerCase()))
    .map((f) => f.id);

  // Detect regions mentioned
  const detectedRegions = worldBible.regions
    .filter((r) => fullText.toLowerCase().includes(r.name.toLowerCase()))
    .map((r) => r.id);

  return {
    questId,
    outlay,
    wordCount,
    detectedThemes,
    detectedFactions,
    detectedRegions,
  };
}

export function buildEntityPlanReviewData(
  questId: string,
  entityPlan: EntityPlan,
  existingMatches: EntityPlanReviewData["existingMatches"]
): EntityPlanReviewData {
  return {
    questId,
    entityPlan,
    existingMatches,
    summary: {
      npcCount: entityPlan.npcs.length,
      itemCount: entityPlan.items.length,
      locationCount: entityPlan.locations.length,
      objectiveCount: entityPlan.objectives.length,
    },
  };
}

export function buildEntityReviewData(
  questId: string,
  entities: GeneratedEntities,
  validationIssues: EntityReviewData["validationIssues"]
): EntityReviewData {
  return {
    questId,
    entities,
    validationIssues,
    summary: {
      itemsGenerated: entities.items.length,
      npcsGenerated: entities.npcs.length,
      locationsGenerated: entities.locations.length,
      errorsCount: validationIssues.filter((i) => i.type === "error").length,
      warningsCount: validationIssues.filter((i) => i.type === "warning").length,
    },
  };
}

// ============================================================================
// Review Edit Handlers
// ============================================================================

export interface OutlayEdits {
  questHook?: string;
  backgroundContext?: string;
  coreConflict?: string;
  keyCharacters?: string;
  stakesConsequences?: string;
  thematicConnections?: string;
  regionalIntegration?: string;
  factionInvolvement?: string;
}

export function applyOutlayEdits(outlay: QuestOutlay, edits: OutlayEdits): QuestOutlay {
  return {
    questHook: edits.questHook ?? outlay.questHook,
    backgroundContext: edits.backgroundContext ?? outlay.backgroundContext,
    coreConflict: edits.coreConflict ?? outlay.coreConflict,
    keyCharacters: edits.keyCharacters ?? outlay.keyCharacters,
    stakesConsequences: edits.stakesConsequences ?? outlay.stakesConsequences,
    thematicConnections: edits.thematicConnections ?? outlay.thematicConnections,
    regionalIntegration: edits.regionalIntegration ?? outlay.regionalIntegration,
    factionInvolvement: edits.factionInvolvement ?? outlay.factionInvolvement,
  };
}

export interface EntityPlanEdits {
  npcs?: {
    add?: PlannedNPC[];
    remove?: string[]; // tempIds to remove
    update?: Array<{ tempId: string; updates: Partial<PlannedNPC> }>;
    useExisting?: Array<{ tempId: string; existingId: string }>;
  };
  items?: {
    add?: PlannedItem[];
    remove?: string[];
    update?: Array<{ tempId: string; updates: Partial<PlannedItem> }>;
    useExisting?: Array<{ tempId: string; existingId: string }>;
  };
  locations?: {
    add?: PlannedLocation[];
    remove?: string[];
    update?: Array<{ tempId: string; updates: Partial<PlannedLocation> }>;
    useExisting?: Array<{ tempId: string; existingId: string }>;
  };
}

export function applyEntityPlanEdits(plan: EntityPlan, edits: EntityPlanEdits): EntityPlan {
  let npcs = [...plan.npcs];
  let items = [...plan.items];
  let locations = [...plan.locations];

  // Apply NPC edits
  if (edits.npcs) {
    if (edits.npcs.remove) {
      npcs = npcs.filter((n) => !edits.npcs!.remove!.includes(n.tempId));
    }
    if (edits.npcs.add) {
      npcs = [...npcs, ...edits.npcs.add];
    }
    if (edits.npcs.update) {
      for (const { tempId, updates } of edits.npcs.update) {
        const idx = npcs.findIndex((n) => n.tempId === tempId);
        if (idx >= 0) {
          npcs[idx] = { ...npcs[idx], ...updates };
        }
      }
    }
    if (edits.npcs.useExisting) {
      for (const { tempId, existingId } of edits.npcs.useExisting) {
        const idx = npcs.findIndex((n) => n.tempId === tempId);
        if (idx >= 0) {
          npcs[idx] = { ...npcs[idx], useExistingId: existingId };
        }
      }
    }
  }

  // Apply item edits
  if (edits.items) {
    if (edits.items.remove) {
      items = items.filter((i) => !edits.items!.remove!.includes(i.tempId));
    }
    if (edits.items.add) {
      items = [...items, ...edits.items.add];
    }
    if (edits.items.update) {
      for (const { tempId, updates } of edits.items.update) {
        const idx = items.findIndex((i) => i.tempId === tempId);
        if (idx >= 0) {
          items[idx] = { ...items[idx], ...updates };
        }
      }
    }
    if (edits.items.useExisting) {
      for (const { tempId, existingId } of edits.items.useExisting) {
        const idx = items.findIndex((i) => i.tempId === tempId);
        if (idx >= 0) {
          items[idx] = { ...items[idx], useExistingId: existingId };
        }
      }
    }
  }

  // Apply location edits
  if (edits.locations) {
    if (edits.locations.remove) {
      locations = locations.filter((l) => !edits.locations!.remove!.includes(l.tempId));
    }
    if (edits.locations.add) {
      locations = [...locations, ...edits.locations.add];
    }
    if (edits.locations.update) {
      for (const { tempId, updates } of edits.locations.update) {
        const idx = locations.findIndex((l) => l.tempId === tempId);
        if (idx >= 0) {
          locations[idx] = { ...locations[idx], ...updates };
        }
      }
    }
    if (edits.locations.useExisting) {
      for (const { tempId, existingId } of edits.locations.useExisting) {
        const idx = locations.findIndex((l) => l.tempId === tempId);
        if (idx >= 0) {
          locations[idx] = { ...locations[idx], useExistingId: existingId };
        }
      }
    }
  }

  return {
    ...plan,
    npcs,
    items,
    locations,
  };
}

export interface EntityEdits {
  items?: Array<{
    tempId: string;
    updates: Partial<{
      name: string;
      description: string;
      type: string;
      rarity: string;
      value: number;
      weight: number;
    }>;
  }>;
  npcs?: Array<{
    tempId: string;
    updates: Partial<{
      name: string;
      backstory: string;
      personalMission: string;
      hopes: string;
      fears: string;
    }>;
  }>;
  locations?: Array<{
    tempId: string;
    updates: Partial<{
      name: string;
      description: string;
      color: string;
      backgroundColor: string;
      theme: string;
    }>;
  }>;
  regenerate?: Array<{
    entityType: "item" | "npc" | "location";
    tempId: string;
  }>;
}

export function applyEntityEdits(entities: GeneratedEntities, edits: EntityEdits): GeneratedEntities {
  let items = [...entities.items];
  let npcs = [...entities.npcs];
  let locations = [...entities.locations];

  if (edits.items) {
    for (const { tempId, updates } of edits.items) {
      const idx = items.findIndex((i) => i.tempId === tempId);
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...updates } as typeof items[0];
      }
    }
  }

  if (edits.npcs) {
    for (const { tempId, updates } of edits.npcs) {
      const idx = npcs.findIndex((n) => n.tempId === tempId);
      if (idx >= 0) {
        npcs[idx] = { ...npcs[idx], ...updates } as typeof npcs[0];
      }
    }
  }

  if (edits.locations) {
    for (const { tempId, updates } of edits.locations) {
      const idx = locations.findIndex((l) => l.tempId === tempId);
      if (idx >= 0) {
        locations[idx] = { ...locations[idx], ...updates } as typeof locations[0];
      }
    }
  }

  return { items, npcs, locations };
}

// ============================================================================
// Review Action Handlers
// ============================================================================

export type ReviewResult =
  | { action: "continue" }
  | { action: "regenerate"; step: "outlay" | "entity_plan" | "entities" }
  | { action: "cancel" }
  | { action: "edit"; data: unknown };

export function processReviewAction(
  action: ReviewAction,
  reviewType: "outlay" | "entity_plan" | "entities",
  edits?: unknown
): ReviewResult {
  switch (action) {
    case "approve":
      return { action: "continue" };
    case "regenerate":
      return { action: "regenerate", step: reviewType };
    case "cancel":
      return { action: "cancel" };
    case "edit":
      return { action: "edit", data: edits };
    default:
      return { action: "continue" };
  }
}
