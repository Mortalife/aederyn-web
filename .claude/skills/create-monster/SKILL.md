---
name: create-monster
description: Create or edit a monster (an attackable creature such as a chicken, wolf or wraith, with health, attack, defences and drops) in apps/editor/data/monsters.json, and place it on a tile. Use when asked to add a creature or enemy, when an item should drop from a kill, or when a zone needs something to fight.
---

# Create a monster

Read the `game-data` skill first. For the combat rules (the damage formula, the melee/ranged/magic triangle, and the starting number ranges), read `docs/COMBAT.md`.

A monster is an attackable creature. It lives in a tile's `monsters` pool, which is rolled for every map cell showing that tile. It fights back with one attack style, has a separate defence against each style, and drops items when killed. Monsters are not NPCs: NPCs are story characters with no stats.

## Steps

1. Look for an existing monster: `jq -r '.[] | "\(.id)\t\(.name)\t\(.health)\t\(.attack.style)\t\([.drops[].item_id]|join(","))"' apps/editor/data/monsters.json`.
2. Read `packages/types/src/entities/monster.schema.ts` and `combat.schema.ts`.
3. Make sure every drop item exists. If not, use `create-item` first.
4. Append the monster to `data/monsters.json`.
5. Place it on a tile by adding a pool entry to that tile's `monsters`: `{ "id": "monster_x" }`, with `"count": 2` for a pair (never list an ID twice), `"chance": 0.3` if only some cells have it, or `{ "oneOf": [{ "id": "monster_a" }, { "id": "monster_b", "count": 2 }] }` for one of several. Pick a tile whose theme fits and that the map actually places (`data/map.json`). Tiles with `accessible: false` can't have monsters. A spawn is identified by its position in the cell's rolled list, so append new entries rather than inserting them in the middle.
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

Two tier-1 examples from the current data. Each has a clear weak spot, so the weapon choice matters: the bow for wolves, melee for crows, and the bow for the boar, whose hide turns a spear:

```json
{ "id": "monster_wolf", "name": "Wolf", "description": "A lean grey wolf… It weaves as it closes, so a club rarely lands clean, but it comes straight at you and an arrow stops it.", "health": 90, "attack": { "style": "melee", "damage": 12, "speed": 1800 }, "defence": { "melee": 60, "ranged": 0, "magic": 20 }, "respawnTime": 90, "drops": [{ "item_id": "item_wolf_pelt", "qty": 1, "chance": 1 }, { "item_id": "item_bone", "qty": 1, "chance": 1 }, { "item_id": "item_sinew", "qty": 1, "chance": 0.75 }] }
{ "id": "monster_crow_swarm", "name": "Crow Swarm", "description": "A mob of crows that dives from every side… Too many and too quick to pick off with arrows, but they scatter from anything you swing.", "health": 60, "attack": { "style": "ranged", "damage": 6, "speed": 1400 }, "defence": { "melee": 0, "ranged": 120, "magic": 0 }, "respawnTime": 60, "drops": [{ "item_id": "item_feather", "qty": 3, "chance": 1 }] }
```

Check the fight before you ship it. A fight that outlasts `respawnTime` ends with the monster slipping away, so the intended weapon must kill it well inside that time. With the player swinging first, a fight lasts `(ceil(health / hit) - 1) × weapon speed`, where `hit = max(1, floor(damage × 100 / (defence + 100)))`, and the player takes one monster hit per `attack.speed` of that, reduced by their armour the same way. Player health is 100. Compare against the neighbouring tier: the Landing's club (melee 14 / 2.4s) and sling (ranged 10 / 2s) with the linen set (about 31 melee defence), and the Southwood's oak spear (melee 20 / 2.2s) and shortbow (ranged 15 / 1.8s) with the hide set (about 68 melee), and the Scarp's bronze sword (melee 26 / 2s) with the bronze set (helm, scale coat, greaves, leather boots, stalker-hide gloves: about 104 melee and 84 ranged defence). The Sinks add the yew longbow (ranged 24 / 2s) and the Wardens' questline the warding staff (magic 22 / 2.2s), the first magic weapon. Tier 3 (the Wardline) has the iron sword (melee 32 / 2s), Warden steel blade (melee 36 / 1.8s), iron crossbow (ranged 44 / 2.6s) and wardstone focus (magic 32 / 2.2s), with the waxed mask, iron mail shirt and chausses, leather boots and stalker-hide gloves (about 116 melee, 97 ranged and 37 magic defence). In the Wardline the head slot is a mask, not a helm, so tier-2 players there usually wear the spore-wrap with bronze (about 89 melee). Tier 4 (the Bloom) adds the chitin blade (melee 44 / 1.8s) and spine-bow (ranged 40 / 2s), with the filter respirator, chitin cuirass and greaves, and mycelium boots and gloves (about 170 melee, 150 ranged and 130 magic defence); the best tier-3 armour (waxed mask, Warden mail, iron chausses, leather boots, Warden gauntlets) is about 128/107/64. The Bloom is where monsters first attack with magic, so tier-4 armour is the first with real magic defence. Tier 5 (the Heart) adds the Heartshell Blade (melee 56 / 1.8s), Grown-Sinew Bow (ranged 52 / 2s) and Humming Staff (magic 50 / 2s), with the Warden's Respirator, heartshell cuirass and greaves, and mycelium boots and gloves (about 214 melee, 192 ranged and 192 magic defence). Heart spores are 4 per 5s, about 1.2 under the Warden's Respirator, so count them in a Heart fight. The wolf takes a tier-0 player with a sling and linen to about 70 damage taken, and a tier-1 player with a bow and hide to about 35. `apps/web/src/world/content.test.ts` asserts the intended fights for each open region; add yours there.

## Editing an existing monster

Check which tiles and quests reference it first: `grep -l '"<id>"' apps/editor/data/*.json`. Never change an `id` in place.
