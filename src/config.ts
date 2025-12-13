import type { GameUserModel } from "./config/types.js";
import type { Point } from "./world/index.js";

export { resources } from "./config/resources.js";
export { tileTypes } from "./config/tiles.js";
export { items } from "./config/items.js";
export { npcs } from "./config/npcs.js";
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

export const BASE_USER: GameUserModel = {
  id: "",
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
};
