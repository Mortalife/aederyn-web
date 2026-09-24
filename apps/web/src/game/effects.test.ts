import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import "../test/config/index.js";

process.env.DATABASE_PATH = mkdtempSync(join(tmpdir(), "game-effects-")) + "/";

const { submit } = await import("./commands.js");
const { tick } = await import("./loop.js");
const { getUser } = await import("../user/user.js");
const { getInProgressAction } = await import("../user/action.js");
const { getSystemMessages } = await import("../user/system.js");
const { getTileSelection } = await import("../world/index.js");
const { resourcesById } = await import("../config/resources.js");
const { effectsById } = await import("../config/effects.js");
const { MAP_BOUNDS, START_POSITION } = await import("../config.js");
const { writer } = await import("../db/writer.js");
const { loadView } = await import("./view/load.js");
const { selectGame } = await import("./view/select.js");
const { UserInfo, ZoneHeader } = await import("../templates/elements.js");
const { userVersion } = await import("./versions.js");
const {
  collectEffects,
  effectiveStrength,
  gatherDurationMultiplier,
  resolveEffects,
} = await import("../world/effects.js");
const { HEALTH_REGEN_MS, healthRate } = await import("./systems/health.js");
type GameUserModel = import("../config.js").GameUserModel;
type Tile = import("../world/index.js").Cell;
type ActiveEffect = import("../world/effects.js").ActiveEffect;

let now = 1_000_000_000_000;

const run = async <C extends Parameters<typeof submit>[0]>(command: C) => {
  const result = submit(command);
  tick(now);
  return result;
};

const effect = (id: string) => effectsById.get(id)!;
const on = (effectId: string, strength: number): ActiveEffect => ({
  effectId,
  strength,
  source: { type: "tile", id: "tile_test" },
});
const find = (resolved: ReturnType<typeof resolveEffects>, id: string) =>
  resolved.find((r) => r.effect.id === id);

describe("effect resolver", () => {
  it("sums an effect across tile, worn item and consumable sources", () => {
    const campsite = getTileSelection(START_POSITION.x, START_POSITION.y);
    expect(campsite.id).toBe("tile_campsite");

    const active = collectEffects(
      START_POSITION,
      ["item_torch"],
      [
        { user_id: "u", item_id: "item_x", effect_id: "effect_rest", strength: 2, started_at: now, expires_at: now + 1000 },
        { user_id: "u", item_id: "item_y", effect_id: "effect_rest", strength: 5, started_at: now - 2000, expires_at: now },
      ],
      now
    );

    expect(active.map((a) => a.source.type)).toEqual(["tile", "item", "consumable"]);
    const resolved = resolveEffects(active);
    expect(find(resolved, "effect_rest")).toMatchObject({ strength: 5, effective: 5 });
    expect(find(resolved, "effect_light")).toMatchObject({ strength: 1 });
  });

  it("mitigates with protection / (protection + 100), and never to zero", () => {
    const resolved = resolveEffects([
      on("effect_spores", 4),
      on("effect_spore_ward", 60),
      on("effect_spore_ward", 40),
    ]);
    expect(find(resolved, "effect_spores")).toMatchObject({ strength: 4, protection: 100, effective: 2 });

    const heavy = resolveEffects([on("effect_spores", 4), on("effect_spore_ward", 300)]);
    expect(find(heavy, "effect_spores")!.effective).toBeCloseTo(1);
    expect(find(heavy, "effect_spores")!.effective).toBeGreaterThan(0);
  });

  it("lifts a binary effect with any protection", () => {
    expect(find(resolveEffects([on("effect_dark", 1)]), "effect_dark")!.effective).toBe(1);
    expect(
      find(resolveEffects([on("effect_dark", 5), on("effect_light", 0.1)]), "effect_dark")!.effective
    ).toBe(0);
  });

  it("never reduces an effect with mode none", () => {
    expect(effectiveStrength(effect("effect_rest"), 3, 500)).toBe(3);
    expect(effectiveStrength(effect("effect_bountiful"), 50, 100)).toBe(50);
  });

  it("scales gathering time by gather speed effects", () => {
    expect(gatherDurationMultiplier(resolveEffects([on("effect_cold", 100)]))).toBe(2);
    expect(gatherDurationMultiplier(resolveEffects([on("effect_bountiful", 50)]))).toBeCloseTo(1 / 1.5);
    expect(
      gatherDurationMultiplier(resolveEffects([on("effect_cold", 50), on("effect_cold_ward", 100)]))
    ).toBe(1.25);
  });

  it("stops natural regeneration while draining, and adds positive effects to it", () => {
    const natural = 1 / HEALTH_REGEN_MS;
    const online = { fighting: false, online: true };
    expect(healthRate([], online)).toBe(natural);
    expect(healthRate(resolveEffects([on("effect_spores", 1)]), online)).toBe(-1 / 5000);
    expect(healthRate(resolveEffects([on("effect_rest", 3)]), online)).toBeCloseTo(natural + 3 / 10_000);
    expect(healthRate(resolveEffects([on("effect_rest", 3)]), { fighting: true, online: true })).toBe(0);
    expect(healthRate(resolveEffects([on("effect_spores", 1)]), { fighting: false, online: false })).toBe(natural);
  });
});

