import { RequirementReward } from "../user/quest.js";

export interface ActionRequirement {
  requirements?: RequirementReward[];
  timeToComplete?: number; // in seconds
  prerequisites?: {
    adjacentTiles?: TileType[];
  };
}

// Possible results from performing an action
export interface ActionResult {
  resultingTileId?: string;
  yields?: RequirementReward[];
}

// Definition of an action that can be performed on a tile
export interface TileAction {
  id: string;
  name: string;
  description: string;
  requirements: ActionRequirement;
  result: ActionResult;
  canUndo: boolean;
}

// Definition of a tile type
export interface TileType {
  id: string;
  name: string;
  description: string;
  sprite: string; // path to sprite asset
  bgColor: string;
  availableActions: TileAction[];
  availableResources?: string[]; //
  flags?: {
    isWalkable: boolean;
    isWaterSource?: boolean;
    isStructure?: boolean;
    [key: string]: boolean | undefined;
  };
}

export interface HouseMapTile {
  type: TileType;
  position: {
    x: number;
    y: number;
  };
  actionInProgress?: {
    action: TileAction;
    startedAt: number;
    completesAt: number;
  };
}

export interface HouseMap {
  width: number;
  height: number;
  tiles: HouseMapTile[];
}

// Example usage
const grassTile: TileType = {
  id: "grass",
  name: "Grass",
  description: "A patch of wild grass",
  sprite: "assets/tiles/grass.png",
  bgColor: "#2E865F",
  flags: {
    isWalkable: true,
  },
  availableActions: [
    {
      id: "till_soil",
      name: "Till Soil",
      description: "Convert grass into soil",
      requirements: {
        timeToComplete: 10,
      },
      result: {
        resultingTileId: "soil",
      },
      canUndo: true,
    },
  ],
};

const soilTile: TileType = {
  id: "soil",
  name: "Tilled Soil",
  description: "Fertile soil ready for planting",
  sprite: "assets/tiles/soil.png",
  bgColor: "#964B00",
  flags: {
    isWalkable: true,
  },
  availableActions: [
    {
      id: "plant_seed",
      name: "Plant Seed",
      description: "Plant seeds in the tilled soil",
      requirements: {
        requirements: [{ type: "item", item_id: "item_seed_01", amount: 1 }],
        timeToComplete: 10,
      },
      result: {
        resultingTileId: "seedling",
      },
      canUndo: false,
    },
  ],
};

const seedlingTile: TileType = {
  id: "seedling",
  name: "Seedling",
  description: "A young plant beginning to sprout",
  sprite: "assets/tiles/seedling.png",
  bgColor: "#d1e19b",
  flags: {
    isWalkable: false,
  },
  availableActions: [
    {
      id: "water_seedling",
      name: "Water Seedling",
      description: "Water the seedling to help it grow",
      requirements: {
        requirements: [{ type: "item", item_id: "item_water_01", amount: 1 }],
        timeToComplete: 5,
      },
      result: {
        resultingTileId: "plant",
      },
      canUndo: false,
    },
  ],
};

const plantTile: TileType = {
  id: "plant",
  name: "Mature Plant",
  description: "A fully grown plant ready for harvest",
  sprite: "assets/tiles/plant.png",
  bgColor: "#1B4D3E",
  flags: {
    isWalkable: false,
  },
  availableActions: [
    {
      id: "harvest_plant",
      name: "Harvest Plant",
      description: "Harvest the mature plant for resources",
      requirements: {
        requirements: [{ type: "item", item_id: "item_sickle_01", amount: 1 }],
        timeToComplete: 15,
      },
      result: {
        resultingTileId: "barren_soil",
      },
      canUndo: false,
    },
  ],
};

const barrenSoilTile: TileType = {
  id: "barren_soil",
  name: "Barren Soil",
  description: "Depleted soil that needs fertilizer to be productive again",
  sprite: "assets/tiles/barren_soil.png",
  bgColor: "#b7b3ac",
  flags: {
    isWalkable: true,
  },
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
      result: {
        resultingTileId: "soil",
      },
      canUndo: false,
    },
  ],
};

export const houseTiles = {
  grass: grassTile,
  soil: soilTile,
  seedling: seedlingTile,
  plant: plantTile,
  barren_soil: barrenSoilTile,
};

// Type for the game map
