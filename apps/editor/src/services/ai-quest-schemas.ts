import { z } from "zod";

// ============================================================================
// Quest Generation State Schemas
// ============================================================================

export const GenerationStepStatusSchema = z.enum([
  "pending",
  "running",
  "awaiting_review",
  "completed",
  "failed",
  "skipped",
]);

export const GenerationStepStateSchema = z.object({
  name: z.string(),
  status: GenerationStepStatusSchema,
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  error: z.string().optional(),
});

export const QuestGenerationStatusSchema = z.enum([
  "idle",
  "running",
  "awaiting_review",
  "completed",
  "failed",
  "cancelled",
]);

export const PendingReviewSchema = z.object({
  type: z.enum(["outlay", "entity_plan", "entities"]),
  data: z.unknown(),
  requestedAt: z.string(),
});

// ============================================================================
// Quest Outlay Schemas (Phase 1)
// ============================================================================

export const QuestOutlaySchema = z.object({
  questHook: z.string().describe("What draws the player in? The inciting incident (100-150 words)"),
  backgroundContext: z.string().describe("How this quest fits into the world, relevant history/lore (100-150 words)"),
  coreConflict: z.string().describe("The central problem or challenge (100-150 words)"),
  keyCharacters: z.string().describe("Major players described narratively (100-150 words)"),
  stakesConsequences: z.string().describe("What happens if player succeeds or fails (75-100 words)"),
  thematicConnections: z.string().describe("How this quest reinforces world themes (50-75 words)"),
  regionalIntegration: z.string().describe("Where this takes place, connections to other areas (50-75 words)"),
  factionInvolvement: z.string().describe("Which factions are affected or involved (50-75 words)"),
});

// ============================================================================
// Entity Planning Schemas (Phase 2)
// ============================================================================

export const NPCRoleSchema = z.enum([
  "quest_giver",
  "ally",
  "antagonist",
  "merchant",
  "informant",
  "victim",
  "boss",
  "minion",
  "bystander",
]);

export const NPCImportanceSchema = z.enum(["critical", "supporting", "minor"]);

export const DialogueNeedSchema = z.object({
  trigger: z.string().describe("When this dialogue occurs"),
  purpose: z.string().describe("What it accomplishes"),
  mustReveal: z.array(z.string()).optional().describe("Information they must convey"),
});

export const PlannedNPCSchema = z.object({
  tempId: z.string().describe("Temporary ID until generated"),
  source: z.enum(["outlay", "user_added"]).describe("Where this came from"),
  outlayReference: z.string().optional().describe("Quote from outlay mentioning this NPC"),
  role: NPCRoleSchema.describe("NPC's role in the quest"),
  importance: NPCImportanceSchema.describe("How critical to the quest"),
  suggestedName: z.string().optional().describe("From outlay or naming conventions"),
  suggestedFaction: z.string().optional().describe("Faction ID"),
  suggestedLocation: z.string().optional().describe("Planned location tempId"),
  narrativeFunction: z.string().describe("What they do in the story"),
  dialogueNeeds: z.array(DialogueNeedSchema).describe("Required dialogue interactions"),
  relatedNpcs: z.array(z.object({
    tempId: z.string(),
    relationship: z.string().describe("e.g., enemy_of, servant_of, sibling"),
  })).describe("Relationships to other planned NPCs"),
  givesItems: z.array(z.string()).describe("Planned item tempIds this NPC gives"),
  wantsItems: z.array(z.string()).describe("Planned item tempIds this NPC wants"),
  dropsItems: z.array(z.string()).describe("Planned item tempIds if defeated"),
  useExistingId: z.string().optional().describe("If user chose to reuse existing NPC"),
  generationNotes: z.string().optional().describe("User notes for generation"),
});

export const ItemCategorySchema = z.enum([
  "quest_item",
  "reward",
  "key",
  "consumable",
  "equipment",
  "material",
  "currency",
]);

export const ItemImportanceSchema = z.enum(["critical", "optional", "bonus"]);

export const ObtainMethodSchema = z.enum([
  "given",
  "found",
  "crafted",
  "looted",
  "purchased",
  "quest_reward",
]);

