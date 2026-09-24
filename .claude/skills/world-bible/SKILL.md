---
name: world-bible
description: Create, extend or revise the Aederyn world bible (setting, themes, systems, factions, regions, history, naming conventions) in apps/editor/data/world-bible.json. Use when asked to generate or build out the world's lore, add a faction/region/theme/system/historical event, change the setting or tone, or update naming conventions.
---

# World bible

Read the `game-data` skill first for editing rules and validation.

The world bible is the lore every other piece of content is written against. NPCs, quests, items and places draw their factions, regions, themes and names from it. It lives in `apps/editor/data/world-bible.json` as a single object. The schema is `WorldBibleSchema` in `packages/types/src/world/index.ts`, and its field descriptions give the expected lengths.

## Before changing anything

- **Replacing or heavily rewriting an existing world bible:** confirm with the user first. Existing NPC backstories, quests and item descriptions are written against it, and they won't update themselves.
- **Renaming or removing a faction, region, theme or system:** first find content that mentions it, by name as well as by ID, because content refers to lore in prose:
  ```bash
  cd apps/editor
  grep -il "charter company\|charter-company" data/*.json
  ```
  List what would go stale in your report, or update it if the user asked you to.
- **Adding** (a new faction, region, event, etc.) is safe. Just keep it consistent with what's there.

## Building from scratch

Work in this order. Each section builds on the ones before it, so re-read what you've written as you go:

| Step | Section | Size | Notes |
|---|---|---|---|
| 1 | `setting` | `description` 400–1000 words | Keep `genre`, `era`, `tone` and any concept the user gave. Cover geography, peoples and cultures, underlying conflicts and tensions, what makes the world distinctive, and hooks for the player |
| 2 | `themes` | 3 | The world's thematic pillars. ~100 words each, 3–5 `examples` of how each shows up in play |
| 3 | `systems` | 2 | Magic, technology or hybrid (religions fit as magic/hybrid). ~150 words, 3–5 `rules`, 2–3 `limitations`, each with a real cost |
| 4 | `factions` | 4 | ~200 words, 2–3 `goals`, `members` as member types (not specific NPCs). Mix alignments (`friendly`/`neutral`/`hostile`). `rivals`/`allies` are faction IDs, and should be symmetric unless the asymmetry is the point |
| 5 | `regions` | one per map region | ~200 words of `description` (what's there now), `lore` (~100–200 words: its history and secrets, for content authors), `climate`, `inhabitants`, `resources` (prose, not resource IDs), `themes` (theme IDs). Give each region a distinct climate and a faction presence |
| 6 | `history` | ~10 | Chronological. ~300 words each, an `era` name, `significance` (why it matters *now*), `relatedEntities` (faction/region/system/theme IDs). The later events should explain today's tensions |
| 7 | `naming` | 5 patterns each | `characterPatterns`, `placePatterns`, `itemPatterns` in the form `"Pattern description (e.g., Example, Example)"`, plus `examples` with `characters`, `places` and `items` keys, 5 each |

Sizes are defaults taken from the current world. Follow the user if they ask for more or fewer.

For a from-scratch build, write the sections one or two at a time and validate as you go. Don't draft the whole file in one pass.

## Conventions

- Section IDs are **lowercase with hyphens** (`charter-company`, `wardline`), unlike game entities, which use underscores and a type prefix.
- `id` is always `"world-bible"`. Keep `createdAt`; set `updatedAt` to the current ISO timestamp whenever you change the file.
- Bible regions and `data/map.json` regions are joined by ID: the validator requires every map region to have a bible region and vice versa. The bible owns the lore, the map owns the structure (see `edit-map`). NPC `faction` fields reference faction IDs.
- References only go *within* the world bible: faction `rivals`/`allies` → faction IDs, region `themes` → theme IDs, history `relatedEntities` → faction/region/system/theme IDs. Game entities refer to lore in prose (an NPC's backstory names a faction). They don't use IDs.
- Keep facts consistent across sections: a faction's home region, the era names in history, what a system can and can't do. Contradictions here spread into every quest written later.
- Tone: follow `setting.tone`. Be concrete and specific (a named place, a dated betrayal, a cost someone paid) rather than generic epic phrasing.

## Reading it efficiently

```bash
cd apps/editor
jq '{name, setting: .setting | {genre, tone, era}}' data/world-bible.json
jq '[.themes[], .systems[], .factions[], .regions[]] | map({id, name})' data/world-bible.json
jq '.factions[] | select(.id=="wardens")' data/world-bible.json
jq '.history[] | {id, era, name}' data/world-bible.json
```

## Validate

```bash
pnpm --filter editor validate --ids world-bible,<ids of sections you added or changed> --warnings
```

This checks the schema (it reports as `world-bible`), duplicate IDs within each section, and every internal reference (it reports under the section item's ID, e.g. `wardens`). Fix everything, then report what you added or changed, and any existing content that now contradicts the lore.
