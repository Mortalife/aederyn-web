import {
  items,
  MAP_HEIGHT,
  MAP_WIDTH,
  resources,
  START_POSITION,
  tileTypes,
  VISIBILITY,
  type RequiredItem,
  type Resource,
  type RewardItem,
} from "../config";
import { getResourceUsage } from "./resources";
import { selectRandom } from "../lib/random";

export type Point = {
  x: number;
  y: number;
};

export const calculateDistance = (point1: Point, point2: Point): number => {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const getTileSelection = (x: number, y: number) => {
  const string = `${x},${y}`;

  const center = START_POSITION;
  if (center.x === x && center.y === y) {
    const camp = tileTypes.find((t) => t.id === "tile_campsite");

    if (!camp) {
      throw new Error("Campsite not found");
    }

    return camp;
  }

  const distance = calculateDistance(center, { x, y });

  // Calculate a rarity factor based on the distance from the center
  const rarityFactor =
    1 - Math.min(1, distance / Math.max(MAP_WIDTH, MAP_HEIGHT));

  // Sort tiles by rarity, with rarer tiles first
  const sortedTiles = [...tileTypes].sort((a, b) => a.rarity - b.rarity);

  // Calculate the index to split the sorted tiles
  const splitIndex = Math.floor(sortedTiles.length * rarityFactor);

  // Select tiles based on the rarity factor
  const selectedTiles =
    rarityFactor === 0 ? sortedTiles : sortedTiles.slice(0, splitIndex + 1);

  const tile = selectRandom(string, selectedTiles);

  if (!tile) {
    throw new Error("No tile found");
  }

  return tile;
};
console.log(getTileSelection(0, 0));

export const isOutOfBounds = (x: number, y: number) => {
  return x < 0 || x > MAP_WIDTH || y < 0 || y > MAP_HEIGHT;
};

export const getTile = async (x: number, y: number) => {
  if (isOutOfBounds(x, y)) {
    return null;
  }

  const tile = getTileSelection(x, y);
  const resourceUsage = await getResourceUsage(x, y);

  return {
    ...tile,
    resources: tile.resources
      .map<Resource | null>((r) => {
        const resourceModel = resources.find((a) => a.id === r);
        if (!resourceModel) {
          return null;
        }

        const activity = resourceUsage.find(
          (a) => a.resource_id === resourceModel.id
        );

        if (activity) {
        }

        let isValid = true;
        const resource = {
          ...resourceModel,

          // Convert item_ids to items
          required_items: resourceModel.required_items.map<RequiredItem>(
            (i) => {
              const item = items.find((a) => a.id === i.item_id);
              if (!item) {
                isValid = false;
                return {} as RequiredItem;
              }

              return {
                qty: i.qty,
                item: item,
                consumed: i.consumed,
              };
            }
          ),

          // Convert item_ids to items
          reward_items: resourceModel.reward_items.map<RewardItem>((i) => {
            const item = items.find((a) => a.id === i.item_id);
            if (!item) {
              isValid = false;
              return {} as RewardItem;
            }

            return {
              qty: i.qty,
              item,
            };
          }),

          // Set the amount to the real amount remaining
          amount: activity
            ? resourceModel.amount - activity.qty
            : resourceModel.amount,
        };

        if (!isValid) {
          console.error("Invalid resource", resource);
          return null;
        }

        return resource;
      })
      .filter((a) => !!a) as Resource[],
  };
};

export const generateMap = async (position: { x: number; y: number }) => {
  const map = [];
  for (let x = Math.ceil(-VISIBILITY / 2); x < Math.ceil(VISIBILITY / 2); x++) {
    for (
      let y = Math.ceil(-VISIBILITY / 2);
      y < Math.ceil(VISIBILITY / 2);
      y++
    ) {
      const xPos = position.x + x;
      const yPos = position.y + y;

      map.push({
        x: xPos,
        y: yPos,
        here: x === 0 && y === 0,
        tile: await getTile(xPos, yPos),
      });
    }
  }

  return map;
};

export type WorldTile = Awaited<ReturnType<typeof generateMap>>[number];
