import { z } from "zod";

export const ItemTypeSchema = z.enum(["resource", "tool", "weapon", "armor", "consumable", "quest", "item"]);
export const ItemRaritySchema = z.enum(["common", "uncommon", "rare", "epic", "legendary"]);
export const EquipSlotSchema = z.enum(["mainHand", "offHand", "head", "chest", "legs", "feet", "hands", "accessory"]);

export const ItemDurabilitySchema = z.object({
  current: z.number().describe("Current durability points"),
  max: z.number().describe("Maximum durability points"),
});

export const ItemAttributesSchema = z.object({
  damage: z.number().optional().describe("Bonus damage"),
  armor: z.number().optional().describe("Armor rating"),
  health: z.number().optional().describe("Bonus health"),
  mana: z.number().optional().describe("Bonus mana"),
  strength: z.number().optional().describe("Bonus strength"),
  dexterity: z.number().optional().describe("Bonus dexterity"),
  intelligence: z.number().optional().describe("Bonus intelligence"),
});

export const ItemRequirementsSchema = z.object({
  level: z.number().optional().describe("Required player level"),
  strength: z.number().optional().describe("Required strength stat"),
  dexterity: z.number().optional().describe("Required dexterity stat"),
  intelligence: z.number().optional().describe("Required intelligence stat"),
});

export const ItemEffectSchema = z.object({
  type: z.string().describe("Effect type identifier"),
  value: z.number().describe("Effect magnitude"),
  duration: z.number().describe("Effect duration in seconds"),
});

export const ItemSchema = z.object({
  id: z.string().describe("Unique item identifier slug"),
  name: z.string().describe("Display name for the item"),
  description: z.string().describe("2-3 sentence item description"),
  type: ItemTypeSchema.describe("Item category"),
  rarity: ItemRaritySchema.describe("Item rarity tier"),
  stackable: z.boolean().describe("Whether item can stack in inventory"),
  maxStackSize: z.number().min(1).describe("Maximum stack size if stackable"),
  equippable: z.boolean().describe("Whether item can be equipped"),
  equipSlot: EquipSlotSchema.optional().describe("Equipment slot if equippable"),
  durability: ItemDurabilitySchema.optional().describe("Durability if item can break"),
  attributes: ItemAttributesSchema.optional().describe("Stat bonuses when equipped"),
  requirements: ItemRequirementsSchema.optional().describe("Requirements to use/equip"),
  effects: z.array(ItemEffectSchema).optional().describe("Special effects when used"),
  value: z.number().min(0).describe("Gold value based on rarity"),
  weight: z.number().min(0).describe("Weight in inventory units"),
  iconUrl: z.string().optional().describe("URL to item icon image"),
});

export const CreateItemDTOSchema = ItemSchema.partial({ id: true });
export const UpdateItemDTOSchema = ItemSchema.omit({ id: true }).partial();

// Infer types from schemas
export type ItemType = z.infer<typeof ItemTypeSchema>;
export type ItemRarity = z.infer<typeof ItemRaritySchema>;
export type EquipSlot = z.infer<typeof EquipSlotSchema>;
export type ItemDurability = z.infer<typeof ItemDurabilitySchema>;
export type ItemAttributes = z.infer<typeof ItemAttributesSchema>;
export type ItemRequirements = z.infer<typeof ItemRequirementsSchema>;
export type ItemEffect = z.infer<typeof ItemEffectSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type CreateItemDTO = z.infer<typeof CreateItemDTOSchema>;
export type UpdateItemDTO = z.infer<typeof UpdateItemDTOSchema>;
