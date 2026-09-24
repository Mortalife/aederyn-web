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
| `name` | Full display name. Follow `naming.characterPatterns` for the group, with the role after it (`Hobb Carrow the Carpenter`) or a title before it (`Warden-Keeper Ansel Morrow`) |
| `backstory` | 2–4 sentences with one concrete, specific detail, tied to a region or faction |
| `personalMission` | One sentence: what they are actively trying to do |
| `hopes` / `fears` | One sentence each, and they should pull against each other |
| `home` | Optional. A landmark ID from `data/map.json` (`jq -r '.landmarks[] | "\(.id)\t\(.x),\(.y)\t\(.tile)"' data/map.json`). Players meet the NPC in that zone. Add a landmark with `edit-map` if their home isn't pinned yet |
| `idleLine` | Optional. One or two sentences in their voice, shown when a player visits their home. It should say something about who they are or the place, not "Hello, traveller" |
| `faction` | Optional. A world bible faction ID (`jq -r '.factions[].id' data/world-bible.json`) |
| `relationships` | Object of category → list of strings. **Each entry is prose: `"<Name> - <why>"`**, naming existing NPCs where possible (`"Forge the Blacksmith - helps maintain his weapons"`). Don't write bare IDs; if you must, the validator requires them to be real `npc_` IDs |

Example (abridged) from the current data:

```json
{
  "entity_id": "npc_hobb_carrow",
  "name": "Hobb Carrow the Carpenter",
  "backstory": "Hobb was a wheelwright's son from a river town who signed on with the company because his brother got the shop…",
  "personalMission": "To keep every settler in axes, picks and handles until the camp has a proper forge and someone who knows how to run it.",
  "hopes": "To have a workshop of his own with his name over the door, somewhere his brother never has to hear about.",
  "fears": "That the hinge means someone lived here, and that they didn't leave of their own accord.",
  "relationships": {
    "friends": ["Ada Thwaite - trades her supper for his mending, and they both come out ahead"]
  },
  "home": "landmark_workbench",
  "idleLine": "Flint's sharp enough if you knap it right, and willow makes a fair handle. Bring me the makings and I'll show you.",
  "faction": "charter-company"
}
```

Relationships are one-directional in the data. If the relationship matters to both characters, consider adding the reverse entry to the other NPC too, and mention it in your summary.

An NPC with a `home` is shown in that landmark's zone, offering any story quests they have for the player, or saying their `idleLine` when they have none. Quests meet the NPCs they reference at their home, so an NPC a quest references needs one unless the reference names a `landmark`. An NPC with no home and no quest is flagged as `orphaned`.
