import { z } from "zod";

// Basic types
const NpcReference = z.object({
  entity_id: z.string(),
  zone_id: z.string(),
});

const ItemReward = z.object({
  type: z.literal("item"),
  item_id: z.string(),
  amount: z.number(),
});

const Progress = z.object({
  current: z.number(),
  required: z.number(),
  completed: z.boolean(),
  updated_at: z.number().nullable(),
  completed_at: z.number().nullable(),
});

const Reward = z.discriminatedUnion("type", [ItemReward]);

// Base objective that all objective types extend from
const BaseObjective = z.object({
  id: z.string(),
  description: z.string(),
  progress: Progress.nullable(),
});

/**
 * Gather Objective
 * Perform X resource actions
 */
const GatherObjective = z.object({
  type: z.literal("gather"),
  id: z.string(),
  description: z.string(),
  progress: Progress.nullable(),
  resource_id: z.string(),
  amount: z.number(),
});

/**
 * Collect Objective
 * Retrieve X items
 */
const CollectObjective = z.object({
  type: z.literal("collect"),
  id: z.string(),
  description: z.string(),
  progress: Progress.nullable(),
  item_id: z.string(),
  amount: z.number(),
});

/**
 * Talk Objective
 * Speak to an NPC in a zone
 */
const TalkObjective = z.object({
  type: z.literal("talk"),
  id: z.string(),
  description: z.string(),
  progress: Progress.nullable(),
  entity_id: z.string(),
  zone_id: z.string(),
  dialog: z.string(),
  response: z.string(),
});

// const EscortObjective = BaseObjective.extend({
//   type: z.literal("escort"),
//   target: z.string(),
//   start_zone: z.string(),
//   end_zone: z.string(),
// });

/**
 * Explore Objective
 * Find the tile of type zone_id
 * Implementation detail: Add the action to every zone_id, chance of success is the chance between 0 and 1
 *  where 0 is 0% and 1 is 100%, so the user has to look around for the right tile
 */
const ExploreObjective = z.object({
  type: z.literal("explore"),
  id: z.string(),
  description: z.string(),
  progress: Progress.nullable(),
  zone_id: z.string(),
  chance: z.number(),
  found_message: z.string().optional(),
});

// const SearchObjective = BaseObjective.extend({
//   type: z.literal("search"),
//   target: z.string(),
//   zone_id: z.string(),
// });

const CraftObjective = z.object({
  type: z.literal("craft"),
  id: z.string(),
  description: z.string(),
  progress: Progress.nullable(),
  resource_id: z.string(),
  amount: z.number(),
});

// Union of all objective types
const Objective = z.discriminatedUnion("type", [
  GatherObjective,
  CollectObjective,
  TalkObjective,
  //   EscortObjective,
  ExploreObjective,
  //   SearchObjective,
  CraftObjective,
]);

// Completion schema
const Completion = z.object({
  entity_id: z.string(),
  zone_id: z.string(),
  message: z.string(),
  return_message: z
    .string()
    .describe("Information to help the user get to the completion zone"),
});

// Status schema

// Main Quest/Task schema
const Quest = z.object({
  id: z.string(),
  type: z.enum([
    "collection",
    "messenger",
    // "escort",
    "investigation",
    "crafting",
    "exploration",
    "defence",
    // "elimination",
  ]),
  name: z.string(),
  giver: NpcReference,
  description: z.string(),
  objectives: z.array(Objective),
  completion: Completion,
  rewards: z.array(Reward),
});

// Export types
export type NpcReference = z.infer<typeof NpcReference>;
export type Progress = z.infer<typeof Progress>;
export type Reward = z.infer<typeof Reward>;
export type Objective = z.infer<typeof Objective>;
export type Completion = z.infer<typeof Completion>;
export type Quest = z.infer<typeof Quest>;

/**
 * Quests mapped to tiles
 */

const TileBase = z.object({
  x: z.number(),
  y: z.number(),
});

const TileNpcReference = NpcReference.extend({
  ...TileBase.shape,
});

const TileTalkObjective = TalkObjective.extend({
  ...TileBase.shape,
});

const TileExploreObjective = ExploreObjective.extend({
  ...TileBase.shape,
});

const TileObjective = z.discriminatedUnion("type", [
  GatherObjective,
  CollectObjective,
  TileTalkObjective,
  TileExploreObjective,
  CraftObjective,
]);

const TileCompletion = Completion.extend({
  ...TileBase.shape,
});

const TileQuest = Quest.extend({
  giver: TileNpcReference,
  objectives: z.array(TileObjective),
  currentObjective: TileObjective.optional(),
  completion: TileCompletion,
  starts_at: z.number(),
  ends_at: z.number(),
});

export type TileNpcReference = z.infer<typeof TileNpcReference>;
export type TileTalkObjective = z.infer<typeof TileTalkObjective>;
export type TileExploreObjective = z.infer<typeof TileExploreObjective>;
export type TileObjective = z.infer<typeof TileObjective>;
export type TileCompletion = z.infer<typeof TileCompletion>;
export type TileQuest = z.infer<typeof TileQuest>;

// Export schemas
export const schemas = {
  NpcReference,
  Reward,
  Progress,
  BaseObjective,
  GatherObjective,
  TalkObjective,
  //   EscortObjective,
  ExploreObjective,
  //   SearchObjective,
  CraftObjective,
  Objective,
  Completion,
  Quest,

  /**
   * Quests mapped to tiles
   */
  TileBase,
  TileNpcReference,
  TileTalkObjective,
  TileExploreObjective,
  TileObjective,
  TileCompetion: TileCompletion,
  TileQuest,
} as const;

export default schemas;
