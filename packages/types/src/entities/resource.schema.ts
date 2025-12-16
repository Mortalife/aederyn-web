import { z } from "zod";
import { ItemSchema } from "./item.schema.js";

export const ResourceTypeSchema = z.enum(["resource", "workbench", "furnace", "magic"]);

export const RewardItemModelSchema = z.object({
  item_id: z.string().describe("Item ID to reward"),
  qty: z.number().min(1).describe("Quantity to reward"),
});

export const RewardItemSchema = z.object({
  item: ItemSchema.describe("Full item object"),
  qty: z.number().min(1).describe("Quantity to reward"),
});

export const RequiredItemModelSchema = z.object({
  item_id: z.string().describe("Required item ID"),
  qty: z.number().min(1).describe("Required quantity"),
  consumed: z.boolean().describe("Whether item is consumed on use"),
  itemDurabilityReduction: z.number().optional().describe("Durability reduction per use"),
});

export const RequiredItemSchema = z.object({
  item: ItemSchema.describe("Full item object"),
  qty: z.number().min(1).describe("Required quantity"),
  consumed: z.boolean().describe("Whether item is consumed on use"),
  itemDurabilityReduction: z.number().optional().describe("Durability reduction per use"),
});

export const ResourceModelSchema = z.object({
  id: z.string().describe("Unique resource identifier"),
  name: z.string().describe("Display name for the resource"),
  amount: z.number().describe("Total amount available"),
  limitless: z.boolean().describe("Whether resource is infinite"),
  collectionTime: z.number().describe("Time in ms to collect"),
  reward_items: z.array(RewardItemModelSchema).describe("Items rewarded on collection"),
  required_items: z.array(RequiredItemModelSchema).describe("Items required to collect"),
  type: ResourceTypeSchema.describe("Resource category type"),
  verb: z.string().describe("Action verb (e.g., 'Mine', 'Chop')"),
});

export const ResourceSchema = ResourceModelSchema
  .omit({ reward_items: true, required_items: true })
  .extend({
    amount_remaining: z.number().describe("Current amount remaining"),
    reward_items: z.array(RewardItemSchema).describe("Items rewarded on collection"),
    required_items: z.array(RequiredItemSchema).describe("Items required to collect"),
  });

export const CreateResourceDTOSchema = ResourceModelSchema.partial({ id: true });
export const UpdateResourceDTOSchema = ResourceModelSchema.omit({ id: true }).partial();

// Infer types from schemas
export type ResourceType = z.infer<typeof ResourceTypeSchema>;
export type RewardItemModel = z.infer<typeof RewardItemModelSchema>;
export type RewardItem = z.infer<typeof RewardItemSchema>;
export type RequiredItemModel = z.infer<typeof RequiredItemModelSchema>;
export type RequiredItem = z.infer<typeof RequiredItemSchema>;
export type ResourceModel = z.infer<typeof ResourceModelSchema>;
export type Resource = z.infer<typeof ResourceSchema>;
export type CreateResourceDTO = z.infer<typeof CreateResourceDTOSchema>;
export type UpdateResourceDTO = z.infer<typeof UpdateResourceDTOSchema>;
