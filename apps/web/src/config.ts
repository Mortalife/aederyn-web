import { EquipSlotSchema } from "@aederyn/types";
import type { Attack, GameUserModel } from "./config/types.js";
import type { Point } from "./world/index.js";

export { resources } from "./config/resources.js";
export { tileTypes } from "./config/tiles.js";
export { items } from "./config/items.js";
export { npcs } from "./config/npcs.js";
export { monsters } from "./config/monsters.js";
export * from "./config/types.js";

export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 20;
export const VISIBILITY = 5;
export const REFRESH_RATE = 500;
export const MAX_INVENTORY_SIZE = 20;
export const START_POSITION: Point = {
  x: Math.ceil(MAP_WIDTH / 2),
  y: Math.ceil(MAP_HEIGHT / 2),
};

export const EQUIP_SLOTS = EquipSlotSchema.options;

export const USER_VERSION = 2;

/** How a player fights without a working weapon in their main hand. */
export const UNARMED: Attack = { style: "melee", damage: 1, speed: 2000 };

export const BASE_USER: GameUserModel = {
  id: "",
  v: USER_VERSION,
  p: {
    // Position
    ...START_POSITION,
  },
  z: false,
  s: {
    // Skills
  },
  i: [], // Inventory
  e: {
    // Equipment
  },
  h: 100, // Health
  po: 100, // Power
  m: 100, // Magic
  $: 0, // Gold
};
