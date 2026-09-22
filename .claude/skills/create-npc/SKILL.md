---
name: create-npc
description: Create or edit an NPC (character with backstory, motives and relationships) in apps/editor/data/npcs.json. Use when a quest needs a giver, ally, antagonist or other character, or when asked to add or flesh out a character.
---

# Create an NPC

Read the `game-data` skill first.

## Steps

1. Check the existing cast; reuse beats a near-duplicate character:
   `jq -r '.[] | "\(.entity_id)\t\(.name)\t\(.personalMission)"' apps/editor/data/npcs.json`
2. Read `packages/types/src/entities/npc.schema.ts`.
3. Read the lore the character belongs to: their region, their faction (`jq '.factions[] | select(.id=="…")' data/world-bible.json`) and `naming.characterPatterns`.
4. Append to `data/npcs.json` and validate.

## Field guidance

| Field | Guidance |
|---|---|
| `entity_id` | `npc_<snake_name>`, based on their name or role (`npc_hermit_alchemist`) |
| `name` | Full display name. Hand-written NPCs use "Name the Role" (`Elara the Elder Sage`). World-bible patterns (`Thalior Glimmerleaf`) also fit |
| `backstory` | 2–4 sentences with one concrete, specific detail, tied to a region or faction |
| `personalMission` | One sentence: what they are actively trying to do |
| `hopes` / `fears` | One sentence each, and they should pull against each other |
| `relationships` | Object of category → list of strings. **Each entry is prose: `"<Name> - <why>"`**, naming existing NPCs where possible (`"Forge the Blacksmith - helps maintain his weapons"`). Don't write bare IDs; if you must, the validator requires them to be real `npc_` IDs |

Example (abridged) from the current data:

```json
{
  "entity_id": "npc_elder_sage",
  "name": "Elara the Elder Sage",
  "backstory": "The last survivor of the extinct Order of the Crystal Mind…",
  "personalMission": "To find a worthy apprentice to pass on her knowledge before time runs out.",
  "hopes": "To rebuild a small magical academy that honors her order's traditions while avoiding their fatal mistakes.",
  "fears": "That ancient magical knowledge will die with her, lost to time like her order before it.",
  "relationships": {
    "friends": ["Celeste the Mystic Seer - both understand the burden of profound knowledge"],
    "rivals": ["Vex the Hermit Alchemist - disapproves of their reckless experimentation"]
  }
}
```

Relationships are one-directional in the data. If the relationship matters to both characters, consider adding the reverse entry to the other NPC too, and mention it in your summary.

NPCs don't have a location field. Where they are is defined by the quests that reference them (`giver.zone_id`, `talk.zone_id`), so a new NPC with no quest is flagged as `orphaned`. That's expected until a quest uses them.
