export type ItemType = "resource" | "tool" | "weapon" | "armor" | "consumable" | "quest" | "item";
export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type EquipSlot = "mainHand" | "offHand" | "head" | "chest" | "legs" | "feet" | "hands" | "accessory";

export interface ItemDurability {
  current: number;
  max: number;
}

export interface ItemAttributes {
  damage?: number;
  armor?: number;
  health?: number;
  mana?: number;
  strength?: number;
  dexterity?: number;
  intelligence?: number;
}

export interface ItemRequirements {
  level?: number;
  strength?: number;
  dexterity?: number;
  intelligence?: number;
}

export interface ItemEffect {
  type: string;
  value: number;
  duration: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  stackable: boolean;
  maxStackSize: number;
  equippable: boolean;
  equipSlot?: EquipSlot;
  durability?: ItemDurability;
  attributes?: ItemAttributes;
  requirements?: ItemRequirements;
  effects?: ItemEffect[];
  value: number;
  weight: number;
  iconUrl?: string;
}

export interface CreateItemDTO extends Omit<Item, 'id'> {
  id?: string;
}

export interface UpdateItemDTO extends Partial<Omit<Item, 'id'>> {}
