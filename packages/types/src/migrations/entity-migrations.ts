import type { Migration } from "./index.js";
import type { Item } from "../entities/item.js";
import type { ResourceModel } from "../entities/resource.js";
import type { Tile } from "../entities/tile.js";
import type { NPC } from "../entities/npc.js";
import type { TileQuest } from "../entities/quest.js";
import type { HouseTile } from "../entities/house-tile.js";

// Example migration: Item v1 -> v2 (adding iconUrl field)
export const itemV1ToV2: Migration<Omit<Item, 'iconUrl'>, Item> = {
  entityType: "item",
  fromVersion: 1,
  toVersion: 2,
  description: "Add iconUrl field to items",
  
  up(data) {
    return {
      ...data,
      iconUrl: undefined,
    };
  },
  
  down(data) {
    const { iconUrl, ...rest } = data;
    return rest;
  },
  
  validate(data): data is Item {
    return (
      typeof data === "object" &&
      data !== null &&
      "id" in data &&
      "name" in data &&
      "type" in data
    );
  },
};

// Placeholder migrations for other entities - these serve as templates
export const resourceV1ToV2: Migration<ResourceModel, ResourceModel> = {
  entityType: "resource",
  fromVersion: 1,
  toVersion: 2,
  description: "Placeholder migration for resources",
  
  up(data) {
    return data;
  },
  
  down(data) {
    return data;
  },
  
  validate(data): data is ResourceModel {
    return (
      typeof data === "object" &&
      data !== null &&
      "id" in data &&
      "name" in data
    );
  },
};

export const tileV1ToV2: Migration<Tile, Tile> = {
  entityType: "tile",
  fromVersion: 1,
  toVersion: 2,
  description: "Placeholder migration for tiles",
  
  up(data) {
    return data;
  },
  
  down(data) {
    return data;
  },
  
  validate(data): data is Tile {
    return (
      typeof data === "object" &&
      data !== null &&
      "id" in data &&
      "name" in data
    );
  },
};

export const npcV1ToV2: Migration<NPC, NPC> = {
  entityType: "npc",
  fromVersion: 1,
  toVersion: 2,
  description: "Placeholder migration for NPCs",
  
  up(data) {
    return data;
  },
  
  down(data) {
    return data;
  },
  
  validate(data): data is NPC {
    return (
      typeof data === "object" &&
      data !== null &&
      "entity_id" in data &&
      "name" in data
    );
  },
};

export const questV1ToV2: Migration<TileQuest, TileQuest> = {
  entityType: "quest",
  fromVersion: 1,
  toVersion: 2,
  description: "Placeholder migration for quests",
  
  up(data) {
    return data;
  },
  
  down(data) {
    return data;
  },
  
  validate(data): data is TileQuest {
    return (
      typeof data === "object" &&
      data !== null &&
      "id" in data &&
      "name" in data
    );
  },
};

export const houseTileV1ToV2: Migration<HouseTile, HouseTile> = {
  entityType: "houseTile",
  fromVersion: 1,
  toVersion: 2,
  description: "Placeholder migration for house tiles",
  
  up(data) {
    return data;
  },
  
  down(data) {
    return data;
  },
  
  validate(data): data is HouseTile {
    return (
      typeof data === "object" &&
      data !== null &&
      "id" in data &&
      "name" in data
    );
  },
};

// Export all migrations as an array for easy registration
export const allMigrations = [
  itemV1ToV2,
  resourceV1ToV2,
  tileV1ToV2,
  npcV1ToV2,
  questV1ToV2,
  houseTileV1ToV2,
];
