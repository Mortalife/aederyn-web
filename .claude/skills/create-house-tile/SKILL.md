---
name: create-house-tile
description: Create or edit a house tile (player homestead tile with actions such as till, plant, water, harvest) in apps/editor/data/house-tiles.json. Use when adding farming/homestead mechanics, a new tile state in a growth chain, or a homestead action.
---

# Create a house tile

Read the `game-data` skill first.

House tiles are the player's homestead grid. Each tile has **actions**; an action can require items, take time, yield items and **transform the tile** into another house tile. Chains of transformations make up mechanics like `grass → soil → seedling → plant`.

`data/house-tiles.json` is an **object keyed by ID**, not an array, and each value's `id` must equal its key.

## Steps

1. See the existing tiles and chains: `jq 'to_entries[] | {id: .key, actions: [.value.availableActions[] | {id, to: .result.resultingTileId}]}' apps/editor/data/house-tiles.json -c`
2. Read `packages/types/src/entities/house-tile.schema.ts` (`HouseTileSchema`, `TileActionSchema`); requirement and yield entries use the quest `RequirementRewardSchema` (`{ "type": "item", "item_id", "amount" }` or `{ "type": "gold", "amount" }`).
3. Create any tiles that the chain transforms into, and any items that actions require or yield (`create-item`). Every `resultingTileId` and `adjacentTiles` entry must be a house-tile key.
4. Add the key(s) to `data/house-tiles.json` and validate.

## Field guidance

| Field | Guidance |
|---|---|
| key / `id` | Bare snake_case state name: `soil`, `seedling`, `barren_soil` |
| `sprite` | `assets/tiles/<id>.png`. Mention in your summary that the sprite asset needs creating if it doesn't exist |
| `bgColor` | Hex colour fitting the state |
| `flags` | `{ "isWalkable": true }` plus `isWaterSource` or `isStructure` when relevant |
| `availableActions[]` | `{ id, name, description, requirements: { requirements?: [...], timeToComplete?, prerequisites?: { adjacentTiles? } }, result: { resultingTileId?, yields?: [...] }, canUndo }` |
| `availableResources` | Optional resource IDs usable on this tile |

Example from the current data:

```json
"soil": {
  "id": "soil", "name": "Tilled Soil", "description": "Fertile soil ready for planting",
  "sprite": "assets/tiles/soil.png", "bgColor": "#964B00", "flags": { "isWalkable": true },
  "availableActions": [{
    "id": "plant_seed", "name": "Plant Seed", "description": "Plant seeds in the tilled soil",
    "requirements": { "requirements": [{ "type": "item", "item_id": "item_seed_01", "amount": 1 }], "timeToComplete": 10 },
    "result": { "resultingTileId": "seedling" }, "canUndo": false
  }]
}
```

Heads-up: the existing farming chain requires `item_seed_01`, `item_water_01`, `item_sickle_01` and `item_fertilizer_01`, and none of them exist yet (the validator reports these). If you're working on farming, creating those items is the first fix.
