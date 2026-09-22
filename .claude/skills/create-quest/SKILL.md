---
name: create-quest
description: Design and create a complete quest in apps/editor/data/quests.json, including any new NPCs, items, resources and tiles it needs, grounded in the world bible and reusing existing content. Use when asked to create, write, design or generate a quest or questline, or to fix or extend an existing quest.
---

# Create a quest

Read the `game-data` skill first. This skill brings together the other `create-*` skills.

## 1. Understand the ask and the world

- Pin down the request: concept, region, faction, quest `type`, tutorial or not, and prerequisites. If something important is missing and would change the design, ask; otherwise pick something that fits the lore and say what you picked.
- Read only the relevant lore: the region, the faction(s), the related `themes`, and a skim of `history` (`jq '.history[] | {name, description}' data/world-bible.json`).
- Look at 1–2 existing quests for tone and structure: `jq '.[] | select(.id=="whispers_in_the_marsh")' apps/editor/data/quests.json`.

## 2. Plan before writing

Write a short plan in your reply, then build it:

- **Hook**: 2–3 sentences. Who wants what, and why now.
- **Cast**: the giver, plus anyone you talk to. For each: an existing NPC to reuse (search first), or a new one to create.
- **Places**: the tile(s) for the giver, talk and explore objectives. Reuse existing tiles where the geography fits.
- **Objectives** in order, using only the types the game supports:

| Type | Needs | The player… |
|---|---|---|
| `talk` | `entity_id` (NPC), `zone_id` (tile), `dialog_steps` | speaks with an NPC |
| `gather` | `resource_id` (a `type: "resource"` node placed on a tile), `amount` | harvests from a node |
| `collect` | `item_id` (an item some resource/house tile produces), `amount` | has N of an item |
| `craft` | `resource_id` (a workbench/furnace/magic recipe placed on a tile), `amount` | crafts at a station |
| `explore` | `zone_id` (tile), `chance` (0–1), `found_message` | searches a zone |

There are no kill, deliver, escort or defend objectives. Express those beats through the supported types: deliver becomes `collect` then `talk`, defeat becomes `explore` plus dialogue. Put the drama in the descriptions and dialogue.
- **Rewards**: `item` (existing or new item) and/or `gold`. Don't use `skill` rewards: no skill IDs are defined yet.
- **New entities**: the list of items/resources/tiles/NPCs you'll create, and where each gets produced or placed so every objective can be completed.

## 3. Build supporting entities first

Create them in dependency order, following each skill: **items → resources (reward those items) → tiles (host those resources) → NPCs**. Keep a running list of every ID you create or change.

## 4. Write the quest

Read `packages/types/src/entities/quest.schema.ts`, then append to `data/quests.json`:

- `id`: `quest_<snake_name>`. `name`: an evocative title. `description`: 2–3 sentences for the player's journal.
- `type`: one of `collection`, `messenger`, `investigation`, `crafting`, `exploration`, `defence`, `combat`, `delivery`, `dialog`. Pick the one that best matches the objectives.
- `giver` and `completion`: `{ entity_id, zone_id }`. `completion.message` is the NPC's closing line **in their voice**, referencing what happened. `return_message` is what they say on later visits.
- Objective `id`s: short and unique within the quest (`talk_elder_start`, `gather_moss`). Always include `"progress": null`.
- `talk.dialog_steps`: 2–4 steps. `entity_id` is the NPC for their lines and `null` for the player's. Include the information the player needs for the next objective.
- `explore`: `chance` 0.3–1 and a `found_message` saying what they discover.
- `prerequisites`: quest IDs, only if the story really follows another quest.
- `is_tutorial`: only for onboarding quests.
- Don't add `x`/`y` coordinates unless the tile-quest placement is known; they're optional.

## 5. Validate and fix

```bash
pnpm --filter editor validate --ids <quest id>,<every entity id you created or changed> --warnings
```

Fix every error. Fix `unobtainable` warnings: they mean a player can't finish the quest. `orphaned` on a reward-only item or a new NPC used only in `talk` objectives is fine.

## 6. Report

Finish with:
- the hook and objective list (one line each)
- IDs created vs reused
- the final validator output
- any follow-ups (missing sprite assets, one-way relationships)
