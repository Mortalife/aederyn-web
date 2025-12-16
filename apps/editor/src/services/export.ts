import { inspect } from "util";
import { repository } from "../repository/index.js";

function toTs(obj: unknown): string {
  return inspect(obj, { depth: null, maxArrayLength: null, breakLength: 80 });
}

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
  return `import type { Item } from "./types.js";

export const items: Item[] = ${toTs(items)};

export const itemsById = new Map<string, Item>(items.map(item => [item.id, item]));
`;
}

function generateResourcesTs(resources: Awaited<ReturnType<typeof repository.resources.getAll>>): string {
  return `import type { ResourceModel } from "./types.js";

export const resources: ResourceModel[] = ${toTs(resources)};

export const resourcesById = new Map<string, ResourceModel>(resources.map(r => [r.id, r]));
`;
}

function generateTilesTs(tiles: Awaited<ReturnType<typeof repository.tiles.getAll>>): string {
  return `import { Tile } from "./types.js";

export const tileTypes: Tile[] = ${toTs(tiles)};

export const tileTypesMap = new Map(tileTypes.map((t) => [t.id, t]));
`;
}

function generateNpcsTs(npcs: Awaited<ReturnType<typeof repository.npcs.getAll>>): string {
  return `import type { NPC } from "./types.js";

export const npcs: NPC[] = ${toTs(npcs)};

export const npcsById = new Map<string, NPC>(npcs.map(n => [n.entity_id, n]));
`;
}

function generateQuestsTs(quests: Awaited<ReturnType<typeof repository.quests.getAll>>): string {
  return `import type { Quest } from "./types.js";

export const quests: Quest[] = ${toTs(quests)};

export const questsById = new Map<string, Quest>(quests.map(q => [q.id, q]));
`;
}

function generateHouseTilesTs(houseTiles: Awaited<ReturnType<typeof repository.houseTiles.getAll>>): string {
  return `import type { HouseTile } from "./types.js";

export const houseTiles: Record<string, HouseTile> = ${toTs(houseTiles)};

export const houseTilesById = new Map<string, HouseTile>(Object.entries(houseTiles));
`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
