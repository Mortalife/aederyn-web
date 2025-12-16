import { z } from "zod";

export const QuestTypeSchema = z.enum([
  "collection",
  "messenger",
  "investigation",
  "crafting",
  "exploration",
  "defence",
  "combat",
  "delivery",
  "dialog",
]);

export const NpcReferenceSchema = z.object({
  entity_id: z.string().describe("NPC entity identifier"),
  zone_id: z.string().describe("Zone where NPC is located"),
});

export const TileNpcReferenceSchema = NpcReferenceSchema.extend({
  x: z.number().describe("X coordinate on tile map"),
  y: z.number().describe("Y coordinate on tile map"),
});

export const ProgressSchema = z.object({
  current: z.number().describe("Current progress count"),
  required: z.number().describe("Required amount to complete"),
  completed: z.boolean().describe("Whether objective is completed"),
  updated_at: z.number().nullable().describe("Timestamp of last update"),
  completed_at: z.number().nullable().describe("Timestamp of completion"),
});

export const DialogStepSchema = z.object({
  entity_id: z.string().nullable().describe("Speaking NPC entity ID, null for player"),
  dialog: z.string().describe("Dialog text content"),
});

export const BaseObjectiveSchema = z.object({
  id: z.string().describe("Unique objective identifier"),
  description: z.string().describe("Player-facing objective text"),
  progress: ProgressSchema.nullable().describe("Current progress state"),
});

export const GatherObjectiveSchema = BaseObjectiveSchema.extend({
  type: z.literal("gather"),
  resource_id: z.string().describe("Resource node to gather from"),
  amount: z.number().min(1).describe("Amount to gather"),
});

export const CollectObjectiveSchema = BaseObjectiveSchema.extend({
  type: z.literal("collect"),
  item_id: z.string().describe("Item ID to collect"),
  amount: z.number().min(1).describe("Amount to collect"),
});

export const TalkObjectiveSchema = BaseObjectiveSchema.extend({
  type: z.literal("talk"),
  entity_id: z.string().describe("NPC to talk to"),
  zone_id: z.string().describe("Zone where NPC is located"),
  dialog_steps: z.array(DialogStepSchema).describe("Conversation dialog steps"),
});

export const TileTalkObjectiveSchema = TalkObjectiveSchema.extend({
  x: z.number().describe("X coordinate"),
  y: z.number().describe("Y coordinate"),
});

export const ExploreObjectiveSchema = BaseObjectiveSchema.extend({
  type: z.literal("explore"),
  zone_id: z.string().describe("Zone to explore"),
  chance: z.number().min(0).max(1).describe("Discovery chance (0-1)"),
  found_message: z.string().nullable().describe("Message when discovered"),
});

export const TileExploreObjectiveSchema = ExploreObjectiveSchema.extend({
  x: z.number().describe("X coordinate"),
  y: z.number().describe("Y coordinate"),
});

export const CraftObjectiveSchema = BaseObjectiveSchema.extend({
  type: z.literal("craft"),
  resource_id: z.string().describe("Crafting station/resource ID"),
  amount: z.number().min(1).describe("Amount to craft"),
});

export const ObjectiveSchema = z.discriminatedUnion("type", [
  GatherObjectiveSchema,
  CollectObjectiveSchema,
  TalkObjectiveSchema,
  ExploreObjectiveSchema,
  CraftObjectiveSchema,
]);

export const TileObjectiveSchema = z.discriminatedUnion("type", [
  GatherObjectiveSchema,
  CollectObjectiveSchema,
  TileTalkObjectiveSchema,
  TileExploreObjectiveSchema,
  CraftObjectiveSchema,
]);

export const ItemRewardSchema = z.object({
  type: z.literal("item"),
  item_id: z.string().describe("Reward item ID"),
  amount: z.number().min(1).describe("Quantity rewarded"),
});

export const GoldRewardSchema = z.object({
  type: z.literal("gold"),
  amount: z.number().min(1).describe("Gold amount rewarded"),
});

export const SkillRewardSchema = z.object({
  type: z.literal("skill"),
  skill_id: z.string().describe("Skill to grant XP to"),
  amount: z.number().min(1).describe("XP amount rewarded"),
});

export const RequirementRewardSchema = z.discriminatedUnion("type", [
  ItemRewardSchema,
  GoldRewardSchema,
  SkillRewardSchema,
]);

