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
   - a house-tile action with `result.yields` of it (`create-house-tile`), or
   - a monster's `drops` (`create-monster`).
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
| `weapon` | Weapons only, and required for them: `type: "weapon"`, `equipSlot: "mainHand"`, plus `{ "style", "damage", "speed" }`. `style` is `melee`, `ranged` or `magic`. `damage` is a whole number per hit, 10–40: fast weapons low, slow ones high. `speed` is milliseconds between attacks, 1000–3000. Give weapons `durability`: each attack uses 1. See `docs/COMBAT.md` |
| `defence` | Armour and shields: `{ "melee", "ranged", "magic" }`, 0–60 per piece. A full set tops out around 200. Only on equippable items. Give each weight of armour a different profile (heavy is strong against melee and weak against magic) |
| `effects` | The on-use list: `[{ "id", "strength", "duration" }]` referencing `data/effects.json` (`create-effect`). The item gets a Use button; using it consumes one from the stack. `duration` is seconds; `0` applies a `health` effect instantly (a heal of `strength` HP). Using the item again restarts its timers rather than stacking. Usually `type: "consumable"`, stackable |
| `wornEffects` | `[{ "id", "strength" }]`, active while equipped. Only on equippable items. This is how gear protects against tile hazards: a mask with `effect_spore_ward`, a torch with `effect_light`. Pick the slot so protections compete sensibly (a light in `offHand` competes with shields) |
| `attributes`, `requirements` | Only when they mean something for this item. The game doesn't read `attributes`. Use `weapon`, `defence` and `wornEffects` instead |

Example material and tool from the current data:

```json
{ "id": "item_grass_01", "name": "Wild Grass", "description": "A handful of common wild grass. Can be used in crafting or alchemy.", "type": "resource", "rarity": "common", "stackable": true, "maxStackSize": 99, "equippable": false, "value": 1, "weight": 0.1 }
{ "id": "item_stone_axe_01", "name": "Stone Axe", "description": "A simple axe made from a stone head and a wooden handle.", "type": "item", "rarity": "common", "stackable": false, "maxStackSize": 1, "equippable": true, "equipSlot": "mainHand", "durability": { "current": 10, "max": 10 }, "value": 10, "weight": 2.5, "attributes": { "damage": 2 } }
```

## Editing an existing item

Check what depends on it first: `grep -l '"<id>"' apps/editor/data/*.json`. Never change an `id` in place; if a rename is really needed, update every reference in the same change and validate all of them.