describe("effects in the game", () => {
  let userId: string;
  let zone: { x: number; y: number; tile: Tile; resourceId: string };
  let monsterZone: { x: number; y: number; tile: Tile };
  const originalEffects = new Map<Tile, Tile["effects"]>();

  const setUser = (changes: Partial<GameUserModel>, id = userId) => {
    const user = getUser(id)!;
    writer
      .prepare("UPDATE users SET data = ? WHERE id = ?")
      .run(JSON.stringify({ ...user, ...changes }), id);
  };
  const setTileEffects = (effects: Tile["effects"], tile = zone.tile) => {
    if (!originalEffects.has(tile)) originalEffects.set(tile, tile.effects);
    tile.effects = effects;
  };
  const timedRows = (id = userId) =>
    writer
      .prepare<[string], { item_id: string; effect_id: string; strength: number; started_at: number; expires_at: number }>(
        "SELECT item_id, effect_id, strength, started_at, expires_at FROM active_effects WHERE user_id = ?"
      )
      .all(id);
  const lastMessage = (id = userId) => getSystemMessages(id)[0]?.message;

  beforeAll(() => {
    for (let x = MAP_BOUNDS.minX; x <= MAP_BOUNDS.maxX; x++) {
      for (let y = MAP_BOUNDS.minY; y <= MAP_BOUNDS.maxY; y++) {
        const tile = getTileSelection(x, y);
        if (!tile.accessible || tile.effects.length || tile.region?.effects.length) continue;
        const resource = tile.resources
          .map((id) => resourcesById.get(id))
          .find((r) => r && r.required_items.length === 0 && r.limitless);
        if (!zone && resource) zone = { x, y, tile, resourceId: resource.id };
        if (!monsterZone && tile.monsters?.length) monsterZone = { x, y, tile };
      }
    }
    if (!zone || !monsterZone) throw new Error("No zone with a free resource, or none with a monster");
  });

  beforeEach(async () => {
    userId = (await run({ type: "login", userId: "" }))!;
    await run({ type: "connect", userId });
    setUser({ p: { x: zone.x, y: zone.y }, z: true, h: 100, i: [], e: {} });
  });

  afterEach(() => {
    for (const [tile, effects] of originalEffects) tile.effects = effects;
    originalEffects.clear();
    for (const table of ["active_effects", "inprogress", "combat", "health_regen", "monster_state"]) {
      writer.prepare(`DELETE FROM ${table}`).run();
    }
  });

  it("drains health with a tile's negative effect, and stops natural regeneration", async () => {
    setTileEffects([{ id: "effect_spores", strength: 2 }]);
    setUser({ h: 50 });
    tick(now);
    // 2 HP per 5s comes off one at a time, every 2.5s.
    now += 2_499;
    tick(now);
    expect(getUser(userId)!.h).toBe(50);
    now += 1;
    tick(now);
    expect(getUser(userId)!.h).toBe(49);
    now += 2_500;
    tick(now);
    expect(getUser(userId)!.h).toBe(48);
    now += 10_000;
    tick(now);
    expect(getUser(userId)!.h).toBe(44);
  });

  it("drains at full health too, but not while offline", async () => {
    setTileEffects([{ id: "effect_spores", strength: 1 }]);
    tick(now);
    now += 5_000;
    tick(now);
    expect(getUser(userId)!.h).toBe(99);

    await run({ type: "disconnect", userId });
    setUser({ p: { x: zone.x, y: zone.y }, z: true });
    tick(now);
    now += 5_000;
    tick(now);
    expect(getUser(userId)!.h).toBe(100);
  });

  it("drains more slowly with mitigating protection, which never stops it", async () => {
    setTileEffects([{ id: "effect_spores", strength: 2 }]);
    writer
      .prepare("INSERT INTO active_effects VALUES (?, 'test_ward', 'effect_spore_ward', 100, ?, ?)")
      .run(userId, now, now + 1_000_000);
    tick(now);
    now += 5_000;
    tick(now);
    expect(getUser(userId)!.h).toBe(99);
    now += 5_000;
    tick(now);
    expect(getUser(userId)!.h).toBe(98);
  });

  it("sends a player whose health runs out to camp", async () => {
    setTileEffects([{ id: "effect_spores", strength: 5 }]);
    setUser({ h: 3 });
    tick(now);
    now += 5_000;
    tick(now);
    expect(getUser(userId)).toMatchObject({ p: START_POSITION, z: false, h: 10 });
    expect(lastMessage()).toBe("Spores overcame you. You were carried back to camp.");
  });

  it("uses a consumable: consumes one and heals instantly", async () => {
    setUser({ h: 50, i: [{ id: "poultice", item_id: "item_herb_poultice", qty: 2 }] });

    await run({ type: "use", userId, inventoryId: "poultice" });
    expect(getUser(userId)!.h).toBe(70);
    expect(getUser(userId)!.i).toEqual([{ id: "poultice", item_id: "item_herb_poultice", qty: 1 }]);
    expect(lastMessage()).toBe("You used Herb Poultice: +20 health.");

    await run({ type: "use", userId, inventoryId: "poultice" });
    expect(getUser(userId)!.h).toBe(90);
    expect(getUser(userId)!.i).toEqual([]);
    expect(timedRows()).toEqual([]);
  });

  it("won't use an item without on-use effects", async () => {
    setUser({ i: [{ id: "grass", item_id: "item_grass_01", qty: 3 }] });
    await run({ type: "use", userId, inventoryId: "grass" });
    expect(getUser(userId)!.i[0]!.qty).toBe(3);
    expect(lastMessage()).toBe("You can't use Wild Grass.");
  });

  it("refreshes a timed effect instead of stacking it, then expires it", async () => {
    setUser({ i: [{ id: "brew", item_id: "item_forager_brew", qty: 2 }] });

    await run({ type: "use", userId, inventoryId: "brew" });
    expect(timedRows()).toEqual([
      { item_id: "item_forager_brew", effect_id: "effect_bountiful", strength: 50, started_at: now, expires_at: now + 120_000 },
    ]);

    now += 60_000;
    tick(now);
    await run({ type: "use", userId, inventoryId: "brew" });
    expect(timedRows()).toEqual([
      { item_id: "item_forager_brew", effect_id: "effect_bountiful", strength: 50, started_at: now, expires_at: now + 120_000 },
    ]);
    const view = selectGame(loadView(userId, now)!, { now });
    expect(find(view.effects, "effect_bountiful")).toMatchObject({ strength: 50 });

    const html = UserInfo(view.user, [], 1, null, view.effects).toString();
    expect(html).toContain("Bountiful");
    expect(html).toContain(`id="effect-effect_bountiful-${now}"`);

    const version = userVersion(userId);
    now += 120_000;
    tick(now);
    expect(timedRows()).toEqual([]);
    expect(userVersion(userId)).toBeGreaterThan(version);
    expect(selectGame(loadView(userId, now)!, { now }).effects).toEqual([]);
  });

  it("speeds up and slows down gathering", async () => {
    const resource = resourcesById.get(zone.resourceId)!;
    const duration = () => {
      const action = getInProgressAction(userId)!;
      return action.completed_at - action.inprogress_at;
    };

    setUser({ i: [{ id: "brew", item_id: "item_forager_brew", qty: 1 }] });
    await run({ type: "use", userId, inventoryId: "brew" });
    await run({ type: "gather_start", userId, resourceId: resource.id });
    expect(duration()).toBe(Math.round((resource.collectionTime * 1000) / 1.5));
    await run({ type: "gather_cancel", userId, resourceId: resource.id });

    writer.prepare("DELETE FROM active_effects").run();
    setTileEffects([{ id: "effect_cold", strength: 100 }]);
    await run({ type: "gather_start", userId, resourceId: resource.id });
    expect(duration()).toBe(resource.collectionTime * 2000);
  });

  it("blocks gathering and fighting until protected, with a message", async () => {
    setTileEffects([{ id: "effect_dark", strength: 1 }]);
    const message = (effectsById.get("effect_dark") as { message: string }).message;

    await run({ type: "gather_start", userId, resourceId: zone.resourceId });
    expect(getInProgressAction(userId)).toBeNull();
    expect(lastMessage()).toBe(message);

    setUser({ e: { offHand: { id: "torch", item_id: "item_torch", qty: 1 } } });
    await run({ type: "gather_start", userId, resourceId: zone.resourceId });
    expect(getInProgressAction(userId)).not.toBeNull();
    await run({ type: "gather_cancel", userId, resourceId: zone.resourceId });

    setTileEffects([{ id: "effect_dark", strength: 1 }], monsterZone.tile);
    setUser({ p: { x: monsterZone.x, y: monsterZone.y }, z: true, e: {} });
    const fight = () => writer.prepare("SELECT * FROM combat WHERE user_id = ?").get(userId);
    await run({ type: "attack", userId, spawn: 0 });
    expect(fight()).toBeUndefined();
    expect(lastMessage()).toBe(message);

    setUser({ e: { offHand: { id: "torch", item_id: "item_torch", qty: 1 } } });
    await run({ type: "attack", userId, spawn: 0 });
    expect(fight()).toBeDefined();
  });

  it("shows a tile's effects on the zone header", () => {
    expect(selectGame(loadView(userId, now)!, { now }).effects).toEqual([]);

    setUser({ p: START_POSITION, z: true });
    const view = selectGame(loadView(userId, now)!, { now });
    const here = view.map.find((t) => t.here)!;
    const header = ZoneHeader(here).toString();
    expect(header).toContain("Rest");
    expect(header).toContain("+3 HP / 10s");
    expect(find(view.effects, "effect_rest")).toMatchObject({ strength: 3, effective: 3 });
  });
});
