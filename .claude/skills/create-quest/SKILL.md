---
name: create-quest
description: Design and create a complete quest in apps/editor/data/quests.json, including any new NPCs, items, resources and tiles it needs, grounded in the world bible and reusing existing content. Use when asked to create, write, design or generate a quest or questline, or to fix or extend an existing quest.
---

# Create a quest

Read the `game-data` skill first. This skill brings together the other `create-*` skills.

## 1. Understand the ask and the world

- Pin down the request: **kind** (a one-time `story` quest from an NPC, or a repeatable `contract` from a board), concept, region, faction, quest `type`, tutorial or not, and prerequisites. If something important is missing and would change the design, ask; otherwise pick something that fits the lore and say what you picked.
- Read only the relevant lore: the region, the faction(s), the related `themes`, and a skim of `history` (`jq '.history[] | {name, description}' data/world-bible.json`).
- Look at 1–2 existing quests for tone and structure: `jq '.[] | select(.id=="whispers_in_the_marsh")' apps/editor/data/quests.json`.

## 2. Plan before writing

Write a short plan in your reply, then build it:

- **Hook**: 2–3 sentences. Who wants what, and why now.
- **Cast** (story): the giver, plus anyone you talk to. For each: an existing NPC to reuse (search first), or a new one to create. Every NPC a quest references is met at their `home` landmark, so each needs a home (`create-npc`, `edit-map`), unless the reference names a `landmark` to meet them somewhere else for this story.
- **Board** (contract): the landmark whose contract board posts it (`landmark_camp` for the charter company's). Contracts have no giver NPC: they're taken and handed in at the board.
- **Places**: landmarks for explore objectives. For a contract, "where" can instead be a map region: explore a random cell of it (optionally only cells showing one tile), or gather/kill only counts there. Never randomise NPCs or where they live.
- **Objectives** in order, using only the types the game supports:

| Type | Needs | The player… |
|---|---|---|
| `talk` | `entity_id` (NPC), `dialog_steps`, optional `landmark` | speaks with an NPC where they are |
| `gather` | `resource_id` (a `type: "resource"` node placed on a tile), `amount`, optional `region` | harvests from a node (in the region) |
| `collect` | `item_id` (an item some resource/house tile produces), `amount` | has N of an item |
| `craft` | `resource_id` (a workbench/furnace/magic recipe placed on a tile), `amount` | crafts at a station |
| `explore` | `landmark`, or (contracts only) `region` plus optional `tile`; `chance` (0–1), `found_message` | reaches the place |
| `kill` | `monster_id` (a monster placed on an accessible tile), `count`, optional `region` | defeats N monsters (in the region) |

There are no deliver, escort or defend objectives. Express delivery through `collect` then `talk`. Put the drama in the descriptions and dialogue.
- **Rewards**: `item` (existing or new item) and/or `gold`. Don't use `skill` rewards: no skill IDs are defined yet.
- **New entities**: the list of items/resources/tiles/NPCs you'll create, and where each gets produced or placed so every objective can be completed.

## 3. Build supporting entities first

Create them in dependency order, following each skill: **items → resources (reward those items) → monsters (drop those items) → tiles (host resources and monsters) → NPCs**. Place kill targets on accessible tiles and make sure the player can obtain a weapon that can realistically beat them (fists only do 1 damage). Keep a running list of every ID you create or change.

## 4. Write the quest

Read `packages/types/src/entities/quest.schema.ts`, then append to `data/quests.json`:

- `id`: `quest_<snake_name>`. `kind`: `"story"` or `"contract"`. `name`: an evocative title. `description`: 2–3 sentences for the player's journal.
- `type`: one of `collection`, `messenger`, `investigation`, `crafting`, `exploration`, `defence`, `combat`, `delivery`, `dialog`. Pick the one that best matches the objectives.
- **Story quests**: `giver` and `completion` are `{ entity_id }`, plus `landmark` only to meet the NPC away from home. `completion.message` is the NPC's closing line **in their voice**, referencing what happened. `return_message` is what they say on later visits. Story quests are always on offer once their prerequisites are done, and each player does them once.
- **Contracts**: `board` is a landmark ID, and `completion` is just `{ message }`, shown when it's handed in at the board. Contracts rotate every two hours; each rotation posts a seeded pick of up to six per board and resolves region-scoped explores to a concrete cell, so the same contract sends players somewhere new next time, and a player can do it again in a later rotation. Write them so they could later come from a template ("gather N of a resource in region R"): keep the specifics in `resource_id`/`monster_id`/`region`, not in prose that names a single cell.
- No `zone_id`, `x` or `y` anywhere: places come from NPC homes, landmarks and regions.
- Objective `id`s: short and unique within the quest (`talk_elder_start`, `gather_moss`). Always include `"progress": null`.
- `talk.dialog_steps`: 2–4 steps. `entity_id` is the NPC for their lines and `null` for the player's. Include the information the player needs for the next objective.
- `explore`: `chance` 0.3–1 and a `found_message` saying what they discover. A region explore's `tile` must actually show up in that region (the validator checks).
- `kill`: `monster_id` and a positive integer `count`. Kills count only after the quest starts and this objective becomes current.
- `prerequisites`: quest IDs the player must have completed first. They chain story quests into questlines, and can hold a contract back until a story beat.
- `excludes` (story only): other story quests that rule this one out, for a choice between roads. A quest isn't offered or accepted while the player has any quest it excludes taken or completed. List it on both sides (the validator requires it). Abandoning a taken side frees the choice again; completing it makes it final. Gate each side's follow-ups on it with `prerequisites`.
- `is_tutorial`: only for onboarding story quests.

## 5. Validate and fix

```bash
pnpm --filter editor validate --ids <quest id>,<every entity id you created or changed> --warnings
```

Fix every error, including NPCs with no home (give them one, or a `landmark` on the reference) and missing landmarks or regions. Fix `unobtainable` warnings: they mean a player can't finish the quest, e.g. a region-scoped gather or kill whose region has no tile hosting the target. `orphaned` on a reward-only item or a new NPC used only in `talk` objectives is fine.

## 6. Report

Finish with:
- the hook and objective list (one line each)
- IDs created vs reused
- the final validator output
- any follow-ups (missing sprite assets, one-way relationships)
