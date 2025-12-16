import type { Item } from "../entities/item.schema.js";

export interface UserInventoryItem {
  id: string;
  qty: number;
  item_id: string;
  metadata?: {
    currentDurability?: number;
  };
}

export interface InventoryItem {
  id: string;
  qty: number;
  item: Item;
}
