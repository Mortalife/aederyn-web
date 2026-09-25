import { reader } from "../db/reader.js";

/**
 * What a discovery row's `id` holds, per kind:
 * - `tile`, `heard_tile`: a position, as `tileKey` writes it
 * - `monster`: a monster id, found once a fight with it ends
 * - `monster_drop`: `monsterId:itemId`, found when the kill drops it
 * - `recipe`: a resource id completed at a station
 * - `resource_output`: `resourceId:itemId`, found when completing gives it
 * - `item`: an item id the player has held
 * - `npc`: an NPC's entity id, found by talking to them
 */
export type DiscoveryKind =
  | "tile"
  | "heard_tile"
  | "monster"
  | "monster_drop"
  | "recipe"
  | "resource_output"
  | "item"
  | "npc";

export type Discoveries = {
  tiles: Set<string>;
  heardTiles: Set<string>;
  monsters: Set<string>;
  monsterDrops: Set<string>;
  recipes: Set<string>;
  resourceOutputs: Set<string>;
  items: Set<string>;
  npcs: Set<string>;
};

const fields: Record<DiscoveryKind, keyof Discoveries> = {
  tile: "tiles",
  heard_tile: "heardTiles",
  monster: "monsters",
  monster_drop: "monsterDrops",
  recipe: "recipes",
  resource_output: "resourceOutputs",
  item: "items",
  npc: "npcs",
};

export const tileKey = (x: number, y: number) => `${x},${y}`;

export const pairKey = (a: string, b: string) => `${a}:${b}`;

export const emptyDiscoveries = (): Discoveries => ({
  tiles: new Set(),
  heardTiles: new Set(),
  monsters: new Set(),
  monsterDrops: new Set(),
  recipes: new Set(),
  resourceOutputs: new Set(),
  items: new Set(),
  npcs: new Set(),
});

const selectDiscoveries = reader.prepare<
  [string],
  { kind: DiscoveryKind; id: string }
>("SELECT kind, id FROM discoveries WHERE user_id = ?");

export const getDiscoveries = (user_id: string): Discoveries => {
  const discoveries = emptyDiscoveries();
  for (const { kind, id } of selectDiscoveries.all(user_id)) {
    discoveries[fields[kind]]?.add(id);
  }
  return discoveries;
};
