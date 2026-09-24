import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import "../test/config/index.js";
import {
  JITTER_AMPLITUDE,
  pickWeighted,
  regionAt,
  rollPool,
  spawnLandmark,
  tileIdAt,
  type MapData,
  type PoolEntry,
} from "@aederyn/types";

process.env.DATABASE_PATH = mkdtempSync(join(tmpdir(), "game-map-")) + "/";

const { MAP_BOUNDS, START_POSITION, worldMap } = await import("../config.js");
const { tileTypesMap } = await import("../config/tiles.js");
const { allCells, generateMap, getTileSelection, isOutOfBounds, rollCell } =
  await import("./index.js");
const { collectEffects } = await import("./effects.js");
const { npcsAtHome } = await import("../game/view/select.js");
const { ZoneNPCs } = await import("../templates/elements.js");

const region = (id: string, anchors: { x: number; y: number }[], tiles = [{ id: `tile_${id}`, weight: 1 }]) => ({
  id,
  tier: 0,
  anchors,
  tiles,
  effects: [],
});

const twoRegions: MapData = {
  bounds: { minX: 0, maxX: 39, minY: 0, maxY: 39 },
  regions: [region("west", [{ x: 5, y: 20 }]), region("east", [{ x: 34, y: 20 }])],
  landmarks: [{ id: "landmark_here", x: 5, y: 20, tile: "tile_pinned", spawn: true }],
};

describe("regions", () => {
  it("assigns each cell to the nearest anchor, the same way every time", () => {
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 40; x++) {
        expect(regionAt(twoRegions, x, y)).toBe(regionAt(twoRegions, x, y));
      }
      expect(regionAt(twoRegions, 0, y)!.id).toBe("west");
      expect(regionAt(twoRegions, 39, y)!.id).toBe("east");
    }
  });

  it("wobbles borders by a bounded jitter", () => {
    const borders = new Set<number>();
    for (let y = 0; y < 40; y++) {
      const border = [...Array(40).keys()].find(
        (x) => regionAt(twoRegions, x, y)!.id === "east"
      )!;
      borders.add(border);
      expect(Math.abs(border - 19.5)).toBeLessThanOrEqual(JITTER_AMPLITUDE + 1);
    }
    expect(borders.size).toBeGreaterThan(1);
  });

  it("picks tiles by weight, deterministically per cell", () => {
    const weighted: MapData = {
      ...twoRegions,
      regions: [
        region("all", [{ x: 0, y: 0 }], [
          { id: "tile_common", weight: 3 },
          { id: "tile_rare", weight: 1 },
        ]),
      ],
      landmarks: [],
    };
    let common = 0;
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 40; x++) {
        const id = tileIdAt(weighted, x, y);
        expect(tileIdAt(weighted, x, y)).toBe(id);
        if (id === "tile_common") common++;
      }
    }
    expect(common / 1600).toBeGreaterThan(0.68);
    expect(common / 1600).toBeLessThan(0.82);
  });

  it("never picks a tile without weight", () => {
    const items = [{ weight: 0 }, { weight: 1 }];
    expect(pickWeighted(items, 0)).toBe(items[1]);
    expect(pickWeighted(items, 0.999)).toBe(items[1]);
    expect(pickWeighted([{ weight: 0 }], 0.5)).toBeNull();
  });

  it("lets a landmark override the region fill", () => {
    expect(tileIdAt(twoRegions, 5, 20)).toBe("tile_pinned");
    expect(tileIdAt(twoRegions, 6, 20)).toBe("tile_west");
  });
});

describe("pools", () => {
  const seeds = [...Array(400).keys()].map((i) => `${i % 20},${Math.floor(i / 20)}`);

  it("rolls chance entries deterministically, about as often as their chance", () => {
    const pool: PoolEntry<{ id: string }>[] = [{ id: "always" }, { id: "sometimes", chance: 0.25 }];
    let hits = 0;
    for (const seed of seeds) {
      const rolled = rollPool(pool, seed);
      expect(rollPool(pool, seed)).toEqual(rolled);
      expect(rolled[0]).toEqual({ id: "always" });
      if (rolled.some((r) => r.id === "sometimes")) hits++;
    }
    expect(hits / seeds.length).toBeGreaterThan(0.18);
    expect(hits / seeds.length).toBeLessThan(0.32);
  });

  it("keeps chance off the rolled thing, and a chance of 1 always rolls", () => {
    expect(rollPool([{ id: "a", strength: 2, chance: 1 }], "0,0")).toEqual([{ id: "a", strength: 2 }]);
  });

  it("picks exactly one oneOf option, and every option turns up somewhere", () => {
    const pool: PoolEntry<{ id: string }>[] = [{ oneOf: [{ id: "copper" }, { id: "tin" }, { id: "iron" }] }];
    const picked = new Set<string>();
    for (const seed of seeds) {
      const rolled = rollPool(pool, seed);
      expect(rolled).toHaveLength(1);
      expect(rollPool(pool, seed)).toEqual(rolled);
      picked.add(rolled[0]!.id);
    }
    expect(picked).toEqual(new Set(["copper", "tin", "iron"]));
  });

  it("rolls each entry independently of the others", () => {
    const a = seeds.map((seed) => rollPool([{ id: "x", chance: 0.5 }, { id: "y", chance: 0.5 }], seed).map((r) => r.id).join());
    expect(new Set(a)).toEqual(new Set(["", "x", "y", "x,y"]));
  });
});

