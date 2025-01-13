import type { GameUserModel } from "./config/types";
import type { Point } from "./world";

export { resources } from "./config/resources";
export { tileTypes } from "./config/tiles";
export { items } from "./config/items";
export { npcs } from "./config/npcs";
export * from "./config/types";

export const MAP_WIDTH = 50;
export const MAP_HEIGHT = 50;
export const VISIBILITY = 5;
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
