import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import "../test/config/index.js";

process.env.DATABASE_PATH = mkdtempSync(join(tmpdir(), "journal-view-")) + "/";

const { Journal } = await import("./journal.js");
const { selectJournal } = await import("../game/view/select.js");
const { emptyDiscoveries, pairKey, tileKey } = await import("../user/discoveries.js");
const { allCells } = await import("../world/index.js");

const text = (rendered: { toString(): string }) =>
  rendered.toString().replaceAll("&#39;", "'").replaceAll("&quot;", '"');

/** A cell of this tile type in this region. */
const cellOf = (region: string, tileId: string) => {
  for (const cell of allCells()) {
    if (cell.tile.region?.id === region && cell.tile.id === tileId) {
      return tileKey(cell.x, cell.y);
    }
  }
  throw new Error(`No ${tileId} in ${region}`);
};

const some = () => {
  const discoveries = emptyDiscoveries();
  discoveries.tiles.add(cellOf("landing", "tile_grass"));
  discoveries.tiles.add(cellOf("landing", "tile_campsite"));
  discoveries.tiles.add(cellOf("woods", "tile_trees"));
  discoveries.monsters.add("monster_chicken");
  discoveries.recipes.add("resource_stone_axe_01");
  discoveries.npcs.add("npc_smith");
  return discoveries;
};

describe("selectJournal", () => {
  it("counts everything there is to find, with nothing found yet", () => {
    const journal = selectJournal(emptyDiscoveries());

    expect(journal.places).toEqual([
      { region: "landing", found: [], total: 4 },
      { region: "woods", found: [], total: 2 },
    ]);
    expect(journal.creatures).toEqual([]);
    expect(journal.recipes).toEqual([{ type: "workbench", found: [], total: 1 }]);
    expect(journal.people).toEqual([]);
    expect(journal.sections).toEqual({
      places: { found: 0, total: 6 },
      creatures: { found: 0, total: 1 },
      recipes: { found: 0, total: 1 },
      people: { found: 0, total: 2 },
    });
    expect(journal).toMatchObject({ found: 0, total: 10 });
  });

  it("counts places by kind within each region", () => {
    const discoveries = emptyDiscoveries();
    const grass = [...allCells()].filter(
      (cell) => cell.tile.region?.id === "landing" && cell.tile.id === "tile_grass"
    );
    discoveries.tiles.add(tileKey(grass[0]!.x, grass[0]!.y));
    discoveries.tiles.add(tileKey(grass[1]!.x, grass[1]!.y));
    discoveries.tiles.add(cellOf("woods", "tile_trees"));

    const { places, sections } = selectJournal(discoveries);

    expect(places).toEqual([
      { region: "landing", found: ["Grass"], total: 4 },
      { region: "woods", found: ["Trees"], total: 2 },
    ]);
    expect(sections.places).toEqual({ found: 2, total: 6 });
  });

  it("doesn't count trees in one region as found in another", () => {
    const discoveries = emptyDiscoveries();
    discoveries.tiles.add(cellOf("landing", "tile_trees"));

    const { places } = selectJournal(discoveries);

    expect(places.find((p) => p.region === "landing")!.found).toEqual(["Trees"]);
    expect(places.find((p) => p.region === "woods")!.found).toEqual([]);
  });

  it("lists creatures fought, with only the drops seen marked found", () => {
    const discoveries = emptyDiscoveries();
    discoveries.monsters.add("monster_chicken");

    const [chicken] = selectJournal(discoveries).creatures;
    expect(chicken!.monster.id).toBe("monster_chicken");
    expect(chicken!.weakTo).toEqual(["melee", "magic"]);
    expect(chicken!.drops.map((d) => [d.item.id, d.found])).toEqual([
      ["item_feather", false],
    ]);

    discoveries.monsterDrops.add(pairKey("monster_chicken", "item_feather"));
    expect(selectJournal(discoveries).creatures[0]!.drops[0]!.found).toBe(true);
  });

  it("doesn't list a creature by its drop alone", () => {
    const discoveries = emptyDiscoveries();
    discoveries.monsterDrops.add(pairKey("monster_chicken", "item_feather"));

    expect(selectJournal(discoveries).creatures).toEqual([]);
  });

  it("counts recipes per station, leaving gathering out", () => {
    const discoveries = emptyDiscoveries();
    discoveries.recipes.add("resource_stone_axe_01");
    discoveries.resourceOutputs.add(pairKey("resource_grass_01", "item_grass_01"));

    const { recipes, sections } = selectJournal(discoveries);

    expect(recipes).toEqual([{ type: "workbench", found: ["Stone Axe"], total: 1 }]);
    expect(sections.recipes).toEqual({ found: 1, total: 1 });
  });

  it("lists the people met who have a home, with where it is", () => {
    const discoveries = emptyDiscoveries();
    discoveries.npcs.add("npc_smith");
    discoveries.npcs.add("npc_wanderer");

    const { people, sections } = selectJournal(discoveries);

    expect(people.map(({ npc, home }) => [npc.entity_id, home])).toEqual([
      ["npc_smith", { name: "Stone Yard", x: 22, y: 37 }],
    ]);
    expect(sections.people).toEqual({ found: 1, total: 2 });
  });

  it("totals every section", () => {
    const journal = selectJournal(some());

    expect(journal.sections).toEqual({
      places: { found: 3, total: 6 },
      creatures: { found: 1, total: 1 },
      recipes: { found: 1, total: 1 },
      people: { found: 1, total: 2 },
    });
    expect(journal).toMatchObject({ found: 6, total: 10 });
  });
});

