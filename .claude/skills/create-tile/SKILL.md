---
name: create-tile
description: Create or edit a world-map tile (a zone/location such as a grove, mine or marketplace) in apps/editor/data/tiles.json, including which resources it hosts. Use when a quest or story needs a new place, when a resource needs somewhere to live, or when asked to add a location/zone/biome.
---

# Create a tile

Read the `game-data` skill first.

Tiles are the world map's zones. A quest's `zone_id` fields are tile IDs, and NPCs are "located" by quest references to a tile. A tile's `resources` are what the player can gather or craft there.

## Steps

1. Check existing tiles: `jq -r '.[] | "\(.id)\t\(.name)\t\(.theme)\t\(.rarity)\t\(.resources|join(","))"' apps/editor/data/tiles.json`. If a fitting place exists, reuse it (and add resources to it if needed).
2. Read `packages/types/src/entities/tile.schema.ts`.
3. For lore, read the region it belongs to (`jq '.regions[] | select(.id=="…")' data/world-bible.json`) and `naming.placePatterns`.
4. Make sure every resource ID you list exists (`create-resource` first if not).
5. Append to `data/tiles.json` and validate.

## Field guidance

| Field | Guidance |
|---|---|
| `id` | `tile_<snake_name>` |
| `name` | Follows `naming.placePatterns` for notable places (`Whispering Marsh`). Plain names for generic terrain (`Grass`) |
| `description` | 1–2 sentences of atmosphere |
| `theme` | A visual theme key used by existing tiles: `forest`, `meadow`, `swamp`, `mine`, `cave`, `mountain`, `frozen`, `waterfall`, `city`, `storm`, `lemonade`, `coffee`, `retro`, `nord`. Reuse one. Don't put a story theme here |
| `color` / `backgroundColor` | Hex colours; a light foreground on a darker background, matching tiles of the same theme |
| `rarity` | **Spawn weight from 0 to 1**: common terrain 0.3, special places 0.1–0.25, very rare 0.02. Use `0` for hand-placed tiles that should never spawn randomly (quest locations, workshops, walls). The validator warns outside 0–1 |
| `accessible` | `false` only for impassable terrain (walls) |
| `resources` | Resource IDs available here; can be empty |
| `texture`, `image` | Only if you know the asset exists |

Example: `{ "id": "tile_mystic_marsh", "name": "Mystic Marsh", "theme": "swamp", "rarity": 0.25, "accessible": true, "resources": ["resource_mud", "resource_cattails"], "color": "#…", "backgroundColor": "#…" }`. Look at a same-theme tile for real colours.

Note: `data/tiles.json` currently has `tile_mountain_peak` twice (a pre-existing duplicate the validator reports). Don't copy that pattern.