describe("the game map", () => {
  it("starts players at the spawn landmark", () => {
    const spawn = spawnLandmark(worldMap)!;
    expect(START_POSITION).toEqual({ x: spawn.x, y: spawn.y });
    const camp = getTileSelection(START_POSITION.x, START_POSITION.y);
    expect(camp).toMatchObject({ id: "tile_campsite", landmark: spawn.id });
  });

  it("reads its bounds from the map, inclusive", () => {
    const { minX, maxX, minY, maxY } = MAP_BOUNDS;
    expect(isOutOfBounds(minX, minY)).toBe(false);
    expect(isOutOfBounds(maxX, maxY)).toBe(false);
    expect(isOutOfBounds(minX - 1, minY)).toBe(true);
    expect(isOutOfBounds(maxX + 1, minY)).toBe(true);
    expect(isOutOfBounds(minX, minY - 1)).toBe(true);
    expect(isOutOfBounds(minX, maxY + 1)).toBe(true);
    expect([...allCells()]).toHaveLength((maxX - minX + 1) * (maxY - minY + 1));

    const corner = generateMap({ x: maxX, y: maxY }, []);
    expect(corner.find((t) => t.x === maxX + 1)?.tile).toBeNull();
    expect(corner.find((t) => t.here)?.tile).not.toBeNull();
  });

  it("fills every cell from its region, unless a landmark pins it", () => {
    for (const { x, y, tile } of allCells()) {
      if (tile.landmark) {
        expect(worldMap.landmarks.find((l) => l.id === tile.landmark)).toMatchObject({ x, y, tile: tile.id });
      } else {
        expect(tile.region!.tiles.map((t) => t.id)).toContain(tile.id);
      }
    }
  });

  it("expands monster counts into spawns whose indexes are stable", () => {
    const meadow = [...allCells()].find(({ tile }) => tile.id === "tile_grass")!;
    expect(tileTypesMap.get("tile_grass")!.monsters).toEqual([{ id: "monster_chicken", count: 2 }]);
    expect(meadow.tile.monsters).toEqual(["monster_chicken", "monster_chicken"]);

    const tile = tileTypesMap.get("tile_grass")!;
    const original = tile.monsters;
    tile.monsters = [
      { id: "monster_chicken", chance: 0.5 },
      { oneOf: [{ id: "monster_chicken", count: 2 }, { id: "monster_chicken" }], chance: 0.5 },
    ];
    try {
      const cells = [...allCells()].filter((c) => c.tile.id === "tile_grass");
      const counts = new Set<number>();
      for (const { x, y } of cells) {
        const rolled = rollCell(x, y);
        expect(rollCell(x, y).monsters).toEqual(rolled.monsters);
        counts.add(rolled.monsters.length);
      }
      expect(counts.size).toBeGreaterThan(1);
    } finally {
      tile.monsters = original;
    }
  });

  it("adds region effects to the tile's", () => {
    const cell = getTileSelection(START_POSITION.x, START_POSITION.y);
    const original = cell.region!.effects;
    cell.region!.effects = [{ id: "effect_spores", strength: 1 }];
    try {
      expect(
        collectEffects(START_POSITION, [], [], 0).map(({ effectId, source }) => [effectId, source.type])
      ).toEqual([
        ["effect_rest", "tile"],
        ["effect_spores", "region"],
      ]);
    } finally {
      cell.region!.effects = original;
    }
  });
});

describe("NPC homes", () => {
  it("shows NPCs who live at a landmark, with their idle line", () => {
    const npc = npcsAtHome("landmark_camp").find((n) => n.entity_id === "npc_quartermaster");
    expect(npc).toBeDefined();
    expect(npcsAtHome(null)).toEqual([]);
    const html = ZoneNPCs(
      npcsAtHome("landmark_camp").map((npc) => ({ npc, offers: [] }))
    ).toString();
    expect(html).toContain(npc!.name);
    expect(html).toContain(npc!.idleLine!);
    expect(ZoneNPCs([]).toString()).toBe('<div id="npcs"></div>');
  });
});
