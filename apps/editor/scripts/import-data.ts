/**
 * Import script to copy existing game data from apps/web/src/config
 * into JSON files in apps/editor/data/
 *
 * Run with: pnpm --filter editor import-data
 */

import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EDITOR_DATA_DIR = path.join(__dirname, "..", "data");
const WEB_CONFIG_DIR = path.join(__dirname, "..", "..", "web", "src", "config");

async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(EDITOR_DATA_DIR);
  } catch {
    await fs.mkdir(EDITOR_DATA_DIR, { recursive: true });
  }
}

async function importItems(): Promise<void> {
  const { items } = await import(path.join(WEB_CONFIG_DIR, "items.js"));
  await fs.writeFile(
    path.join(EDITOR_DATA_DIR, "items.json"),
    JSON.stringify(items, null, 2),
    "utf-8"
  );
  console.log(`✅ Imported ${items.length} items`);
}

async function importResources(): Promise<void> {
  const { resources } = await import(path.join(WEB_CONFIG_DIR, "resources.js"));
  await fs.writeFile(
    path.join(EDITOR_DATA_DIR, "resources.json"),
    JSON.stringify(resources, null, 2),
    "utf-8"
  );
  console.log(`✅ Imported ${resources.length} resources`);
}

async function importTiles(): Promise<void> {
  const { tileTypes } = await import(path.join(WEB_CONFIG_DIR, "tiles.js"));
  await fs.writeFile(
    path.join(EDITOR_DATA_DIR, "tiles.json"),
    JSON.stringify(tileTypes, null, 2),
    "utf-8"
  );
  console.log(`✅ Imported ${tileTypes.length} tiles`);
}

async function importMonsters(): Promise<void> {
  const { monsters } = await import(path.join(WEB_CONFIG_DIR, "monsters.js"));
  await fs.writeFile(
    path.join(EDITOR_DATA_DIR, "monsters.json"),
    JSON.stringify(monsters, null, 2),
    "utf-8"
  );
  console.log(`✅ Imported ${monsters.length} monsters`);
}

async function importNpcs(): Promise<void> {
  const { npcs } = await import(path.join(WEB_CONFIG_DIR, "npcs.js"));
  await fs.writeFile(
    path.join(EDITOR_DATA_DIR, "npcs.json"),
    JSON.stringify(npcs, null, 2),
    "utf-8"
  );
  console.log(`✅ Imported ${npcs.length} NPCs`);
}

async function importQuests(): Promise<void> {
  // Check if quests config exists
  try {
    const { quests } = await import(path.join(WEB_CONFIG_DIR, "quests.js"));
    await fs.writeFile(
      path.join(EDITOR_DATA_DIR, "quests.json"),
      JSON.stringify(quests, null, 2),
      "utf-8"
    );
    console.log(`✅ Imported ${quests.length} quests`);
  } catch {
    // Create empty quests file if none exists
    await fs.writeFile(
      path.join(EDITOR_DATA_DIR, "quests.json"),
      JSON.stringify([], null, 2),
      "utf-8"
    );
    console.log(`⚠️ No quests found, created empty quests.json`);
  }
}

async function importHouseTiles(): Promise<void> {
  // Check if house-tiles config exists
  try {
    const { houseTiles } = await import(
      path.join(WEB_CONFIG_DIR, "house-tiles.js")
    );
    await fs.writeFile(
      path.join(EDITOR_DATA_DIR, "house-tiles.json"),
      JSON.stringify(houseTiles, null, 2),
      "utf-8"
    );
    console.log(`✅ Imported house tiles`);
  } catch {
    // Create empty house-tiles file if none exists
    await fs.writeFile(
      path.join(EDITOR_DATA_DIR, "house-tiles.json"),
      JSON.stringify({}, null, 2),
      "utf-8"
    );
    console.log(`⚠️ No house tiles found, created empty house-tiles.json`);
  }
}

async function main(): Promise<void> {
  console.log("🚀 Starting data import from apps/web...\n");

  await ensureDataDir();

  try {
    await importItems();
    await importResources();
    await importTiles();
    await importMonsters();
    await importNpcs();
    await importQuests();
    await importHouseTiles();

    console.log("\n✨ Data import complete!");
  } catch (error) {
    console.error("❌ Import failed:", error);
    process.exit(1);
  }
}

main();
