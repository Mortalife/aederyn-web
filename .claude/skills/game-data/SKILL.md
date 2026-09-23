---
name: game-data
description: Shared rules for creating or editing Aederyn game content (items, resources, tiles, NPCs, house tiles, quests, world bible) by editing the JSON files in apps/editor/data. Covers where data lives, how entities reference each other, ID conventions, looking up existing entities for reuse, world-bible lore, and the validator you must pass before finishing. Load this before any create-* or world-bible skill, or when asked to check or fix game data.
---

# Aederyn game data

The editor's data files are the source of truth for game content. You create and change content by editing them directly, then running the validator. The editor reads the files on every request, so changes show up without a restart.

## Files

All paths are relative to `apps/editor/`.

| Entity | File | Shape | ID field | Schema |
|---|---|---|---|---|
| Item | `data/items.json` | array | `id` | `packages/types/src/entities/item.schema.ts` |
| Resource (gather node or crafting station) | `data/resources.json` | array | `id` | `resource.schema.ts` → `ResourceModelSchema` |
| Tile (world map zone) | `data/tiles.json` | array | `id` | `tile.schema.ts` |
| Monster (attackable creature) | `data/monsters.json` | array | `id` | `monster.schema.ts` (combat stats in `combat.schema.ts`) |
| NPC | `data/npcs.json` | array | `entity_id` | `npc.schema.ts` |
| Quest | `data/quests.json` | array | `id` | `quest.schema.ts` → `QuestSchema` |
| House tile (player homestead) | `data/house-tiles.json` | **object keyed by id** | `id` (must equal key) | `house-tile.schema.ts` |
| World bible (lore; edit via the `world-bible` skill) | `data/world-bible.json` | object | section IDs, lowercase-hyphen | `packages/types/src/world/index.ts` → `WorldBibleSchema` |

The zod schemas are authoritative. Read the relevant one before writing an entity; don't rely on memory or on older records, some of which are malformed.

## How entities connect

```
tile.resources[]                    → resource.id
tile.monsters[]                     → monster.id
monster.drops[].item_id             → item.id      (what killing it gives)
resource.reward_items[].item_id     → item.id      (what gathering/crafting gives)
resource.required_items[].item_id   → item.id      (tools needed, or crafting inputs)
quest.giver / completion.entity_id  → npc.entity_id
quest.giver / completion.zone_id    → tile.id      ("zone" means a world tile)
quest objective gather.resource_id  → resource.id  (type "resource", placed on a tile)
quest objective craft.resource_id   → resource.id  (type "workbench" | "furnace" | "magic")
quest objective collect.item_id     → item.id      (must be produced by some resource/house tile)
quest objective talk.entity_id      → npc.entity_id, talk/explore.zone_id → tile.id
quest rewards[].item_id             → item.id
quest.prerequisites[]               → quest.id
house tile action result.resultingTileId / prerequisites.adjacentTiles → house tile id
house tile action requirements.requirements[] / result.yields[] (type item) → item.id
house tile availableResources[]     → resource.id
```

So a new obtainable item usually needs three entities: the **item**, a **resource** that yields it, and a **tile** (existing or new) that hosts the resource. A crafted item needs a crafting-station resource (`type: "workbench"`) whose `required_items` are the ingredients, and that station needs to be on a tile (usually `tile_basic_workshop`).

## ID conventions

- `snake_case`, with a type prefix: `item_`, `resource_`, `tile_`, `monster_`, `npc_`, `quest_`. Crafting stations are `resource_crafting_<item>`. House tiles use bare names (`soil`, `seedling`).
- Base the ID on the entity's name: `item_emberstone_of_valor`. Add `_02` only when that ID is already taken.
- Don't use `quest_new__` or `npc_quest_new__` style IDs. Those came from the old generator.
- Check that an ID is free before using it (see lookups below). The validator treats duplicates as errors.

## Look before you create

Reuse beats duplication. Before creating anything, search for an existing entity that does the job:

```bash
cd apps/editor
jq -r '.[] | "\(.id)\t\(.name)\t\(.type)\t\(.rarity)"' data/items.json | grep -i ember
jq -r '.[] | "\(.id)\t\(.name)\t\(.type)"' data/resources.json
jq -r '.[] | "\(.id)\t\(.name)\t\(.theme)\t\(.resources|join(","))"' data/tiles.json
jq -r '.[] | "\(.id)\t\(.name)\t\(.attack.style)\t\([.drops[].item_id]|join(","))"' data/monsters.json
jq -r '.[] | "\(.entity_id)\t\(.name)"' data/npcs.json
jq -r '.[] | "\(.id)\t\(.name)\t\(.giver.entity_id)"' data/quests.json
jq '.[] | select(.id=="item_log_01")' data/items.json            # full record
grep -l '"item_log_01"' data/*.json                              # what references it
jq -r '.[] | select(.reward_items[]?.item_id=="item_log_01") | .id' data/resources.json   # what produces it
```

## Lore

Content should fit the world bible. Read only the parts you need:

```bash
jq '.setting, [.themes[] | {id, name}]' data/world-bible.json
jq '.regions[] | select(.id=="verdant-thicket")' data/world-bible.json
jq '.factions[] | {id, name, alignment, description}' data/world-bible.json
jq '.naming' data/world-bible.json
```

Follow `naming.characterPatterns`, `placePatterns` and `itemPatterns` for names. Content should fit the lore, not change it. If a request needs new lore (a new faction or region), add it with the `world-bible` skill first.

## Editing the files

- Keep the existing formatting: 2-space indentation, one entity per block, the same style as `JSON.stringify(data, null, 2)`.
- Append new array entities before the closing `]` of the file. For `house-tiles.json`, add a new key.
- Only include optional fields when they carry meaning. Don't write `null` for optional fields; omit them.
- Edit the smallest region you can, and never rewrite a whole file by hand.

## Validate before you finish

```bash
pnpm --filter editor validate --ids <every id you created or changed, comma-separated> --warnings
```

- It exits 1 if any listed entity has an error: schema violations, dangling references, duplicate IDs, or resources/quest zones on a tile with `accessible: false` (players can't enter those). Fix every error and run it again until it passes.
- Treat warnings for your entities as design problems to fix unless there's a reason. The most important are `unobtainable` (a quest, resource or item needs something the player can't get) and `circular_dependency` (a recipe needs an item that only comes from recipes that already need it). `orphaned` is fine for an item that's only a quest reward. `unused` flags items with no effects, no equip slot and no recipe/quest that consumes them, and accessible tiles with nothing on them; fine for trophy/lore items.
- Pre-existing errors in other entities are summarised but don't fail the run. Don't fix them unless asked; mention them instead.
- Add `--json` if you want structured output.

Finish by listing what you created and changed, with IDs, and the final validator output. The user reviews the change as a git diff and in the editor UI (`pnpm --filter editor dev`).
