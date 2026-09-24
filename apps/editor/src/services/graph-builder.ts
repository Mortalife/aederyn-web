import { poolIds, poolThings } from "@aederyn/types";
import { repository } from "../repository/index.js";

export interface GraphNode {
  id: string;
  label: string;
  type: "item" | "resource" | "tile" | "effect" | "npc" | "quest" | "house-tile" | "map";
  data: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: "yields" | "requires" | "found_on" | "giver" | "involves" | "rewards" | "transforms_to" | "applies" | "protects" | "places" | "home" | "excludes";
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export async function buildGraphData(): Promise<GraphData> {
  const [items, resources, tiles, effects, npcs, quests, houseTiles, map] = await Promise.all([
    repository.items.getAll(),
    repository.resources.getAll(),
    repository.tiles.getAll(),
    repository.effects.getAll(),
    repository.npcs.getAll(),
    repository.quests.getAll(),
    repository.houseTiles.getAll(),
    repository.map.get(),
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

    for (const effect of item.effects || []) {
      edges.push({
        id: `${item.id}-use-${effect.id}`,
        source: item.id,
        target: effect.id,
        label: `on use ${effect.strength}`,
        type: "applies",
      });
    }
    for (const effect of item.wornEffects || []) {
      edges.push({
        id: `${item.id}-worn-${effect.id}`,
        source: item.id,
        target: effect.id,
        label: `worn ${effect.strength}`,
        type: "applies",
      });
    }
  }

  for (const effect of effects) {
    nodes.push({
      id: effect.id,
      label: effect.name,
      type: "effect",
      data: { kind: effect.kind, mode: effect.mode },
    });

    if (effect.kind === "protects") {
      edges.push({
        id: `${effect.id}-protects-${effect.target}`,
        source: effect.id,
        target: effect.target,
        label: "protects",
        type: "protects",
      });
    }
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
    for (const resourceId of poolIds(tile.resources)) {
      edges.push({
        id: `${tile.id}-contains-${resourceId}`,
        source: tile.id,
        target: resourceId,
        label: "contains",
        type: "found_on",
      });
    }

    for (const effect of poolThings(tile.effects)) {
      edges.push({
        id: `${tile.id}-applies-${effect.id}-${effect.strength}`,
        source: tile.id,
        target: effect.id,
        label: `applies ${effect.strength}`,
        type: "applies",
      });
    }
  }

  // Map regions and landmarks
  for (const region of map.regions) {
    const id = regionNodeId(region.id);
    nodes.push({ id, label: `Region: ${region.id}`, type: "map", data: { tier: region.tier } });
    for (const tile of region.tiles) {
      edges.push({
        id: `${id}-places-${tile.id}`,
        source: id,
        target: tile.id,
        label: `weight ${tile.weight}`,
        type: "places",
      });
    }
    for (const effect of region.effects) {
      edges.push({
        id: `${id}-applies-${effect.id}`,
        source: id,
        target: effect.id,
        label: `applies ${effect.strength}`,
        type: "applies",
      });
    }
  }
  for (const landmark of map.landmarks) {
    nodes.push({
      id: landmark.id,
      label: `Landmark: ${landmark.id}${landmark.spawn ? " (spawn)" : ""}`,
      type: "map",
      data: { x: landmark.x, y: landmark.y },
    });
    edges.push({
      id: `${landmark.id}-places-${landmark.tile}`,
      source: landmark.id,
      target: landmark.tile,
      label: `at ${landmark.x},${landmark.y}`,
      type: "places",
    });
  }

  // Add NPC nodes
  for (const npc of npcs) {
    nodes.push({
      id: npc.entity_id,
      label: npc.name,
      type: "npc",
      data: { backstory: npc.backstory?.substring(0, 100) },
    });
    if (npc.home) {
      edges.push({
        id: `${npc.entity_id}-home-${npc.home}`,
        source: npc.entity_id,
        target: npc.home,
        label: "lives at",
        type: "home",
      });
    }
  }

  // Add quest nodes and edges
  for (const quest of quests) {
    nodes.push({
      id: quest.id,
      label: quest.name,
      type: "quest",
      data: { questType: quest.type, isTutorial: quest.is_tutorial },
    });

    // Who gives it: an NPC, or a contract board landmark
    if (quest.kind === "story" && quest.giver?.entity_id) {
      edges.push({
        id: `${quest.id}-giver-${quest.giver.entity_id}`,
        source: quest.id,
        target: quest.giver.entity_id,
        label: "given by",
        type: "giver",
      });
    }
    if (quest.kind === "contract" && quest.board) {
      edges.push({
        id: `${quest.id}-giver-${quest.board}`,
        source: quest.id,
        target: quest.board,
        label: "posted on",
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

    // Quest objectives: items, NPCs to talk to, landmarks to reach
    for (const objective of quest.objectives || []) {
      const objData = objective as { item_id?: string; entity_id?: string; landmark?: string; type?: string };
      for (const target of [objData.item_id, objData.entity_id, objData.landmark]) {
        if (!target || edges.some((e) => e.id === `${quest.id}-involves-${target}`)) continue;
        edges.push({
          id: `${quest.id}-involves-${target}`,
          source: quest.id,
          target,
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

    for (const excluded of quest.kind === "story" ? quest.excludes || [] : []) {
      edges.push({
        id: `${quest.id}-excludes-${excluded}`,
        source: quest.id,
        target: excluded,
        label: "excludes",
        type: "excludes",
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
    effect: "#eab308",    // yellow
    npc: "#a855f7",       // purple
    quest: "#f43f5e",     // rose
    "house-tile": "#06b6d4", // cyan
    map: "#84cc16",       // lime
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
    applies: "#eab308",
    protects: "#84cc16",
    places: "#3b82f6",
    home: "#a855f7",
    excludes: "#ef4444",
  };
  return colors[type];
}

/** Region IDs share a namespace with nothing else, so graph nodes prefix them. */
export const regionNodeId = (id: string) => `region:${id}`;
