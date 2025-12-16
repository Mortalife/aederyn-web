import type { RequirementReward } from "./quest.js";

export interface ActionRequirement {
  requirements?: RequirementReward[];
  timeToComplete?: number;
  prerequisites?: {
    adjacentTiles?: string[];
  };
}

export interface ActionResult {
  resultingTileId?: string;
  yields?: RequirementReward[];
}

export interface TileAction {
  id: string;
  name: string;
  description: string;
  requirements: ActionRequirement;
  result: ActionResult;
  canUndo: boolean;
}

export interface HouseTileFlags {
  isWalkable: boolean;
  isWaterSource?: boolean;
  isStructure?: boolean;
  [key: string]: boolean | undefined;
}

export interface HouseTile {
  id: string;
  name: string;
  description: string;
  sprite: string;
  bgColor: string;
  availableActions: TileAction[];
  availableResources?: string[];
  flags?: HouseTileFlags;
}

export interface HouseMapTile {
  type: HouseTile;
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

export interface CreateHouseTileDTO extends Omit<HouseTile, 'id'> {
  id?: string;
}

export interface UpdateHouseTileDTO extends Partial<Omit<HouseTile, 'id'>> {}