describe("Journal", () => {
  it("says nothing has been found in each empty section", () => {
    const html = text(Journal(selectJournal(emptyDiscoveries())));

    expect(html).toContain('id="journal"');
    expect(html).toContain("0/10 found");
    for (const empty of [
      "Nowhere yet.",
      "Nothing fought yet.",
      "Nothing made yet.",
      "No one met yet.",
    ]) {
      expect(html).toContain(empty);
    }
    expect(html).not.toContain("Chicken");
    expect(html).not.toContain("The Smith");
  });

  it("shows counts per section, region and station, and what's been found", () => {
    const html = text(Journal(selectJournal(some())));

    expect(html).toContain("6/10 found");
    expect(html).not.toContain("Nowhere yet.");
    expect(html).not.toContain("No one met yet.");

    const count = (found: number, total: number) =>
      `<span class="font-normal tabular-nums text-gray-500">${found}/${total}</span>`;
    expect(html).toContain(`Places ${count(3, 6)}`);
    expect(html).toContain(`Creatures ${count(1, 1)}`);
    expect(html).toContain(`Recipes ${count(1, 1)}`);
    expect(html).toContain(`People ${count(1, 2)}`);

    expect(html).toMatch(/Landing<\/span[\s\S]*?2\/4/);
    expect(html).toMatch(/Woods<\/span[\s\S]*?1\/2/);
    expect(html).toMatch(/Grass, Campsite|Campsite, Grass/);
    expect(html).toContain("Stone Axe");
    expect(html).toContain("The Smith");
    expect(html).toContain("(22, 37)");
  });

  it("shows a creature's style and weakness, and its drops found out of all", () => {
    const discoveries = some();
    let html = text(Journal(selectJournal(discoveries)));

    expect(html).toContain("Chicken");
    expect(html).toMatch(/melee · weak\s*<span class="text-emerald-300"\s*>melee, magic/);
    expect(html).toContain('title="Drops found: none"');
    expect(html).toMatch(/0\/1<\/span\s*>\s*<\/span>/);

    discoveries.monsterDrops.add(pairKey("monster_chicken", "item_feather"));
    html = text(Journal(selectJournal(discoveries)));
    expect(html).toContain('title="Drops found: Feather"');
    expect(html).toMatch(/1\/1<\/span\s*>\s*<\/span>/);
  });
});
