import type { Item } from "../entities/item.js";

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
