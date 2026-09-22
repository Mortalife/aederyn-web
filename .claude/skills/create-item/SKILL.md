---
name: create-item
description: Create or edit an item (materials, tools, weapons, armour, consumables, quest items) in apps/editor/data/items.json, and make sure the player can actually obtain it. Use when asked to add or change an item, or when a quest or resource needs one.
---

# Create an item

Read the `game-data` skill first for file locations, lookups, editing rules and validation.

## Steps

1. **Check for an existing item** with the same role: `jq -r '.[] | "\(.id)\t\(.name)\t\(.type)\t\(.rarity)"' apps/editor/data/items.json`. Reuse it if it fits.
2. **Read the schema**: `packages/types/src/entities/item.schema.ts` (`ItemSchema`).
3. **Write the item** at the end of `data/items.json`.
4. **Make it obtainable**, unless it's only a quest reward. Something must produce it:
   - a gathering resource (`create-resource`) whose `reward_items` include it, placed on a tile, or
   - a crafting station (`create-resource`, `type: "workbench"`) whose `reward_items` include it, placed on a tile, or
   - a house-tile action with `result.yields` of it (`create-house-tile`).
5. **Validate** with `--ids` covering the item and anything else you created.

## Field guidance

| Field | Guidance |
|---|---|
| `id` | `item_<snake_name>`, free of collisions |
| `name` | Follows `world-bible.naming.itemPatterns` for notable items. Plain names (`Stick`, `Clay`) are fine for basic materials |
| `description` | 1–3 sentences; hint at its use or lore |
| `type` | `resource` (raw/crafting material), `tool` (used via a resource's `required_items`), `weapon`, `armor`, `consumable`, `quest` (quest-only object), `item` (other) |
| `rarity` | `common` → `legendary` |
| `value` | Match existing data: common 1–40 (typically ~5), uncommon 10–100 (~25), rare 50–200 (~150), epic ~1200–1500. Legendary has no precedent, so keep it above epic |
| `weight` | Materials 0.1–1, tools 1–3, heavy gear more |
| `stackable` / `maxStackSize` | Materials: `true` / `99`. Tools, gear and unique quest items: `false` / `1` |
| `equippable` / `equipSlot` | Tools and gear that are held or worn: `true` plus a slot (`mainHand`, `offHand`, `head`, `chest`, `legs`, `feet`, `hands`, `accessory`). Otherwise `false` and omit `equipSlot` |
| `durability` | Tools that wear out: `{ "current": N, "max": N }`. Resources reduce it via `required_items[].itemDurabilityReduction` |
| `attributes`, `requirements`, `effects` | Only when they mean something for this item |

Example material and tool from the current data:

```json
{ "id": "item_grass_01", "name": "Wild Grass", "description": "A handful of common wild grass. Can be used in crafting or alchemy.", "type": "resource", "rarity": "common", "stackable": true, "maxStackSize": 99, "equippable": false, "value": 1, "weight": 0.1 }
{ "id": "item_stone_axe_01", "name": "Stone Axe", "description": "A simple axe made from a stone head and a wooden handle.", "type": "item", "rarity": "common", "stackable": false, "maxStackSize": 1, "equippable": true, "equipSlot": "mainHand", "durability": { "current": 10, "max": 10 }, "value": 10, "weight": 2.5, "attributes": { "damage": 2 } }
```

## Editing an existing item

Check what depends on it first: `grep -l '"<id>"' apps/editor/data/*.json`. Never change an `id` in place; if a rename is really needed, update every reference in the same change and validate all of them.
