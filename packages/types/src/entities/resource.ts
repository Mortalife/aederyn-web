import type { Item } from "./item.js";

export type ResourceType = "resource" | "workbench" | "furnace" | "magic";

export interface RewardItemModel {
  item_id: string;
  qty: number;
}

export interface RewardItem {
  item: Item;
  qty: number;
}

export interface RequiredItemModel {
  item_id: string;
  qty: number;
  consumed: boolean;
  itemDurabilityReduction?: number;
}

export interface RequiredItem {
  item: Item;
  qty: number;
  consumed: boolean;
  itemDurabilityReduction?: number;
}

export interface ResourceModel {
  id: string;
  name: string;
  amount: number;
  limitless: boolean;
  collectionTime: number;
  reward_items: RewardItemModel[];
  required_items: RequiredItemModel[];
  type: ResourceType;
  verb: string;
}

export interface Resource extends Omit<ResourceModel, "reward_items" | "required_items"> {
  amount_remaining: number;
  reward_items: RewardItem[];
  required_items: RequiredItem[];
}

export interface CreateResourceDTO extends Omit<ResourceModel, 'id'> {
  id?: string;
}

export interface UpdateResourceDTO extends Partial<Omit<ResourceModel, 'id'>> {}
