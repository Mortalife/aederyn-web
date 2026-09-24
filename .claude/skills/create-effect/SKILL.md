---
name: create-effect
description: Create or edit an effect type (spores, rest, cold, dark, a ward or light that protects against one) in apps/editor/data/effects.json, and put it on tiles or items. Use when a place should hurt, heal, slow or block the player, when gear or a consumable should protect against or grant something, or when asked to add a buff, debuff, hazard or ward.
---

# Create an effect

Read the `game-data` skill first.

An effect type is a piece of behaviour described entirely by data. The game never special-cases an effect ID. It sums every active effect on a player each tick, from three sources:

- a **tile** (`tile.effects`, a pool rolled per map cell), while the player is on that cell, in the zone or on the map;
- a **map region** (`regions[].effects` in `data/map.json`), on every cell of the region. Use this for a tier's gradient, e.g. spore strength rising region by region;
- an **equipped item** (`item.wornEffects`), while worn;
- a **consumable** (`item.effects`, the on-use list), for its `duration`. Using the same item again restarts the timer instead of stacking.

Each source gives `{ "id", "strength" }`. Strengths of the same effect add up. Protection is an effect too: a `protects` effect's strength is protection against its `target`, and the target's `mode` decides what that protection does.

## Kinds

| `kind` | Extra fields | What `strength` means |
|---|---|---|
| `health` | `polarity` (`positive` heals, `negative` drains), `interval` (ms) | HP gained or lost per `interval`, applied one HP at a time. A drain stops natural regeneration (1 HP / 5s) and only hurts players who are online. Running out of health sends the player to camp at 10 HP. Positive effects add to natural regeneration, but not during a fight |
| `gather_speed` | `polarity` | A percentage. Negative multiplies gathering time by `1 + strength/100` (50 → ×1.5, 100 → ×2); positive divides it by the same |
| `blocks` | `actions` (`gather`, `attack`), optional `message` | Any strength left after protection blocks those actions, with `message` shown to the player |
| `protects` | `target` (another effect's ID, not a `protects` one) | Protection against the target, on the combat defence scale (0–200) |

## Modes

| `mode` | Protection does | Use for |
|---|---|---|
| `mitigation` | Removes `protection / (protection + 100)` of the strength (100 halves it). Never reaches zero | Hazards that gear should soften but never cancel (spores, cold) |
| `binary` | Any protection above 0 removes it completely | Things you either have the answer to or don't (dark needs a light) |
| `none` | Nothing | Positive effects, and every `protects` effect (the validator requires it) |

A `blocks` effect should be `binary`: under `mitigation` it can never be lifted (the validator warns).

## Steps

1. Look for an existing effect: `jq -r '.[] | "\(.id)\t\(.name)\t\(.kind)\t\(.mode)\t\(.target // "")"' apps/editor/data/effects.json`. Reuse it with a different strength rather than making a near-copy.
2. Read `packages/types/src/entities/effect.schema.ts`.
3. Append the effect to `data/effects.json`.
4. Put it somewhere: add `{ "id", "strength" }` to a tile's `effects`, an item's `wornEffects`, or `{ "id", "strength", "duration" }` to an item's `effects` (on use; `duration` in seconds, `0` only for an instant `health` effect). See `create-tile` and `create-item`.
5. If it's a negative effect with a mode other than `none`, make sure something the player can get protects against it, usually a worn item with a `protects` effect. The validator warns when nothing does.
6. Validate with `--ids` covering the effect and every tile or item you edited.

## Field guidance

| Field | Guidance |
|---|---|
| `id` | `effect_<snake_name>` (`effect_spores`, `effect_spore_ward`) |
| `name` | Short and plain (`Spores`, `Cold`, `Light`, `Spore Ward`). Shown on the player's HUD and the zone header |
| `description` | 1–2 sentences saying what it does to the player |
| `interval` | `health` only. 5000–10000 ms. With strength 1 a 5000 interval matches natural regeneration |

Strength guidance: tile drains of 1–3 HP per 5s are pressure, 5+ is dangerous. Gather speed 50–100. Protection on one worn piece 20–100.

Examples from the current data:

```json
{ "id": "effect_spores", "name": "Spores", "description": "…", "kind": "health", "polarity": "negative", "interval": 5000, "mode": "mitigation" }
{ "id": "effect_dark", "name": "Dark", "description": "…", "kind": "blocks", "actions": ["gather", "attack"], "message": "It's too dark to see what you're doing. You need a light.", "mode": "binary" }
{ "id": "effect_light", "name": "Light", "description": "…", "kind": "protects", "target": "effect_dark", "mode": "none" }
```

## Editing an existing effect

Check what uses it first: `grep -l '"<id>"' apps/editor/data/*.json`. Never change an `id` in place. Changing `kind` changes what every strength that references it means, so review each use.
