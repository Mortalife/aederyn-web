import type { TileQuest } from "../user/quest";

export const tutorialQuests: TileQuest[] = [
  {
    id: "quest_tutorial_gathering",
    type: "collection",
    name: "First Steps in Gathering",
    giver: {
      entity_id: "npc_village_elder",
      zone_id: "tile_sunny_meadow",
      x: 10,
      y: 9,
    },
    description:
      "Doran the Village Elder wants to teach you the basics of gathering resources. He believes starting with simple tasks will help you learn the fundamentals of survival.",
    objectives: [
      {
        type: "talk",
        id: "talk_elder_start",
        description: "Speak with Doran the Village Elder",
        entity_id: "npc_village_elder",
        zone_id: "tile_sunny_meadow",
        dialog:
          "Welcome, newcomer. Every journey begins with small steps. Let's start by learning how to gather basic resources.",
        response: "I'm ready to learn.",
        x: 10,
        y: 9,
        progress: null,
      },
      {
        type: "gather",
        id: "gather_grass",
        description: "Gather grass from the meadow",
        resource_id: "resource_grass_01",
        amount: 3,
        progress: null,
      },
      {
        type: "collect",
        id: "collect_sticks",
        description: "Collect branches from the forest",
        item_id: "item_stick_01",
        amount: 2,
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_village_elder",
      zone_id: "tile_sunny_meadow",
      message:
        "Well done! You've shown a natural talent for gathering. These basic resources will be essential for crafting tools and items.",
      return_message: "Return to Doran in the Sunny Meadow",
      x: 10,
      y: 9,
    },
    rewards: [
      {
        type: "item",
        item_id: "item_stone_01",
        amount: 2,
      },
    ],
    starts_at: 0,
    ends_at: 0,
  },
  {
    id: "quest_tutorial_crafting",
    type: "crafting",
    name: "Crafting Your First Tool",
    giver: {
      entity_id: "npc_blacksmith",
      zone_id: "tile_rocky_outcrop",
      x: 11,
      y: 10,
    },
    description:
      "Forge the Blacksmith will teach you how to craft your first tool - a simple stone axe that will help you gather more advanced resources.",
    objectives: [
      {
        type: "talk",
        id: "talk_blacksmith_start",
        description: "Speak with Forge the Blacksmith",
        entity_id: "npc_blacksmith",
        zone_id: "tile_rocky_outcrop",
        dialog:
          "So, you want to learn the art of crafting? Let's start with something simple but useful - a stone axe.",
        response: "I'd like to learn how to craft tools.",
        x: 11,
        y: 10,
        progress: null,
      },
      {
        type: "gather",
        id: "gather_stones",
        description: "Gather stones from the Rocky Outcrop",
        resource_id: "resource_stones_01",
        amount: 1,
        progress: null,
      },
      {
        type: "craft",
        id: "craft_stone_axe",
        description: "Craft a stone axe at the workbench",
        resource_id: "resource_crafting_item_stone_axe_01",
        amount: 1,
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_blacksmith",
      zone_id: "tile_rocky_outcrop",
      message:
        "Excellent work! Your first tool. With this axe, you'll be able to chop trees and gather more advanced resources.",
      return_message: "Return to Forge at the Rocky Outcrop",
      x: 11,
      y: 10,
    },
    rewards: [
      {
        type: "item",
        item_id: "item_stick_01",
        amount: 3,
      },
    ],
    starts_at: 0,
    ends_at: 0,
  },
  {
    id: "quest_tutorial_exploration",
    type: "exploration",
    name: "Exploring New Horizons",
    giver: {
      entity_id: "npc_ranger",
      zone_id: "tile_trees",
      x: 9,
      y: 12,
    },
    description:
      "Sylvan the Forest Ranger will guide you in exploring the local area and teach you about finding specific resources in different zones.",
    objectives: [
      {
        type: "talk",
        id: "talk_ranger_start",
        description: "Meet with Sylvan the Ranger",
        entity_id: "npc_ranger",
        zone_id: "tile_trees",
        dialog:
          "The forest holds many secrets. Let me show you how to find what you need in the wilderness.",
        response: "I'm ready to explore.",
        x: 9,
        y: 12,
        progress: null,
      },
      {
        type: "explore",
        id: "find_meadow",
        description: "Find the Sunny Meadow",
        zone_id: "tile_sunny_meadow",
        chance: 1,
        found_message:
          "You've discovered a beautiful sunny meadow full of flowers!",
        x: 10,
        y: 9,
        progress: null,
      },
      {
        type: "collect",
        id: "collect_flowers",
        description: "Collect blooming flowers from the meadow",
        item_id: "item_flower_petals",
        amount: 3,
        progress: null,
      },
    ],
    completion: {
      entity_id: "npc_ranger",
      zone_id: "tile_trees",
      message:
        "You're becoming quite the explorer! Remember, different resources can be found in different areas. Learning where to look is half the battle.",
      return_message: "Return to Sylvan in the Forest",
      x: 9,
      y: 10,
    },
    rewards: [
      {
        type: "item",
        item_id: "item_water_bottle",
        amount: 1,
      },
    ],
    starts_at: 0,
    ends_at: 0,
  },
];
