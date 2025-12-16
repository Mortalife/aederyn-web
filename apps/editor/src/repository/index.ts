import * as fs from "fs/promises";
import * as path from "path";
import type {
  Item,
  ResourceModel,
  Tile,
  NPC,
  TileQuest,
  HouseTile,
  WorldBible,
} from "@aederyn/types";
import { createDefaultWorldBible } from "@aederyn/types";

export type { Item, Tile, NPC, HouseTile };
export type Resource = ResourceModel;
export type Quest = TileQuest;

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function readJsonFile<T>(filename: string): Promise<T[]> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeJsonFile<T>(filename: string, data: T[]): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export const repository = {
  items: {
    async getAll(): Promise<Item[]> {
      return readJsonFile<Item>("items.json");
    },
    async getById(id: string): Promise<Item | undefined> {
      const items = await this.getAll();
      return items.find((item) => item.id === id);
    },
    async create(item: Item): Promise<Item> {
      const items = await this.getAll();
      items.push(item);
      await writeJsonFile("items.json", items);
      return item;
    },
    async update(id: string, updates: Partial<Item>): Promise<Item | undefined> {
      const items = await this.getAll();
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return undefined;
      items[index] = { ...items[index], ...updates };
      await writeJsonFile("items.json", items);
      return items[index];
    },
    async delete(id: string): Promise<boolean> {
      const items = await this.getAll();
      const filtered = items.filter((item) => item.id !== id);
      if (filtered.length === items.length) return false;
      await writeJsonFile("items.json", filtered);
      return true;
    },
  },

  resources: {
    async getAll(): Promise<Resource[]> {
      return readJsonFile<Resource>("resources.json");
    },
    async getById(id: string): Promise<Resource | undefined> {
      const resources = await this.getAll();
      return resources.find((r) => r.id === id);
    },
    async create(resource: Resource): Promise<Resource> {
      const resources = await this.getAll();
      resources.push(resource);
      await writeJsonFile("resources.json", resources);
      return resource;
    },
    async update(id: string, updates: Partial<Resource>): Promise<Resource | undefined> {
      const resources = await this.getAll();
      const index = resources.findIndex((r) => r.id === id);
      if (index === -1) return undefined;
      resources[index] = { ...resources[index], ...updates };
      await writeJsonFile("resources.json", resources);
      return resources[index];
    },
    async delete(id: string): Promise<boolean> {
      const resources = await this.getAll();
      const filtered = resources.filter((r) => r.id !== id);
      if (filtered.length === resources.length) return false;
      await writeJsonFile("resources.json", filtered);
      return true;
    },
  },

  tiles: {
    async getAll(): Promise<Tile[]> {
      return readJsonFile<Tile>("tiles.json");
    },
    async getById(id: string): Promise<Tile | undefined> {
      const tiles = await this.getAll();
      return tiles.find((t) => t.id === id);
    },
    async create(tile: Tile): Promise<Tile> {
      const tiles = await this.getAll();
      tiles.push(tile);
      await writeJsonFile("tiles.json", tiles);
      return tile;
    },
    async update(id: string, updates: Partial<Tile>): Promise<Tile | undefined> {
      const tiles = await this.getAll();
      const index = tiles.findIndex((t) => t.id === id);
      if (index === -1) return undefined;
      tiles[index] = { ...tiles[index], ...updates };
      await writeJsonFile("tiles.json", tiles);
      return tiles[index];
    },
    async delete(id: string): Promise<boolean> {
      const tiles = await this.getAll();
      const filtered = tiles.filter((t) => t.id !== id);
      if (filtered.length === tiles.length) return false;
      await writeJsonFile("tiles.json", filtered);
      return true;
    },
  },

  npcs: {
    async getAll(): Promise<NPC[]> {
      return readJsonFile<NPC>("npcs.json");
    },
    async getById(id: string): Promise<NPC | undefined> {
      const npcs = await this.getAll();
      return npcs.find((n) => n.entity_id === id);
    },
    async create(npc: NPC): Promise<NPC> {
      const npcs = await this.getAll();
      npcs.push(npc);
      await writeJsonFile("npcs.json", npcs);
      return npc;
    },
    async update(id: string, updates: Partial<NPC>): Promise<NPC | undefined> {
      const npcs = await this.getAll();
      const index = npcs.findIndex((n) => n.entity_id === id);
      if (index === -1) return undefined;
      npcs[index] = { ...npcs[index], ...updates };
      await writeJsonFile("npcs.json", npcs);
      return npcs[index];
    },
    async delete(id: string): Promise<boolean> {
      const npcs = await this.getAll();
      const filtered = npcs.filter((n) => n.entity_id !== id);
      if (filtered.length === npcs.length) return false;
      await writeJsonFile("npcs.json", filtered);
      return true;
    },
  },

  quests: {
    async getAll(): Promise<Quest[]> {
      return readJsonFile<Quest>("quests.json");
    },
    async getById(id: string): Promise<Quest | undefined> {
      const quests = await this.getAll();
      return quests.find((q) => q.id === id);
    },
    async create(quest: Quest): Promise<Quest> {
      const quests = await this.getAll();
      quests.push(quest);
      await writeJsonFile("quests.json", quests);
      return quest;
    },
    async update(id: string, updates: Partial<Quest>): Promise<Quest | undefined> {
      const quests = await this.getAll();
      const index = quests.findIndex((q) => q.id === id);
      if (index === -1) return undefined;
      quests[index] = { ...quests[index], ...updates };
      await writeJsonFile("quests.json", quests);
      return quests[index];
    },
    async delete(id: string): Promise<boolean> {
      const quests = await this.getAll();
      const filtered = quests.filter((q) => q.id !== id);
      if (filtered.length === quests.length) return false;
      await writeJsonFile("quests.json", filtered);
      return true;
    },
  },

  houseTiles: {
    async getAll(): Promise<Record<string, HouseTile>> {
      await ensureDataDir();
      const filePath = path.join(DATA_DIR, "house-tiles.json");
      try {
        const content = await fs.readFile(filePath, "utf-8");
        return JSON.parse(content);
      } catch {
        return {};
      }
    },
    async getById(id: string): Promise<HouseTile | undefined> {
      const houseTiles = await this.getAll();
      return houseTiles[id];
    },
    async create(houseTile: HouseTile): Promise<HouseTile> {
      const houseTiles = await this.getAll();
      houseTiles[houseTile.id] = houseTile;
      await ensureDataDir();
      const filePath = path.join(DATA_DIR, "house-tiles.json");
      await fs.writeFile(filePath, JSON.stringify(houseTiles, null, 2), "utf-8");
      return houseTile;
    },
    async update(id: string, updates: Partial<HouseTile>): Promise<HouseTile | undefined> {
      const houseTiles = await this.getAll();
      if (!houseTiles[id]) return undefined;
      houseTiles[id] = { ...houseTiles[id], ...updates };
      await ensureDataDir();
      const filePath = path.join(DATA_DIR, "house-tiles.json");
      await fs.writeFile(filePath, JSON.stringify(houseTiles, null, 2), "utf-8");
      return houseTiles[id];
    },
    async delete(id: string): Promise<boolean> {
      const houseTiles = await this.getAll();
      if (!houseTiles[id]) return false;
      delete houseTiles[id];
      await ensureDataDir();
      const filePath = path.join(DATA_DIR, "house-tiles.json");
      await fs.writeFile(filePath, JSON.stringify(houseTiles, null, 2), "utf-8");
      return true;
    },
  },

  worldBible: {
    async get(): Promise<WorldBible> {
      await ensureDataDir();
      const filePath = path.join(DATA_DIR, "world-bible.json");
      try {
        const content = await fs.readFile(filePath, "utf-8");
        return JSON.parse(content);
      } catch {
        return createDefaultWorldBible();
      }
    },
    async save(worldBible: WorldBible): Promise<WorldBible> {
      await ensureDataDir();
      const filePath = path.join(DATA_DIR, "world-bible.json");
      worldBible.updatedAt = new Date().toISOString();
      await fs.writeFile(filePath, JSON.stringify(worldBible, null, 2), "utf-8");
      return worldBible;
    },
  },

  async getCounts(): Promise<{
    items: number;
    resources: number;
    tiles: number;
    npcs: number;
    quests: number;
    houseTiles: number;
  }> {
    const [items, resources, tiles, npcs, quests, houseTiles] = await Promise.all([
      this.items.getAll(),
      this.resources.getAll(),
      this.tiles.getAll(),
      this.npcs.getAll(),
      this.quests.getAll(),
      this.houseTiles.getAll(),
    ]);
    return {
      items: items.length,
      resources: resources.length,
      tiles: tiles.length,
      npcs: npcs.length,
      quests: quests.length,
      houseTiles: Object.keys(houseTiles).length,
    };
  },
};
