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

export const QuestKindSchema = z.enum(["story", "contract"]);

export const NpcReferenceSchema = z.object({
  entity_id: z.string().describe("NPC entity identifier; met at their home landmark"),
  landmark: z
    .string()
    .optional()
    .describe("Landmark where the NPC is met instead of their home, e.g. when they travel during a story"),
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
  region: z.string().optional().describe("Only gathering in this map region counts"),
});

export const CollectObjectiveSchema = BaseObjectiveSchema.extend({
  type: z.literal("collect"),
  item_id: z.string().describe("Item ID to collect"),
  amount: z.number().min(1).describe("Amount to collect"),
});

export const TalkObjectiveSchema = BaseObjectiveSchema.extend({
  type: z.literal("talk"),
  entity_id: z.string().describe("NPC to talk to"),
  landmark: z.string().optional().describe("Landmark where the NPC is met instead of their home"),
  dialog_steps: z.array(DialogStepSchema).describe("Conversation dialog steps"),
});

export const ExploreObjectiveSchema = BaseObjectiveSchema.extend({
  type: z.literal("explore"),
  landmark: z.string().optional().describe("Landmark to reach"),
  region: z
    .string()
    .optional()
    .describe("Contracts only: a map region; each rotation picks one of its cells to reach"),
  tile: z.string().optional().describe("With region: only pick cells showing this tile"),
  chance: z.number().min(0).max(1).describe("Discovery chance (0-1)"),
  found_message: z.string().nullable().describe("Message when discovered"),
});

export const CraftObjectiveSchema = BaseObjectiveSchema.extend({
  type: z.literal("craft"),
  resource_id: z.string().describe("Crafting station/resource ID"),
  amount: z.number().min(1).describe("Amount to craft"),
});

export const KillObjectiveSchema = BaseObjectiveSchema.extend({
  type: z.literal("kill"),
  monster_id: z.string().describe("Monster to defeat"),
  count: z.number().int().min(1).describe("Number of kills required"),
  region: z.string().optional().describe("Only kills in this map region count"),
});

export const ObjectiveSchema = z.discriminatedUnion("type", [
  GatherObjectiveSchema,
  CollectObjectiveSchema,
  TalkObjectiveSchema,
  ExploreObjectiveSchema,
  CraftObjectiveSchema,
  KillObjectiveSchema,
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

export const CompletionSchema = NpcReferenceSchema.extend({
  message: z.string().describe("Completion dialog message"),
  return_message: z.string().describe("Message on subsequent visits"),
});

export const ContractCompletionSchema = z.object({
  message: z.string().describe("Shown when the contract is handed in at the board"),
});

const QuestBaseSchema = z.object({
  id: z.string().describe("Unique quest identifier slug"),
  type: QuestTypeSchema.describe("Quest category type"),
  name: z.string().describe("Quest display title"),
  description: z.string().describe("Quest description for player journal"),
  objectives: z.array(ObjectiveSchema).describe("Quest objectives to complete, in order"),
  rewards: z.array(RequirementRewardSchema).describe("Rewards given on completion"),
  prerequisites: z.array(z.string()).optional().describe("Quest IDs the player must have completed first"),
  is_tutorial: z.boolean().optional().describe("Whether this is a tutorial quest"),
});

export const StoryQuestSchema = QuestBaseSchema.extend({
  kind: z.literal("story"),
  giver: NpcReferenceSchema.describe("Quest giver, met at their home unless overridden"),
  completion: CompletionSchema.describe("Who the quest is handed in to"),
  excludes: z
    .array(z.string())
    .optional()
    .describe("Story quests that rule this one out: it isn't offered while the player has any of them taken or completed"),
});

export const ContractSchema = QuestBaseSchema.extend({
  kind: z.literal("contract"),
  board: z.string().describe("Landmark ID of the contract board that posts it; taken and handed in there"),
  completion: ContractCompletionSchema,
});

export const QuestSchema = z
  .discriminatedUnion("kind", [StoryQuestSchema, ContractSchema])
  .superRefine((quest, ctx) => {
    quest.objectives.forEach((objective, index) => {
      if (objective.type !== "explore") return;
      const path = ["objectives", index];
      if (!!objective.landmark === !!objective.region) {
        ctx.addIssue({ code: "custom", path, message: "explore needs exactly one of landmark or region" });
      }
      if (objective.region && quest.kind !== "contract") {
        ctx.addIssue({ code: "custom", path: [...path, "region"], message: "only contracts can explore a random cell of a region" });
      }
      if (objective.tile && !objective.region) {
        ctx.addIssue({ code: "custom", path: [...path, "tile"], message: "tile only narrows a region" });
      }
    });
  });

// Infer types from schemas
export type QuestType = z.infer<typeof QuestTypeSchema>;
export type QuestKind = z.infer<typeof QuestKindSchema>;
export type NpcReference = z.infer<typeof NpcReferenceSchema>;
export type Progress = z.infer<typeof ProgressSchema>;
export type DialogStep = z.infer<typeof DialogStepSchema>;
export type BaseObjective = z.infer<typeof BaseObjectiveSchema>;
export type GatherObjective = z.infer<typeof GatherObjectiveSchema>;
export type CollectObjective = z.infer<typeof CollectObjectiveSchema>;
export type TalkObjective = z.infer<typeof TalkObjectiveSchema>;
export type ExploreObjective = z.infer<typeof ExploreObjectiveSchema>;
export type CraftObjective = z.infer<typeof CraftObjectiveSchema>;
export type KillObjective = z.infer<typeof KillObjectiveSchema>;
export type Objective = z.infer<typeof ObjectiveSchema>;
export type ItemReward = z.infer<typeof ItemRewardSchema>;
export type GoldReward = z.infer<typeof GoldRewardSchema>;
export type SkillReward = z.infer<typeof SkillRewardSchema>;
export type RequirementReward = z.infer<typeof RequirementRewardSchema>;
export type Completion = z.infer<typeof CompletionSchema>;
export type ContractCompletion = z.infer<typeof ContractCompletionSchema>;
export type StoryQuest = z.infer<typeof StoryQuestSchema>;
export type Contract = z.infer<typeof ContractSchema>;
export type Quest = z.infer<typeof QuestSchema>;

/** Every NPC reference in a quest (giver, talk objectives, completion). */
export const questNpcReferences = (quest: Quest): Array<{ ref: NpcReference; location: string }> => [
  ...(quest.kind === "story" ? [{ ref: quest.giver, location: "giver" }] : []),
  ...quest.objectives.flatMap((objective, index) =>
    objective.type === "talk" ? [{ ref: objective, location: `objectives[${index}] (talk)` }] : []
  ),
  ...(quest.kind === "story" ? [{ ref: quest.completion, location: "completion" }] : []),
];
