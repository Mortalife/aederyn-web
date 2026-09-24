import type { Tile } from "../../config/types.js";

const tile = (id: string, changes: Partial<Tile> = {}): Tile => ({
  id,
  name: id,
  color: "#000000",
  backgroundColor: "#ffffff",
  theme: "meadow",
  resources: [],
  accessible: true,
  ...changes,
});

export const tileTypes: Tile[] = [
  tile("tile_campsite", { name: "Campsite", effects: [{ id: "effect_rest", strength: 3 }] }),
  tile("tile_grass", {
    name: "Grass",
    resources: [{ id: "resource_grass_01" }, { id: "resource_stones_01" }],
    monsters: [{ id: "monster_chicken", count: 2 }],
  }),
  tile("tile_trees", { name: "Trees", resources: [{ id: "resource_trees_01" }] }),
  tile("tile_enchanted_grove", { name: "Grove", resources: [{ id: "resource_trees_01" }] }),
  tile("tile_rocky_outcrop", { name: "Stone Yard" }),
  tile("tile_wall", { name: "Wall", accessible: false }),
];

export const tileTypesMap = new Map(tileTypes.map((t) => [t.id, t]));
