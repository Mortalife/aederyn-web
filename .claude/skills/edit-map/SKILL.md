---
name: edit-map
description: Edit the world map in apps/editor/data/map.json: its bounds, regions (anchors, weighted tiles, region effects) and landmarks (pinned tiles such as camp, stations and NPC homes, one of which is the spawn). Use when a tile needs to appear in the world, when a place or NPC home needs a fixed position, when a region's feel, tier or hazards change, or when the map needs to grow.
---

# Edit the map

Read the `game-data` skill first. The editor's **Map** page edits the same file with a live preview; this skill is for editing the JSON directly.

`data/map.json` owns the world's structure. Tiles say what a place is; the map says where places are. The world bible owns the lore, joined to map regions by ID.

```json
{
  "bounds": { "minX": 0, "maxX": 39, "minY": 0, "maxY": 39 },
  "regions": [
    { "id": "landing", "tier": 0, "anchors": [{ "x": 20, "y": 36 }], "tiles": [{ "id": "tile_grass", "weight": 3 }], "effects": [] }
  ],
  "landmarks": [
    { "id": "landmark_camp", "x": 20, "y": 37, "tile": "tile_campsite", "spawn": true }
  ]
}
```

## How a cell is resolved

1. **Landmark**: a landmark at the cell pins its tile there, overriding everything.
2. **Region**: otherwise the cell belongs to the region with the nearest anchor. Distance is measured from a smoothly jittered copy of the cell, so borders wobble by up to about two cells but never move between runs.
3. **Tile**: the region's `tiles` pick one tile per cell by weight, deterministically per cell.
4. **Pools**: the tile's resource, monster and effect pools are rolled for the cell (see `game-data`).

Region `effects` apply to every cell of the region (landmarks included) and add to the tile's effects.

## Fields

| Field | Guidance |
|---|---|
| `bounds` | Inclusive, and may be negative. Grow the map by moving a bound outward, never by shifting coordinates: placed content keeps its absolute position. North is lower `y` |
| `regions[].id` | Lowercase with hyphens, matching the world bible region it stands for |
| `regions[].tier` | Difficulty tier; 0 is the starting area around camp |
| `regions[].anchors` | One or more `{ x, y }` inside the bounds. More anchors make longer or bent regions; move anchors to move borders |
| `regions[].tiles` | `{ id, weight }` with weight > 0. Weights are relative within the region: common terrain 2–3, special places 0.5–1. A tile can be in several regions. A region filled with one inaccessible placeholder tile (`tile_uncharted_<region>`) is walled off until its content exists; swap the placeholder for real tiles when it's built |
| `regions[].effects` | `{ id, strength }`: the region's hazard or boon level, e.g. spores rising by tier |
| `landmarks[].id` | `landmark_<snake_name>`; NPC `home`s reference it |
| `landmarks[].tile` | The tile pinned at `x, y`, usually a tile made for that place and in no region's fill |
| `landmarks[].spawn` | `true` on exactly one landmark: where players start and return to when they die |

Use a landmark for anything that must exist exactly once or exactly somewhere: camp, crafting stations, a holdfast, wardstones, lairs, NPC homes, or a cell that fixes an awkward border.

## Steps

1. Look at the current map (`game-data` has the lookups) and, for a new region, the world bible region it belongs to.
2. Make every referenced tile and effect exist first (`create-tile`, `create-effect`).
3. Edit `data/map.json`, keeping `JSON.stringify(data, null, 2)` formatting.
4. Check the result on the editor's Map page preview if you moved anchors: regions should be contiguous-looking blobs and camp's region should be tier 0.
5. Validate: `pnpm --filter editor validate --ids map,<region and landmark ids>,<npc ids> --warnings`. It checks references, weights, that anchors and landmarks are inside the bounds, that landmarks don't share a cell, that there's exactly one spawn, and that NPC homes are real landmarks. It warns about accessible tiles that no region or landmark places.
