import type { EquipSlot } from "../entities/item.schema.js";
import type { UserInventoryItem, InventoryItem } from "./inventory.js";

/** What's in each equipment slot. An equipped item isn't in the inventory. */
export type Equipment<T> = Partial<Record<EquipSlot, T>>;

export interface GameUserModel {
  id: string;
  v: number;
  p: {
    x: number;
    y: number;
  };
  z: boolean;
  s: Record<string, unknown>;
  i: UserInventoryItem[];
  e: Equipment<UserInventoryItem>;
  h: number;
  po: number;
  m: number;
  $: number;
}

export interface GameUser extends Omit<GameUserModel, "i" | "e"> {
  i: InventoryItem[];
  e: Equipment<InventoryItem>;
}

export type OtherUser = Pick<GameUserModel, "id" | "p" | "e" | "h" | "po" | "m">;