export const PlannedItemSchema = z.object({
  tempId: z.string().describe("Temporary ID until generated"),
  source: z.enum(["outlay", "user_added"]).describe("Where this came from"),
  outlayReference: z.string().optional().describe("Quote from outlay mentioning this item"),
  category: ItemCategorySchema.describe("Item classification"),
  importance: ItemImportanceSchema.describe("How critical to the quest"),
  suggestedName: z.string().optional().describe("Suggested item name"),
  suggestedRarity: z.enum(["common", "uncommon", "rare", "epic", "legendary"]).optional(),
  narrativeFunction: z.string().describe("What role it plays in the story"),
  obtainMethod: ObtainMethodSchema.describe("How the item is obtained"),
  obtainedFrom: z.object({
    type: z.enum(["npc", "location", "enemy", "container"]),
    tempId: z.string(),
  }).optional().describe("Where/who the item comes from"),
  usedFor: z.array(z.object({
    purpose: z.string().describe("e.g., unlock_door, give_to_npc, craft_item"),
    targetTempId: z.string().optional().describe("What it's used on/with"),
  })).optional().describe("How the item is used in the quest"),
  useExistingId: z.string().optional().describe("If user chose to reuse existing item"),
  generationNotes: z.string().optional().describe("User notes for generation"),
});

export const LocationTypeSchema = z.enum([
  "dungeon",
  "town",
  "wilderness",
  "interior",
  "landmark",
  "hub",
]);

export const LocationImportanceSchema = z.enum(["primary", "secondary", "optional"]);

export const ConnectionTypeSchema = z.enum(["path", "door", "portal", "hidden"]);

export const PlannedLocationSchema = z.object({
  tempId: z.string().describe("Temporary ID until generated"),
  source: z.enum(["outlay", "user_added"]).describe("Where this came from"),
  outlayReference: z.string().optional().describe("Quote from outlay mentioning this location"),
  locationType: LocationTypeSchema.describe("Type of location"),
  importance: LocationImportanceSchema.describe("How critical to the quest"),
  suggestedName: z.string().optional().describe("Suggested location name"),
  suggestedRegion: z.string().optional().describe("Region ID from world bible"),
  suggestedBiome: z.string().optional().describe("Biome/climate type"),
  narrativeFunction: z.string().describe("What happens here"),
  atmosphere: z.string().describe("Mood/feeling of the location"),
  npcsPresent: z.array(z.string()).describe("Planned NPC tempIds"),
  itemsPresent: z.array(z.string()).describe("Planned item tempIds"),
  enemyTypes: z.array(z.string()).optional().describe("Types of enemies (not specific NPCs)"),
  connectedTo: z.array(z.object({
    tempId: z.string(),
    connectionType: ConnectionTypeSchema,
  })).describe("Connections to other locations"),
  parentLocation: z.string().optional().describe("If inside another location"),
  questEvents: z.array(z.object({
    event: z.string().describe("What happens"),
    trigger: z.string().describe("When it happens"),
    involvedNpcs: z.array(z.string()).optional().describe("Planned NPC tempIds"),
  })).describe("Quest events at this location"),
  useExistingId: z.string().optional().describe("If user chose to reuse existing location"),
  generationNotes: z.string().optional().describe("User notes for generation"),
});

export const ObjectiveTypeSchema = z.enum([
  "talk",
  "kill",
  "collect",
  "deliver",
  "explore",
  "escort",
  "defend",
  "craft",
  "use_item",
]);

export const PlannedObjectiveSchema = z.object({
  tempId: z.string().describe("Temporary ID"),
  stage: z.number().describe("Quest stage this belongs to"),
  type: ObjectiveTypeSchema.describe("Objective type"),
  description: z.string().describe("Player-facing text"),
  targetNpc: z.string().optional().describe("Planned NPC tempId"),
  targetItem: z.string().optional().describe("Planned item tempId"),
  targetLocation: z.string().optional().describe("Planned location tempId"),
  targetCount: z.number().optional().describe("For collect X type objectives"),
  completionTrigger: z.string().describe("What marks this as done"),
  optional: z.boolean().describe("Whether this objective is optional"),
  unlocksObjectives: z.array(z.string()).optional().describe("Objective tempIds this unlocks"),
  requiresObjectives: z.array(z.string()).optional().describe("Objective tempIds required first"),
});

export const FactionInvolvementSchema = z.object({
  factionId: z.string(),
  role: z.enum(["ally", "enemy", "neutral", "questgiver"]),
  npcsInvolved: z.array(z.string()).describe("Planned NPC tempIds"),
});

