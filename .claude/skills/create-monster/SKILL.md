---
name: create-monster
description: Create or edit a monster (an attackable creature such as a chicken, wolf or wraith, with health, attack, defences and drops) in apps/editor/data/monsters.json, and place it on a tile. Use when asked to add a creature or enemy, when an item should drop from a kill, or when a zone needs something to fight.
---

# Create a monster

Read the `game-data` skill first. For the combat rules (the damage formula, the melee/ranged/magic triangle, and the starting number ranges), read `docs/COMBAT.md`.

A monster is an attackable creature. It lives on a tile, and every map position with that tile has one. It fights back with one attack style, has a separate defence against each style, and drops items when killed. Monsters are not NPCs: NPCs are story characters with no stats.

## Steps

1. Look for an existing monster: `jq -r '.[] | "\(.id)\t\(.name)\t\(.health)\t\(.attack.style)\t\([.drops[].item_id]|join(","))"' apps/editor/data/monsters.json`.
2. Read `packages/types/src/entities/monster.schema.ts` and `combat.schema.ts`.
3. Make sure every drop item exists. If not, use `create-item` first.
4. Append the monster to `data/monsters.json`.
5. Place it on a tile by adding its ID to that tile's `monsters` array. Pick a tile whose theme fits. Tiles with `accessible: false` can't have monsters.
6. Make sure the player can get a weapon that suits it. Anyone can fight barehanded (1 melee damage), so drops always count as obtainable, but anything tougher than a chicken needs a real weapon to beat.
7. Validate with `--ids` covering the monster, the tile you edited, and any new items.

## Field guidance

| Field | Guidance |
|---|---|
| `id` | `monster_<snake_name>` (`monster_chicken`) |
| `name` | Plain names for ordinary animals (`Chicken`). Notable creatures follow `naming.characterPatterns` |
| `description` | 1–2 sentences. Hint at how it fights and what it's weak to |
| `health` | 50–500. 50 is a pushover, 500 is a long fight |
| `attack` | `{ "style", "damage", "speed" }`. `style` is `melee`, `ranged` or `magic`. `damage` is a whole number per hit (harmless 5, dangerous 30+). `speed` is milliseconds between attacks (1000–3000) |
| `defence` | `{ "melee", "ranged", "magic" }`, each 0–200. 100 halves damage of that style. Give monsters a clear weak spot so the choice of weapon matters |
| `respawnTime` | Seconds after a kill: common 30–60, tougher monsters several minutes |
| `drops` | `[{ "item_id", "qty", "chance" }]`, where `chance` is 0–1 and rolled per drop. A monster's main material should drop at `chance: 1` |

Example from the current data:

```json
{ "id": "monster_chicken", "name": "Chicken", "description": "A plump, bad-tempered chicken scratching about in the grass. It pecks back when cornered, and it's hard to hit with an arrow while it darts about.", "health": 50, "attack": { "style": "melee", "damage": 5, "speed": 3000 }, "defence": { "melee": 0, "ranged": 20, "magic": 0 }, "respawnTime": 30, "drops": [{ "item_id": "item_feather", "qty": 3, "chance": 1 }] }
```

## Editing an existing monster

Check which tiles and quests reference it first: `grep -l '"<id>"' apps/editor/data/*.json`. Never change an `id` in place.
