import type { HouseTile } from "./types.js";

export const houseTiles: Record<string, HouseTile> = {
  grass: {
    id: "grass",
    name: "Grass",
    description: "A patch of wild grass",
    sprite: "assets/tiles/grass.png",
    bgColor: "#2E865F",
    flags: { isWalkable: true },
    availableActions: [
      {
        id: "till_soil",
        name: "Till Soil",
        description: "Convert grass into soil",
        requirements: { timeToComplete: 10 },
        result: { resultingTileId: "soil" },
        canUndo: true,
      },
    ],
  },
  soil: {
    id: "soil",
    name: "Tilled Soil",
    description: "Fertile soil ready for planting",
    sprite: "assets/tiles/soil.png",
    bgColor: "#964B00",
    flags: { isWalkable: true },
    availableActions: [
      {
        id: "plant_seed",
        name: "Plant Seed",
        description: "Plant seeds in the tilled soil",
        requirements: {
          requirements: [{ type: "item", item_id: "item_seed_01", amount: 1 }],
          timeToComplete: 10,
        },
        result: { resultingTileId: "seedling" },
        canUndo: false,
      },
    ],
  },
  seedling: {
    id: "seedling",
    name: "Seedling",
    description: "A young plant beginning to sprout",
    sprite: "assets/tiles/seedling.png",
    bgColor: "#d1e19b",
    flags: { isWalkable: false },
    availableActions: [
      {
        id: "water_seedling",
        name: "Water Seedling",
        description: "Water the seedling to help it grow",
        requirements: {
          requirements: [{ type: "item", item_id: "item_water_01", amount: 1 }],
          timeToComplete: 5,
        },
        result: { resultingTileId: "plant" },
        canUndo: false,
      },
    ],
  },
  plant: {
    id: "plant",
    name: "Mature Plant",
    description: "A fully grown plant ready for harvest",
    sprite: "assets/tiles/plant.png",
    bgColor: "#1B4D3E",
    flags: { isWalkable: false },
    availableActions: [
      {
        id: "harvest_plant",
        name: "Harvest Plant",
        description: "Harvest the mature plant for resources",
        requirements: {
          requirements: [
            { type: "item", item_id: "item_sickle_01", amount: 1 },
          ],
          timeToComplete: 15,
        },
        result: { resultingTileId: "barren_soil" },
        canUndo: false,
      },
    ],
  },
  barren_soil: {
    id: "barren_soil",
    name: "Barren Soil",
    description: "Depleted soil that needs fertilizer to be productive again",
    sprite: "assets/tiles/barren_soil.png",
    bgColor: "#b7b3ac",
    flags: { isWalkable: true },
    availableActions: [
      {
        id: "fertilize_soil",
        name: "Fertilize Soil",
        description: "Add fertilizer to restore the soil's fertility",
        requirements: {
          requirements: [
            { type: "item", item_id: "item_fertilizer_01", amount: 1 },
          ],
          timeToComplete: 20,
        },
        result: { resultingTileId: "soil" },
        canUndo: false,
      },
    ],
  },
};

export const houseTilesById = new Map<string, HouseTile>(
  Object.entries(houseTiles),
);
