import type { MapData } from "../../config/types.js";

export const worldMap: MapData = {
  bounds: { minX: 0, maxX: 39, minY: 0, maxY: 39 },
  regions: [
    {
      id: "landing",
      tier: 0,
      anchors: [{ x: 20, y: 34 }],
      tiles: [
        { id: "tile_grass", weight: 3 },
        { id: "tile_trees", weight: 1 },
      ],
      effects: [],
    },
    {
      id: "woods",
      tier: 1,
      anchors: [{ x: 20, y: 15 }],
      tiles: [
        { id: "tile_trees", weight: 2 },
        { id: "tile_enchanted_grove", weight: 1 },
      ],
      effects: [],
    },
  ],
  landmarks: [
    { id: "landmark_camp", x: 20, y: 37, tile: "tile_campsite", spawn: true },
    { id: "landmark_wall", x: 19, y: 37, tile: "tile_wall" },
    { id: "landmark_stone_yard", x: 22, y: 37, tile: "tile_rocky_outcrop" },
    { id: "landmark_grove", x: 20, y: 12, tile: "tile_enchanted_grove" },
  ],
};
