import type { Quest } from "../../config/types.js";

export const quests: Quest[] = [
  {
    id: "quest_test_crafting",
    kind: "story",
    type: "crafting",
    name: "First Tool",
    description: "",
    giver: { entity_id: "npc_smith" },
    objectives: [
      {
        id: "talk_smith",
        type: "talk",
        description: "Speak with the smith",
        entity_id: "npc_smith",
        dialog_steps: [{ entity_id: "npc_smith", dialog: "Let's make an axe." }],
        progress: null,
      },
      {
        id: "craft_axe",
        type: "gather",
        description: "Chop a tree",
        resource_id: "resource_trees_01",
        amount: 1,
        progress: null,
      },
    ],
    completion: { entity_id: "npc_smith", message: "Well done.", return_message: "Come back to the yard." },
    rewards: [{ type: "item", item_id: "item_stick_01", amount: 3 }],
  },
  {
    id: "quest_test_wanderer",
    kind: "story",
    type: "dialog",
    name: "The Wanderer",
    description: "",
    giver: { entity_id: "npc_smith" },
    objectives: [
      {
        id: "talk_wanderer",
        type: "talk",
        description: "Find the wanderer in the grove",
        entity_id: "npc_wanderer",
        landmark: "landmark_grove",
        dialog_steps: [],
        progress: null,
      },
    ],
    completion: { entity_id: "npc_smith", message: "", return_message: "" },
    rewards: [],
  },
  {
    id: "contract_test_scouting",
    kind: "contract",
    type: "exploration",
    name: "Scouting",
    description: "",
    board: "landmark_camp",
    objectives: [
      {
        id: "scout",
        type: "explore",
        description: "Find a grove in the woods",
        region: "woods",
        tile: "tile_enchanted_grove",
        chance: 1,
        found_message: null,
        progress: null,
      },
    ],
    completion: { message: "Good work." },
    rewards: [{ type: "gold", amount: 10 }],
  },
];

export const questsById = new Map<string, Quest>(quests.map((q) => [q.id, q]));
