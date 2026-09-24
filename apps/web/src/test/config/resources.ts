import type { ResourceModel } from "../../config/types.js";

export const resources: ResourceModel[] = [
  {
    id: "resource_grass_01",
    name: "Grass",
    amount: 3,
    limitless: true,
    reward_items: [{ item_id: "item_grass_01", qty: 1 }],
    required_items: [],
    collectionTime: 3,
    type: "resource",
    verb: "Collect",
  },
  {
    id: "resource_stones_01",
    name: "Stones",
    amount: 3,
    limitless: false,
    reward_items: [{ item_id: "item_stone_01", qty: 1 }],
    required_items: [],
    collectionTime: 3,
    type: "resource",
    verb: "Collect",
  },
  {
    id: "resource_trees_01",
    name: "Tree",
    amount: 5,
    limitless: false,
    reward_items: [{ item_id: "item_log_01", qty: 1 }],
    required_items: [{ item_id: "item_stone_axe_01", qty: 1, consumed: false, itemDurabilityReduction: 2 }],
    collectionTime: 10,
    type: "resource",
    verb: "Chop",
  },
];

export const resourcesById = new Map<string, ResourceModel>(resources.map((r) => [r.id, r]));
