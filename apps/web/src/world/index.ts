import {
  cellKey,
  inBounds,
  landmarkAt,
  regionAt,
  rollPool,
  seededUnit,
  pickWeighted,
} from "@aederyn/types";
import {
  MAP_BOUNDS,
  VISIBILITY,
  worldMap,
  type EffectStrength,
  type MapRegion,
  type RequiredItem,
  type Resource,
  type ResourceModel,
  type RewardItem,
  type Tile,
} from "../config.js";
import type { ResourceUsage } from "./resources.js";
import { resourcesById } from "../config/resources.js";
import { itemsById } from "../config/items.js";
import { tileTypesMap } from "../config/tiles.js";

export type Point = {
  x: number;
  y: number;
};

/**
 * A map cell: its tile with the pools rolled for this position. `monsters`
 * lists one ID per spawn, so a spawn's index identifies it on the cell.
 */
export type Cell = Omit<Tile, "resources" | "monsters" | "effects"> & {
  resources: string[];
  monsters: string[];
  effects: EffectStrength[];
  region: MapRegion | null;
  landmark: string | null;
};

const tileConfig = (id: string) => {
  const tile = tileTypesMap.get(id);
  if (!tile) {
    throw new Error(`Tile ${id} not found`);
  }
  return tile;
};

/** The tile a cell shows: its landmark's, otherwise one of its region's. */
const selectTileAt = (x: number, y: number) => {
  const landmark = landmarkAt(worldMap, x, y);
  const region = regionAt(worldMap, x, y);

  if (landmark) {
    return { tile: tileConfig(landmark.tile), region, landmark: landmark.id };
  }

  const picked = region && pickWeighted(region.tiles, seededUnit(`tile:${x},${y}`));
  if (!picked) {
    throw new Error(`No region fills ${x},${y}`);
  }
  return { tile: tileConfig(picked.id), region, landmark: null };
};

export const rollCell = (x: number, y: number): Cell => {
  const { tile, region, landmark } = selectTileAt(x, y);
  const seed = cellKey(x, y);

  return {
    ...tile,
    resources: rollPool(tile.resources, `${seed}:resources`).map((r) => r.id),
    monsters: rollPool(tile.monsters, `${seed}:monsters`).flatMap((m) =>
      Array<string>(m.count ?? 1).fill(m.id)
    ),
    effects: rollPool(tile.effects, `${seed}:effects`),
    region,
    landmark,
  };
};

const tileSelections = new Map<string, Cell>();

/** The cell at a position. Deterministic, so it's memoized. */
export const getTileSelection = (x: number, y: number) => {
  const key = cellKey(x, y);
  let tile = tileSelections.get(key);

  if (!tile) {
    tile = rollCell(x, y);
    tileSelections.set(key, tile);
  }

  return tile;
};

export const isOutOfBounds = (x: number, y: number) =>
  !inBounds(MAP_BOUNDS, x, y);

/** Every in-bounds cell, row by row. */
export function* allCells() {
  for (let y = MAP_BOUNDS.minY; y <= MAP_BOUNDS.maxY; y++) {
    for (let x = MAP_BOUNDS.minX; x <= MAP_BOUNDS.maxX; x++) {
      yield { x, y, tile: getTileSelection(x, y) };
    }
  }
}

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
