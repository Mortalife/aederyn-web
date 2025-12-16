import { repository } from "../repository/index.js";

export interface ExportResult {
  format: "json" | "typescript";
  files: Array<{
    filename: string;
    content: string;
    size: number;
  }>;
  totalSize: number;
}

export async function exportToJson(): Promise<ExportResult> {
  const [items, resources, tiles, npcs, quests, houseTiles] = await Promise.all([
    repository.items.getAll(),
    repository.resources.getAll(),
    repository.tiles.getAll(),
    repository.npcs.getAll(),
    repository.quests.getAll(),
    repository.houseTiles.getAll(),
  ]);

  const files = [
    { filename: "items.json", content: JSON.stringify(items, null, 2) },
    { filename: "resources.json", content: JSON.stringify(resources, null, 2) },
    { filename: "tiles.json", content: JSON.stringify(tiles, null, 2) },
    { filename: "npcs.json", content: JSON.stringify(npcs, null, 2) },
    { filename: "quests.json", content: JSON.stringify(quests, null, 2) },
    { filename: "house-tiles.json", content: JSON.stringify(houseTiles, null, 2) },
  ].map((f) => ({ ...f, size: new TextEncoder().encode(f.content).length }));

  return {
    format: "json",
    files,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
  };
}

export async function exportToTypeScript(): Promise<ExportResult> {
  const [items, resources, tiles, npcs, quests, houseTiles] = await Promise.all([
    repository.items.getAll(),
    repository.resources.getAll(),
    repository.tiles.getAll(),
    repository.npcs.getAll(),
    repository.quests.getAll(),
    repository.houseTiles.getAll(),
  ]);

  const files = [
    {
      filename: "items.ts",
      content: generateItemsTs(items),
    },
    {
      filename: "resources.ts",
      content: generateResourcesTs(resources),
    },
    {
      filename: "tiles.ts",
      content: generateTilesTs(tiles),
    },
    {
      filename: "npcs.ts",
      content: generateNpcsTs(npcs),
    },
    {
      filename: "quests.ts",
      content: generateQuestsTs(quests),
    },
    {
      filename: "house-tiles.ts",
      content: generateHouseTilesTs(houseTiles),
    },
  ].map((f) => ({ ...f, size: new TextEncoder().encode(f.content).length }));

  return {
    format: "typescript",
    files,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
  };
}

function generateItemsTs(items: Awaited<ReturnType<typeof repository.items.getAll>>): string {
  return `// Auto-generated from Game Design GUI
// Generated at: ${new Date().toISOString()}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: "resource" | "tool" | "weapon" | "armor" | "consumable" | "quest" | "item";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  stackable: boolean;
  maxStackSize: number;
  equippable: boolean;
  equipSlot?: string;
  value: number;
  weight: number;
}

export const items: Item[] = ${JSON.stringify(items, null, 2)};

export const itemsById = new Map<string, Item>(items.map(item => [item.id, item]));
`;
}

function generateResourcesTs(resources: Awaited<ReturnType<typeof repository.resources.getAll>>): string {
  return `// Auto-generated from Game Design GUI
// Generated at: ${new Date().toISOString()}

export interface Resource {
  id: string;
  name: string;
  amount: number;
  limitless: boolean;
  collectionTime: number;
  reward_items: Array<{ item_id: string; qty: number }>;
  required_items: Array<{ item_id: string; qty: number; consumed?: boolean; itemDurabilityReduction?: number }>;
  type: "resource" | "workbench" | "furnace" | "magic";
  verb: string;
}

export const resources: Resource[] = ${JSON.stringify(resources, null, 2)};

export const resourcesById = new Map<string, Resource>(resources.map(r => [r.id, r]));
`;
}

function generateTilesTs(tiles: Awaited<ReturnType<typeof repository.tiles.getAll>>): string {
  return `// Auto-generated from Game Design GUI
// Generated at: ${new Date().toISOString()}

export interface Tile {
  id: string;
  name: string;
  color: string;
  backgroundColor: string;
  theme: string;
  texture?: string;
  resources: string[];
  rarity: number;
  accessible: boolean;
  description?: string;
}

export const tiles: Tile[] = ${JSON.stringify(tiles, null, 2)};

export const tilesById = new Map<string, Tile>(tiles.map(t => [t.id, t]));
`;
}

function generateNpcsTs(npcs: Awaited<ReturnType<typeof repository.npcs.getAll>>): string {
  return `// Auto-generated from Game Design GUI
// Generated at: ${new Date().toISOString()}

export interface NPC {
  entity_id: string;
  name: string;
  backstory: string;
  personalMission: string;
  hopes: string;
  fears: string;
  relationships: Record<string, string[]>;
}

export const npcs: NPC[] = ${JSON.stringify(npcs, null, 2)};

export const npcsById = new Map<string, NPC>(npcs.map(n => [n.entity_id, n]));
`;
}

function generateQuestsTs(quests: Awaited<ReturnType<typeof repository.quests.getAll>>): string {
  return `// Auto-generated from Game Design GUI
// Generated at: ${new Date().toISOString()}

export interface Quest {
  id: string;
  type: "collection" | "crafting" | "exploration" | "combat" | "delivery" | "dialog";
  name: string;
  giver: {
    entity_id: string;
    zone_id?: string;
    x?: number;
    y?: number;
  };
  description: string;
  objectives: unknown[];
  completion: Record<string, unknown>;
  rewards: unknown[];
  is_tutorial?: boolean;
  prerequisites?: string[];
}

export const quests: Quest[] = ${JSON.stringify(quests, null, 2)};

export const questsById = new Map<string, Quest>(quests.map(q => [q.id, q]));
`;
}

function generateHouseTilesTs(houseTiles: Awaited<ReturnType<typeof repository.houseTiles.getAll>>): string {
  return `// Auto-generated from Game Design GUI
// Generated at: ${new Date().toISOString()}

export interface HouseTileAction {
  id: string;
  name: string;
  description: string;
  requirements?: Record<string, unknown>;
  result?: Record<string, unknown>;
  canUndo?: boolean;
}

export interface HouseTile {
  id: string;
  name: string;
  description: string;
  sprite: string;
  bgColor: string;
  availableActions: HouseTileAction[];
  flags?: Record<string, unknown>;
}

export const houseTiles: Record<string, HouseTile> = ${JSON.stringify(houseTiles, null, 2)};

export const houseTilesById = new Map<string, HouseTile>(Object.entries(houseTiles));
`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