export const CompletionSchema = z.object({
  entity_id: z.string().describe("NPC to return to"),
  zone_id: z.string().describe("Zone where NPC is located"),
  message: z.string().describe("Completion dialog message"),
  return_message: z.string().describe("Message on subsequent visits"),
});

export const TileCompletionSchema = CompletionSchema.extend({
  x: z.number().describe("X coordinate"),
  y: z.number().describe("Y coordinate"),
});

export const QuestSchema = z.object({
  id: z.string().describe("Unique quest identifier slug"),
  type: QuestTypeSchema.describe("Quest category type"),
  name: z.string().describe("Quest display title"),
  giver: z.union([NpcReferenceSchema, TileNpcReferenceSchema]).describe("Quest giver NPC reference"),
  description: z.string().describe("Quest description for player journal"),
  objectives: z.array(z.union([ObjectiveSchema, TileObjectiveSchema])).describe("Quest objectives to complete"),
  completion: z.union([CompletionSchema, TileCompletionSchema]).describe("Quest completion details"),
  rewards: z.array(RequirementRewardSchema).describe("Rewards given on completion"),
  prerequisites: z.array(z.string()).optional().describe("Quest IDs that must be completed first"),
  is_tutorial: z.boolean().optional().describe("Whether this is a tutorial quest"),
});

export const TileQuestSchema = QuestSchema.omit({ giver: true, objectives: true, completion: true }).extend({
  giver: TileNpcReferenceSchema,
  objectives: z.array(TileObjectiveSchema),
  currentObjective: TileObjectiveSchema.optional(),
  completion: TileCompletionSchema,
  starts_at: z.number().describe("Quest availability start timestamp"),
  ends_at: z.number().describe("Quest availability end timestamp"),
});

export const CreateQuestDTOSchema = QuestSchema.partial({ id: true });
export const UpdateQuestDTOSchema = QuestSchema.omit({ id: true }).partial();

// Infer types from schemas
export type QuestType = z.infer<typeof QuestTypeSchema>;
export type NpcReference = z.infer<typeof NpcReferenceSchema>;
export type TileNpcReference = z.infer<typeof TileNpcReferenceSchema>;
export type Progress = z.infer<typeof ProgressSchema>;
export type DialogStep = z.infer<typeof DialogStepSchema>;
export type BaseObjective = z.infer<typeof BaseObjectiveSchema>;
export type GatherObjective = z.infer<typeof GatherObjectiveSchema>;
export type CollectObjective = z.infer<typeof CollectObjectiveSchema>;
export type TalkObjective = z.infer<typeof TalkObjectiveSchema>;
export type TileTalkObjective = z.infer<typeof TileTalkObjectiveSchema>;
export type ExploreObjective = z.infer<typeof ExploreObjectiveSchema>;
export type TileExploreObjective = z.infer<typeof TileExploreObjectiveSchema>;
export type CraftObjective = z.infer<typeof CraftObjectiveSchema>;
export type Objective = z.infer<typeof ObjectiveSchema>;
export type TileObjective = z.infer<typeof TileObjectiveSchema>;
export type ItemReward = z.infer<typeof ItemRewardSchema>;
export type GoldReward = z.infer<typeof GoldRewardSchema>;
export type SkillReward = z.infer<typeof SkillRewardSchema>;
export type RequirementReward = z.infer<typeof RequirementRewardSchema>;
export type Completion = z.infer<typeof CompletionSchema>;
export type TileCompletion = z.infer<typeof TileCompletionSchema>;
export type Quest = z.infer<typeof QuestSchema>;
export type TileQuest = z.infer<typeof TileQuestSchema>;
export type QuestGroup = Quest | TileQuest;
export type CreateQuestDTO = z.infer<typeof CreateQuestDTOSchema>;
export type UpdateQuestDTO = z.infer<typeof UpdateQuestDTOSchema>;

// Type guard functions
export function isTileQuest(quest: QuestGroup): quest is TileQuest {
  return "starts_at" in quest && "ends_at" in quest;
}

export function isTileTalkObjective(
  objective: Objective | TileObjective
): objective is TileTalkObjective {
  return objective.type === "talk" && "x" in objective && "y" in objective;
}

export function isTileExploreObjective(
  objective: Objective | TileObjective
): objective is TileExploreObjective {
  return objective.type === "explore" && "x" in objective && "y" in objective;
}
