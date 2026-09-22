import {
  MAP_HEIGHT,
  MAP_WIDTH,
  START_POSITION,
  tileTypes,
  VISIBILITY,
  type RequiredItem,
  type Resource,
  type ResourceModel,
  type RewardItem,
} from "../config.js";
import type { ResourceUsage } from "./resources.js";
import { selectRandom } from "../lib/random.js";
import { resourcesById } from "../config/resources.js";
import { itemsById } from "../config/items.js";
import { tileTypesMap } from "../config/tiles.js";

export type Point = {
  x: number;
  y: number;
};

export const calculateDistance = (point1: Point, point2: Point): number => {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const miscTiles = {
  // "22,30": "tile_castle_wall",
  // "23,29": "tile_castle_wall",
  // "24,29": "tile_castle_wall",
  // "25,30": "tile_castle_wall",
  // "25,31": "tile_castle_wall",
  // "25,32": "tile_castle_wall",
  // "24,32": "tile_castle_wall",
  // "23,33": "tile_castle_wall",
  // "22,32": "tile_castle_wall",
  "12,11": "tile_basic_workshop",
};

// Rarer tiles first. Sorted once: tile selection only depends on config.
const tilesByRarity = [...tileTypes].sort((a, b) => a.rarity - b.rarity);

const selectTile = (x: number, y: number) => {
  const coords = `${x},${y}`;

  if (miscTiles[coords as keyof typeof miscTiles]) {
    const tile = tileTypesMap.get(miscTiles[coords as keyof typeof miscTiles]);

    if (!tile) {
      throw new Error(
        `Castle tile ${miscTiles[coords as keyof typeof miscTiles]} not found`
      );
    }

    return tile;
  }

  const center = START_POSITION;
  if (center.x === x && center.y === y) {
    const camp = tileTypesMap.get("tile_campsite");

    if (!camp) {
      throw new Error("Campsite not found");
    }

    return camp;
  }

  const distance = calculateDistance(center, { x, y });

  // Calculate a rarity factor based on the distance from the center
  const rarityFactor =
    1 - Math.min(1, distance / Math.max(MAP_WIDTH, MAP_HEIGHT));

  // Calculate the index to split the sorted tiles
  const splitIndex = Math.floor(tilesByRarity.length * rarityFactor);

  // Select tiles based on the rarity factor
  const selectedTiles =
    rarityFactor === 0 ? tilesByRarity : tilesByRarity.slice(0, splitIndex + 1);

  const tile = selectRandom(coords, selectedTiles);

  if (!tile) {
    throw new Error("No tile found");
  }

  return tile;
};

const tileSelections = new Map<string, ReturnType<typeof selectTile>>();

/** The tile config at a position. Deterministic, so it's memoized. */
export const getTileSelection = (x: number, y: number) => {
  const key = `${x},${y}`;
  let tile = tileSelections.get(key);

  if (!tile) {
    tile = selectTile(x, y);
    tileSelections.set(key, tile);
  }

  return tile;
};

export const isOutOfBounds = (x: number, y: number) => {
  return x < 0 || x > MAP_WIDTH || y < 0 || y > MAP_HEIGHT;
};

const resolveResource = (resourceModel: ResourceModel): Resource | null => {
  let isValid = true;
  const resource = {
    ...resourceModel,

    // Convert item_ids to items
    required_items: resourceModel.required_items.map<RequiredItem>((i) => {
      const item = itemsById.get(i.item_id);
      if (!item) {
        isValid = false;
        return {} as RequiredItem;
      }

      return {
        qty: i.qty,
        item: item,
        consumed: i.consumed,
        itemDurabilityReduction: i.itemDurabilityReduction,
      };
    }),

    // Convert item_ids to items
    reward_items: resourceModel.reward_items.map<RewardItem>((i) => {
      const item = itemsById.get(i.item_id);
      if (!item) {
        isValid = false;
        return {} as RewardItem;
      }

      return {
        qty: i.qty,
        item,
      };
    }),

    amount_remaining: resourceModel.amount,
  };

  if (!isValid) {
    console.error("Invalid resource", resource);
    return null;
  }

  return resource;
};

const resolveTile = (x: number, y: number) => {
  const tile = getTileSelection(x, y);

  return {
    ...tile,
    resources: tile.resources
      .map((id) => {
        const resourceModel = resourcesById.get(id);
        return resourceModel ? resolveResource(resourceModel) : null;
      })
      .filter((r) => !!r) as Resource[],
  };
};

const resolvedTiles = new Map<string, ReturnType<typeof resolveTile>>();

/**
 * The tile's config with resources resolved, and `amount_remaining` taken
 * from the usage. Pass no usage when only the config matters. The result
 * is shared between calls: don't mutate it.
 */
export const buildTile = (
  x: number,
  y: number,
  resourceUsage: ResourceUsage[] = []
) => {
  const key = `${x},${y}`;
  let tile = resolvedTiles.get(key);

  if (!tile) {
    tile = resolveTile(x, y);
    resolvedTiles.set(key, tile);
  }

  const usage = resourceUsage.filter((u) => u.x === x && u.y === y);

  if (usage.length === 0) {
    return tile;
  }

  return {
    ...tile,
    resources: tile.resources.map((resource) => {
      const activity = usage.find((u) => u.resource_id === resource.id);

      return activity
        ? { ...resource, amount_remaining: resource.amount - activity.qty }
        : resource;
    }),
  };
};

/** The visible area around a position, inclusive. */
export const visibleArea = (position: Point) => {
  const from = Math.ceil(-VISIBILITY / 2);
  const to = Math.ceil(VISIBILITY / 2) - 1;

  return {
    fromX: position.x + from,
    toX: position.x + to,
    fromY: position.y + from,
    toY: position.y + to,
  };
};

/** `usage` should cover the visible area: see `getResourceUsageInArea`. */
export const generateMap = (position: Point, usage: ResourceUsage[]) => {
  const { fromX, toX, fromY, toY } = visibleArea(position);
  const map = [];
  for (let x = fromX; x <= toX; x++) {
    for (let y = fromY; y <= toY; y++) {
      map.push({
        x,
        y,
        here: x === position.x && y === position.y,
        tile: isOutOfBounds(x, y) ? null : buildTile(x, y, usage),
      });
    }
  }

  return map;
};

export type WorldTile = ReturnType<typeof generateMap>[number];
