---
name: create-tile
description: Create or edit a world-map tile (a zone/location such as a grove, mine or marketplace) in apps/editor/data/tiles.json, including which resources it hosts. Use when a quest or story needs a new place, when a resource needs somewhere to live, or when asked to add a location/zone/biome.
---

# Create a tile

Read the `game-data` skill first.

Tiles are the world map's zone types. A tile's `resources` are what the player can gather or craft there, its `monsters` what they can fight, and its `effects` what acts on them while they're there. All three are pools, rolled per map cell (see "Tile pools" in `game-data`).

A tile only appears in the game if `data/map.json` places it: in a region's weighted `tiles` (procedural fill) or as a landmark (one pinned cell). Use the `edit-map` skill for that step.

## Steps

1. Check existing tiles (see the lookups in `game-data`). If a fitting place exists, reuse it (and add pool entries to it if needed).
2. Read `packages/types/src/entities/tile.schema.ts` and `pool.schema.ts`.
3. For lore, read the region it belongs to (`jq '.regions[] | select(.id=="…")' data/world-bible.json`) and `naming.placePatterns`.
4. Make sure every resource ID you list exists (`create-resource` first if not).
5. Append to `data/tiles.json`.
6. Place it on the map (`edit-map`): add `{ "id", "weight" }` to the region(s) it belongs in, or pin it as a landmark if it's a one-off place (a station, a camp, a lair, an NPC's home).
7. Validate with `--ids` covering the tile and `map` (or the region/landmark IDs you touched).

## Field guidance

| Field | Guidance |
|---|---|
| `id` | `tile_<snake_name>` |
| `name` | Follows `naming.placePatterns` for notable places (`Whispering Marsh`). Plain names for generic terrain (`Grass`) |
| `description` | 1–2 sentences of atmosphere |
| `theme` | A visual theme key used by existing tiles: `forest`, `meadow`, `swamp`, `mine`, `cave`, `mountain`, `frozen`, `waterfall`, `city`, `storm`, `lemonade`, `coffee`, `retro`, `nord`. Reuse one. Don't put a story theme here |
| `color` / `backgroundColor` | Hex colours; a light foreground on a darker background, matching tiles of the same theme |
| `accessible` | `false` only for impassable terrain: walls, and the `tile_uncharted_<region>` placeholders that close regions not built yet. Inaccessible tiles can't have pools |
| `resources` | Pool of `{ "id" }` resource entries; can be empty. Use `oneOf` for "one of these per cell" and `chance` for things only some cells have |
| `monsters` | Optional pool of `{ "id", "count"? }` monster entries (`create-monster`). `count` spawns several; don't list an ID twice |
| `effects` | Optional pool of `{ "id", "strength" }` from `data/effects.json` (`create-effect`), active on anyone on the cell, in the zone or on the map. Hazards (spores, cold, dark) push players to bring protection; `effect_rest` makes a safe place heal faster. A regional gradient (spores by tier) belongs on the map region instead. Make sure a hazard has a counter the player can get. Optional boons like `effect_bountiful` suit a `chance` entry |
| (placement) | Not a tile field: how common a tile is comes from its region weights in `data/map.json` |
| `texture`, `image` | Only if you know the asset exists |

Example: `{ "id": "tile_reedbed", "name": "Reedbed", "theme": "swamp", "accessible": true, "resources": [{ "id": "resource_reeds" }, { "id": "resource_clay", "chance": 0.6 }], "monsters": [{ "id": "monster_mossback_toad", "count": 2 }], "effects": [{ "id": "effect_bountiful", "strength": 25, "chance": 0.2 }], "color": "#…", "backgroundColor": "#…" }`. Look at a same-theme tile for real colours.

Pool data describes what a place contains, not how many cells there are, so keep it meaningful at any cell size.
