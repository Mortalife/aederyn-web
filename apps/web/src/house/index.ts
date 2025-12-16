import { HouseMap, houseTiles } from "../config/house-tiles.js";

export const BASE_HOUSE_WIDTH = 10;
export const BASE_HOUSE_HEIGHT = 10;

export const getBaseHouse = (): HouseMap => {
  const tiles = [];
  for (let x = 0; x < BASE_HOUSE_WIDTH; x++) {
    for (let y = 0; y < BASE_HOUSE_HEIGHT; y++) {
      tiles.push({
        type: structuredClone(houseTiles["grass"]),
        position: {
          x,
          y,
        },
      });
    }
  }

  return {
    width: BASE_HOUSE_WIDTH,
    height: BASE_HOUSE_HEIGHT,
    tiles,
  };
};
