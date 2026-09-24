---
name: create-resource
description: Create or edit a resource in apps/editor/data/resources.json. Resources are gathering nodes or recipes performed at a station. Use when an item needs a source, when adding a crafting recipe, or when a quest needs something to gather or craft.
---

# Create a resource

Read the `game-data` skill first.

A resource is anything the player interacts with to receive items:

- **Gathering node** (`type: "resource"`): the player spends `collectionTime` and gets `reward_items`, optionally needing a tool in `required_items` (`consumed: false`).
- **Station recipe** (`type` names the physical station, such as `workbench`, `campfire`, `forge`, or `kiln`): one resource per recipe. The ingredients go in `required_items` with `consumed: true`, and the crafted item in `reward_items`. Quest `craft` objectives point at these. Use `verb` for the action at that station, such as `Cook`, `Smelt`, or `Forge`.

A resource is only reachable if it's in some tile's `resources` pool (or a house tile's `availableResources`), and that tile is on the map. Add it to one: `create-tile` for a new tile, or add `{ "id": "resource_x" }` (optionally with `chance`, or inside a `oneOf`) to an existing tile's `resources`.

## Steps

1. Look for an existing resource: `jq -r '.[] | "\(.id)\t\(.name)\t\(.type)\t\([.reward_items[].item_id]|join(","))"' apps/editor/data/resources.json`.
2. Read `packages/types/src/entities/resource.schema.ts` (`ResourceModelSchema`; the data file stores the *Model* shape, with `item_id` references rather than full items).
3. Make sure every item in `reward_items` and `required_items` exists; if not, use `create-item` first.
4. Append the resource to `data/resources.json`.
5. Place it on a tile with the station named by its `type` (a pinned landmark), e.g. `tile_workbench` or `tile_campfire` at camp. Gathering nodes go on a tile whose theme fits.
6. Validate with `--ids` covering the resource, the tile you edited, and any new items.

## Field guidance

| Field | Guidance |
|---|---|
| `id` | Gathering: `resource_<thing>` (`resource_copper_deposit`). Crafting: `resource_crafting_<item>` |
| `name` | What the player sees on the tile: `Oak Tree`, or the crafted item's name for recipes |
| `verb` | Action label: `Chop`, `Mine`, `Collect`, `Pick`, `Craft`, `Smelt`, `Enchant` |
| `collectionTime` | Same units as existing data: simple gathers 3–5, harder nodes 6–15, crafting 10–40 |
| `amount` / `limitless` | Gathering nodes: a small `amount` (1–5) and `limitless: false` so they deplete. Crafting stations: `amount: 1`, `limitless: true` |
| `reward_items` | `[{ "item_id", "qty" }]` |
| `required_items` | `[{ "item_id", "qty", "consumed", "itemDurabilityReduction"? }]`. Tools: `consumed: false`, optionally with durability loss. Ingredients: `consumed: true` |

Examples from the current data:

```json
{ "id": "resource_grass_01", "name": "Grass", "amount": 1, "limitless": false, "reward_items": [{ "item_id": "item_grass_01", "qty": 1 }], "required_items": [], "collectionTime": 3, "type": "resource", "verb": "Collect" }
{ "id": "resource_crafting_item_stone_axe_01", "name": "Stone Axe", "limitless": true, "amount": 1, "reward_items": [{ "item_id": "item_stone_axe_01", "qty": 1 }], "required_items": [{ "item_id": "item_stick_01", "qty": 1, "consumed": true }, { "item_id": "item_stone_01", "qty": 1, "consumed": true }], "collectionTime": 10, "type": "workbench", "verb": "Craft" }
```

Keep value per unit of time in line with nodes of similar rarity. `validate --warnings` doesn't check this yet, so compare against a few existing resources by hand.
