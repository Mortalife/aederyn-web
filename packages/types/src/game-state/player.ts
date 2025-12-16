import type { UserInventoryItem, InventoryItem } from "./inventory.js";

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
  e: {
    mh?: string;
  };
  h: number;
  po: number;
  m: number;
  $: number;
}

export interface GameUser extends Omit<GameUserModel, "i"> {
  i: InventoryItem[];
}

export type OtherUser = Pick<GameUserModel, "id" | "p" | "e" | "h" | "po" | "m">;