export const ThemeConnectionSchema = z.object({
  themeId: z.string(),
  manifestation: z.string().describe("How this theme appears in the quest"),
});

export const RegionUsageSchema = z.object({
  regionId: z.string(),
  locationIds: z.array(z.string()).describe("Planned location tempIds in this region"),
});

export const EntityPlanSchema = z.object({
  questId: z.string(),
  analyzedAt: z.string(),
  npcs: z.array(PlannedNPCSchema),
  items: z.array(PlannedItemSchema),
  locations: z.array(PlannedLocationSchema),
  objectives: z.array(PlannedObjectiveSchema),
  factionInvolvement: z.array(FactionInvolvementSchema),
  themeConnections: z.array(ThemeConnectionSchema),
  regionUsage: z.array(RegionUsageSchema),
});

// ============================================================================
// Generated Entity Schemas (Phase 3)
// ============================================================================

export const GeneratedItemSchema = z.object({
  tempId: z.string().describe("Original temp ID from plan"),
  realId: z.string().describe("Actual generated ID"),
  id: z.string().describe("Item ID"),
  name: z.string().describe("Item name"),
  description: z.string().describe("Item description"),
  type: z.enum(["resource", "tool", "weapon", "armor", "consumable", "quest", "item"]),
  rarity: z.enum(["common", "uncommon", "rare", "epic", "legendary"]),
  stackable: z.boolean(),
  maxStackSize: z.number(),
  equippable: z.boolean(),
  equipSlot: z.enum(["mainHand", "offHand", "head", "chest", "legs", "feet", "hands", "accessory"]).nullable(),
  value: z.number(),
  weight: z.number(),
});

export const GeneratedNPCSchema = z.object({
  tempId: z.string().describe("Original temp ID from plan"),
  realId: z.string().describe("Actual generated ID"),
  entity_id: z.string().describe("NPC entity ID"),
  name: z.string().describe("NPC name"),
  backstory: z.string().describe("NPC backstory"),
  personalMission: z.string().describe("What drives this character"),
  hopes: z.string().describe("What they hope for"),
  fears: z.string().describe("What they fear"),
  relationships: z.array(z.object({
    category: z.string(),
    entity_ids: z.array(z.string()),
  })),
});

export const GeneratedLocationSchema = z.object({
  tempId: z.string().describe("Original temp ID from plan"),
  realId: z.string().describe("Actual generated ID"),
  id: z.string().describe("Tile/location ID"),
  name: z.string().describe("Location name"),
  description: z.string().describe("Location description"),
  color: z.string().describe("Foreground color"),
  backgroundColor: z.string().describe("Background color"),
  theme: z.string().describe("Theme category"),
  resources: z.array(z.string()),
  rarity: z.number(),
  accessible: z.boolean(),
});

export const GeneratedEntitiesSchema = z.object({
  items: z.array(GeneratedItemSchema),
  npcs: z.array(GeneratedNPCSchema),
  locations: z.array(GeneratedLocationSchema),
});

// ============================================================================
// Quest Assembly Schemas (Phase 4)
// ============================================================================

export const QuestDifficultySchema = z.enum(["easy", "medium", "hard", "legendary"]);
export const QuestCategorySchema = z.enum(["main", "side", "faction", "daily"]);

export const GeneratedQuestSchema = z.object({
  id: z.string().describe("Unique quest identifier"),
  name: z.string().describe("Quest display name"),
  description: z.string().describe("Player-facing summary"),
  outlay: z.string().describe("Full narrative outlay"),
  type: QuestCategorySchema,
  difficulty: QuestDifficultySchema,
  npcs: z.array(z.string()).describe("NPC IDs involved"),
  items: z.array(z.string()).describe("Item IDs involved"),
  locations: z.array(z.string()).describe("Location IDs involved"),
  prerequisites: z.array(z.string()).describe("Quest IDs that must be completed first"),
  factions: z.array(z.string()).describe("Faction IDs affected"),
  themes: z.array(z.string()).describe("Theme IDs this quest explores"),
  region: z.string().describe("Primary region ID"),
});

// ============================================================================
// Quest Generation State Schema
// ============================================================================

