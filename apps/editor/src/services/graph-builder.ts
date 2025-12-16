import { repository } from "../repository/index.js";

export interface GraphNode {
  id: string;
  label: string;
  type: "item" | "resource" | "tile" | "npc" | "quest" | "house-tile";
  data: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: "yields" | "requires" | "found_on" | "giver" | "involves" | "rewards" | "transforms_to";
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export async function buildGraphData(): Promise<GraphData> {
  const [items, resources, tiles, npcs, quests, houseTiles] = await Promise.all([
    repository.items.getAll(),
    repository.resources.getAll(),
    repository.tiles.getAll(),
    repository.npcs.getAll(),
    repository.quests.getAll(),
    repository.houseTiles.getAll(),
  ]);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Add item nodes
  for (const item of items) {
    nodes.push({
      id: item.id,
      label: item.name,
      type: "item",
      data: { rarity: item.rarity, itemType: item.type },
    });
  }

  // Add resource nodes and edges
  for (const resource of resources) {
    nodes.push({
      id: resource.id,
      label: resource.name,
      type: "resource",
      data: { resourceType: resource.type, verb: resource.verb },
    });

    // Resource yields items
    for (const reward of resource.reward_items || []) {
      edges.push({
        id: `${resource.id}-yields-${reward.item_id}`,
        source: resource.id,
        target: reward.item_id,
        label: `yields ${reward.qty}`,
        type: "yields",
      });
    }

    // Resource requires items
    for (const req of resource.required_items || []) {
      edges.push({
        id: `${resource.id}-requires-${req.item_id}`,
        source: resource.id,
        target: req.item_id,
        label: `requires ${req.qty}`,
        type: "requires",
      });
    }
  }

  // Add tile nodes and edges
  for (const tile of tiles) {
    nodes.push({
      id: tile.id,
      label: tile.name,
      type: "tile",
      data: { theme: tile.theme, color: tile.color },
    });

    // Tile contains resources
    for (const resourceId of tile.resources || []) {
      edges.push({
        id: `${tile.id}-contains-${resourceId}`,
        source: tile.id,
        target: resourceId,
        label: "contains",
        type: "found_on",
      });
    }
  }

  // Add NPC nodes
  for (const npc of npcs) {
    nodes.push({
      id: npc.entity_id,
      label: npc.name,
      type: "npc",
      data: { backstory: npc.backstory?.substring(0, 100) },
    });
  }

  // Add quest nodes and edges
  for (const quest of quests) {
    nodes.push({
      id: quest.id,
      label: quest.name,
      type: "quest",
      data: { questType: quest.type, isTutorial: quest.is_tutorial },
    });

    // Quest giver
    if (quest.giver?.entity_id) {
      edges.push({
        id: `${quest.id}-giver-${quest.giver.entity_id}`,
        source: quest.id,
        target: quest.giver.entity_id,
        label: "given by",
        type: "giver",
      });
    }

    // Quest rewards
    for (const reward of quest.rewards || []) {
      const rewardObj = reward as { item_id?: string; type?: string };
      if (rewardObj.item_id) {
        edges.push({
          id: `${quest.id}-rewards-${rewardObj.item_id}`,
          source: quest.id,
          target: rewardObj.item_id,
          label: "rewards",
          type: "rewards",
        });
      }
    }

    // Quest objectives (collect items)
    for (const objective of quest.objectives || []) {
      const objData = objective as { item_id?: string; type?: string };
      if (objData.item_id) {
        edges.push({
          id: `${quest.id}-involves-${objData.item_id}`,
          source: quest.id,
          target: objData.item_id,
          label: "involves",
          type: "involves",
        });
      }
    }

    // Quest prerequisites
    for (const prereq of quest.prerequisites || []) {
      edges.push({
        id: `${quest.id}-requires-${prereq}`,
        source: quest.id,
        target: prereq,
        label: "requires",
        type: "requires",
      });
    }
  }

  // Add house tile nodes and edges
  for (const [id, houseTile] of Object.entries(houseTiles)) {
    nodes.push({
      id: id,
      label: houseTile.name,
      type: "house-tile",
      data: { sprite: houseTile.sprite, bgColor: houseTile.bgColor },
    });

    // House tile actions that transform to other tiles
    for (const action of houseTile.availableActions || []) {
      const result = action.result as { transform_to?: string } | undefined;
      if (result?.transform_to) {
        edges.push({
          id: `${id}-transforms-${result.transform_to}`,
          source: id,
          target: result.transform_to,
          label: action.name,
          type: "transforms_to",
        });
      }

      // Action requires items
      const requirements = action.requirements as { items?: Array<{ item_id: string }> } | undefined;
      if (requirements?.items) {
        for (const item of requirements.items) {
          edges.push({
            id: `${id}-action-requires-${item.item_id}`,
            source: id,
            target: item.item_id,
            label: `${action.name} requires`,
            type: "requires",
          });
        }
      }
    }
  }

  return { nodes, edges };
}

export function getNodeColor(type: GraphNode["type"]): string {
  const colors: Record<GraphNode["type"], string> = {
    item: "#f59e0b",      // amber
    resource: "#10b981",  // emerald
    tile: "#3b82f6",      // blue
    npc: "#a855f7",       // purple
    quest: "#f43f5e",     // rose
    "house-tile": "#06b6d4", // cyan
  };
  return colors[type];
}

export function getEdgeColor(type: GraphEdge["type"]): string {
  const colors: Record<GraphEdge["type"], string> = {
    yields: "#10b981",
    requires: "#f59e0b",
    found_on: "#3b82f6",
    giver: "#a855f7",
    involves: "#f43f5e",
    rewards: "#fbbf24",
    transforms_to: "#06b6d4",
  };
  return colors[type];
}