export const QuestGenerationStateSchema = z.object({
  questId: z.string(),
  questName: z.string(),
  status: QuestGenerationStatusSchema,
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  currentStep: z.number(),
  totalSteps: z.number(),
  steps: z.array(GenerationStepStateSchema),
  pendingReview: PendingReviewSchema.optional(),
  outlay: QuestOutlaySchema.optional(),
  entityPlan: EntityPlanSchema.optional(),
  generatedEntities: GeneratedEntitiesSchema.optional(),
  finalQuest: GeneratedQuestSchema.optional(),
  error: z.string().optional(),
});

export const QuestGenerationRegistrySchema = z.object({
  generations: z.record(z.string(), QuestGenerationStateSchema),
  activeCount: z.number(),
});

// ============================================================================
// API Request/Response Schemas
// ============================================================================

export const StartQuestGenerationRequestSchema = z.object({
  name: z.string().optional().describe("Quest name (auto-generated if not provided)"),
  concept: z.string().optional().describe("Brief quest concept (auto-generated if not provided)"),
  type: QuestCategorySchema.describe("Quest type"),
  region: z.string().optional().describe("Target region ID"),
  faction: z.string().optional().describe("Target faction ID"),
});

export const ReviewActionSchema = z.enum(["approve", "edit", "regenerate", "cancel"]);

export const SubmitReviewRequestSchema = z.object({
  action: ReviewActionSchema,
  edits: z.unknown().optional().describe("Edits if action is 'edit'"),
});

// ============================================================================
// Type Exports
// ============================================================================

export type GenerationStepStatus = z.infer<typeof GenerationStepStatusSchema>;
export type GenerationStepState = z.infer<typeof GenerationStepStateSchema>;
export type QuestGenerationStatus = z.infer<typeof QuestGenerationStatusSchema>;
export type PendingReview = z.infer<typeof PendingReviewSchema>;
export type QuestOutlay = z.infer<typeof QuestOutlaySchema>;
export type NPCRole = z.infer<typeof NPCRoleSchema>;
export type NPCImportance = z.infer<typeof NPCImportanceSchema>;
export type DialogueNeed = z.infer<typeof DialogueNeedSchema>;
export type PlannedNPC = z.infer<typeof PlannedNPCSchema>;
export type ItemCategory = z.infer<typeof ItemCategorySchema>;
export type ItemImportance = z.infer<typeof ItemImportanceSchema>;
export type ObtainMethod = z.infer<typeof ObtainMethodSchema>;
export type PlannedItem = z.infer<typeof PlannedItemSchema>;
export type LocationType = z.infer<typeof LocationTypeSchema>;
export type LocationImportance = z.infer<typeof LocationImportanceSchema>;
export type ConnectionType = z.infer<typeof ConnectionTypeSchema>;
export type PlannedLocation = z.infer<typeof PlannedLocationSchema>;
export type ObjectiveType = z.infer<typeof ObjectiveTypeSchema>;
export type PlannedObjective = z.infer<typeof PlannedObjectiveSchema>;
export type FactionInvolvement = z.infer<typeof FactionInvolvementSchema>;
export type ThemeConnection = z.infer<typeof ThemeConnectionSchema>;
export type RegionUsage = z.infer<typeof RegionUsageSchema>;
export type EntityPlan = z.infer<typeof EntityPlanSchema>;
export type GeneratedItem = z.infer<typeof GeneratedItemSchema>;
export type GeneratedNPC = z.infer<typeof GeneratedNPCSchema>;
export type GeneratedLocation = z.infer<typeof GeneratedLocationSchema>;
export type GeneratedEntities = z.infer<typeof GeneratedEntitiesSchema>;
export type QuestDifficulty = z.infer<typeof QuestDifficultySchema>;
export type QuestCategory = z.infer<typeof QuestCategorySchema>;
export type GeneratedQuest = z.infer<typeof GeneratedQuestSchema>;
export type QuestGenerationState = z.infer<typeof QuestGenerationStateSchema>;
export type QuestGenerationRegistry = z.infer<typeof QuestGenerationRegistrySchema>;
export type StartQuestGenerationRequest = z.infer<typeof StartQuestGenerationRequestSchema>;
export type ReviewAction = z.infer<typeof ReviewActionSchema>;
export type SubmitReviewRequest = z.infer<typeof SubmitReviewRequestSchema>;
