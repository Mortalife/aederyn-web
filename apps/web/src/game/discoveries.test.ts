import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "../test/config/index.js";

process.env.DATABASE_PATH = mkdtempSync(join(tmpdir(), "game-discoveries-")) + "/";

const { submit } = await import("./commands.js");
const { tick } = await import("./loop.js");
const { getUser } = await import("../user/user.js");
const { getSystemMessages } = await import("../user/system.js");
const { writer } = await import("../db/writer.js");
const { discoveryVersion, userVersion } = await import("./versions.js");
const { discover, discoverTile } = await import("./systems/discoveries.js");
const { getDiscoveries } = await import("../user/discoveries.js");
const { loadView } = await import("./view/load.js");
const { selectGame } = await import("./view/select.js");
const { buildScreen } = await import("./view/fragments.js");
const { getTileSelection } = await import("../world/index.js");
const { landmarkPoint } = await import("../world/quests.js");
const { resourcesById } = await import("../config/resources.js");
const { monstersById } = await import("../config/monsters.js");
const { MAP_BOUNDS, START_POSITION } = await import("../config.js");
type GameUserModel = import("../config.js").GameUserModel;
type DiscoveryKind = import("../user/discoveries.js").DiscoveryKind;

let now = 1_000_000_000_000;
let userId: string;

const run = async <C extends Parameters<typeof submit>[0]>(command: C) => {
  const result = submit(command);
  tick(now);
  return result;
};

const setUser = (changes: Partial<GameUserModel>) => {
  const user = getUser(userId)!;
  writer
    .prepare("UPDATE users SET data = ? WHERE id = ?")
    .run(JSON.stringify({ ...user, ...changes }), userId);
};

const found = (kind: DiscoveryKind, id = userId) =>
  writer
    .prepare<[string, string], { id: string }>(
      "SELECT id FROM discoveries WHERE user_id = ? AND kind = ? ORDER BY id"
    )
    .all(id, kind)
    .map((row) => row.id);

const messages = (id = userId) => getSystemMessages(id).map((m) => m.message);

/** The first accessible, non-landmark cell `match` accepts. */
const findCell = (match: (x: number, y: number) => boolean) => {
  for (let x = MAP_BOUNDS.minX; x <= MAP_BOUNDS.maxX; x++) {
    for (let y = MAP_BOUNDS.minY; y <= MAP_BOUNDS.maxY; y++) {
      const cell = getTileSelection(x, y);
      if (cell.accessible && !cell.landmark && match(x, y)) {
        return { x, y };
      }
    }
  }
  throw new Error("No matching cell");
};

beforeEach(async () => {
  now += 60_000;
  userId = (await run({ type: "login", userId: "" }))!;
  await run({ type: "connect", userId });
});

describe("discoveries", () => {
  it("knows only the spawn cell when a player is created, without a log line", () => {
    expect(found("tile")).toEqual([`${START_POSITION.x},${START_POSITION.y}`]);
    expect(messages()).toEqual([]);
  });

  it("records only new discoveries, and bumps the version only for those", () => {
    const before = discoveryVersion(userId);
    const user = userVersion(userId);

    expect(discover(userId, "item", "item_torch", now)).toBe(true);
    expect(discoveryVersion(userId)).toBe(before + 1);
    expect(userVersion(userId)).toBe(user);

    expect(discover(userId, "item", "item_torch", now + 1)).toBe(false);
    expect(discoveryVersion(userId)).toBe(before + 1);
    expect(userVersion(userId)).toBe(user);
    expect(found("item")).toEqual(["item_torch"]);
  });

  it("records the cells moved onto and entered, announcing each new one", async () => {
    const start = getUser(userId)!.p;
    await run({ type: "move", userId, direction: "up" });
    const p = getUser(userId)!.p;
    expect(p).not.toEqual(start);

    const cell = getTileSelection(p.x, p.y);
    expect(found("tile")).toContain(`${p.x},${p.y}`);
    expect(messages()[0]).toBe(`Discovered: ${cell.name}`);
    expect(getSystemMessages(userId)[0]).toMatchObject({
      action_type: "discovery",
      action_id: `tile:${p.x},${p.y}`,
      location_x: p.x,
      location_y: p.y,
    });

    const version = discoveryVersion(userId);
    await run({ type: "move", userId, direction: "down" });
    await run({ type: "move", userId, direction: "up" });
    await run({ type: "move", userId, direction: "enter" });
    expect(discoveryVersion(userId)).toBe(version);
    expect(messages().filter((m) => m.startsWith("Discovered"))).toHaveLength(1);
  });

  it("announces every new cell, even of a kind already found, and each only once", () => {
    const grass = (x: number, y: number) => getTileSelection(x, y).id === "tile_grass";
    const first = findCell(grass);
    const second = findCell((x, y) => grass(x, y) && (x !== first.x || y !== first.y));

    discoverTile(userId, first.x, first.y, now);
    discoverTile(userId, second.x, second.y, now);
    discoverTile(userId, first.x, first.y, now);
    expect(found("tile")).toContain(`${second.x},${second.y}`);
    expect(messages()).toEqual(["Discovered: Grass", "Discovered: Grass"]);
    expect(getSystemMessages(userId).map((m) => m.action_id)).toEqual([
      `tile:${second.x},${second.y}`,
      `tile:${first.x},${first.y}`,
    ]);

    const yard = landmarkPoint("landmark_stone_yard")!;
    discoverTile(userId, yard.x, yard.y, now);
    expect(messages()[0]).toBe("Discovered: Stone Yard");
  });

  describe("on completing an action", () => {
    const grass = resourcesById.get("resource_grass_01")!;
    const type = grass.type;

    afterEach(() => {
      grass.type = type;
    });

    const gather = async () => {
      setUser({
        p: findCell((x, y) => getTileSelection(x, y).resources.includes(grass.id)),
        z: true,
      });
      await run({ type: "gather_start", userId, resourceId: grass.id });
      now += grass.collectionTime * 1000 + 1;
      tick(now);
    };

    it("records the outputs and items from a gathering node, but no recipe", async () => {
      await gather();

      expect(found("resource_output")).toEqual(["resource_grass_01:item_grass_01"]);
      expect(found("item")).toEqual(["item_grass_01"]);
      expect(found("recipe")).toEqual([]);
    });

    it("keeps a node's outputs out of the activity tooltip until they're found", async () => {
      setUser({
        p: findCell((x, y) => getTileSelection(x, y).resources.includes(grass.id)),
        z: true,
      });
      await run({ type: "gather_start", userId, resourceId: grass.id });
      const activity = () => {
        const view = selectGame(loadView(userId, now)!, { now });
        return buildScreen(view, {})
          .regions.find((f) => f.id === "activity")!
          .render()
          .toString();
      };

      expect(activity()).toContain('title="Gives ?"');
      expect(activity()).not.toContain("Wild Grass");

      discover(userId, "resource_output", "resource_grass_01:item_grass_01", now);
      expect(activity()).toContain('title="Gives 1 x Wild Grass"');
    });

    it("records and announces a recipe completed at a station, once", async () => {
      grass.type = "workbench";
      await gather();

      expect(found("recipe")).toEqual([grass.id]);
      expect(messages()[0]).toBe(`Discovered: ${grass.name}`);

      const version = discoveryVersion(userId);
      await gather();
      expect(discoveryVersion(userId)).toBe(version);
      expect(messages().filter((m) => m === `Discovered: ${grass.name}`)).toHaveLength(1);
    });
  });

  describe("in combat", () => {
    const chicken = monstersById.get("monster_chicken")!;
    const health = chicken.health;

    afterEach(() => {
      chicken.health = health;
      writer.prepare("DELETE FROM combat").run();
      writer.prepare("DELETE FROM monster_state").run();
    });

    const chickenZone = () =>
      findCell((x, y) => !!getTileSelection(x, y).monsters?.includes(chicken.id));

    it("records the monster only once the fight is over", async () => {
      setUser({ p: chickenZone(), z: true, h: 100 });

      await run({ type: "attack", userId, spawn: 0 });
      expect(found("monster")).toEqual([]);
      expect(messages()).not.toContain(`Discovered: ${chicken.name}`);

      await run({ type: "flee", userId });
      expect(found("monster")).toEqual([chicken.id]);
      expect(messages()).toContain(`Discovered: ${chicken.name}`);
      expect(found("monster_drop")).toEqual([]);
    });

    it("records the monster and its drops on a kill", async () => {
      setUser({ p: chickenZone(), z: true, h: 100 });
      chicken.health = 1;

      await run({ type: "attack", userId, spawn: 0 });

      expect(found("monster")).toEqual([chicken.id]);
      expect(messages()).toContain(`Discovered: ${chicken.name}`);
      expect(found("monster_drop")).toEqual(["monster_chicken:item_feather"]);
      expect(found("item")).toContain("item_feather");
    });
  });

  describe("from quests", () => {
    const yard = landmarkPoint("landmark_stone_yard")!;
    const grove = landmarkPoint("landmark_grove")!;

    it("hears of the quest's places on accepting it, but meets no one", async () => {
      setUser({ p: yard, z: true });
      await run({ type: "quest_start", userId, questId: "quest_test_wanderer" });

      expect(found("npc")).toEqual([]);
      expect(found("heard_tile")).toEqual(
        [`${grove.x},${grove.y}`, `${yard.x},${yard.y}`].sort()
      );
      expect(messages()).not.toContain("Discovered: The Smith");
    });

    it("meets the NPC a talk objective is with", async () => {
      setUser({ p: yard, z: true });
      await run({ type: "quest_start", userId, questId: "quest_test_wanderer" });
      setUser({ p: grove, z: true });
      await run({
        type: "quest_advance",
        userId,
        questId: "quest_test_wanderer",
        objectiveId: "talk_wanderer",
      });

      expect(found("npc")).toEqual(["npc_wanderer"]);
    });
  });

  it("backfills what a player from before discoveries already knows, silently", async () => {
    const id = crypto.randomUUID();
    const p = findCell((x, y) => getTileSelection(x, y).id === "tile_grass");
    const user: GameUserModel = {
      ...getUser(userId)!,
      id,
      p,
      i: [{ id: "a", item_id: "item_stone_01", qty: 2 }],
      e: { mainHand: { id: "b", item_id: "item_wooden_club", qty: 1 } },
    };
    writer.prepare("INSERT INTO users (id, data) VALUES (?, ?)").run(id, JSON.stringify(user));
    writer
      .prepare(
        "INSERT INTO quest_progress (user_id, quest_id, status, started_at, completed_at) VALUES (?, 'quest_test_crafting', 'in_progress', ?, NULL)"
      )
      .run(id, now);
    const objective = writer.prepare(
      "INSERT INTO objective_progress (user_id, quest_id, objective_id, current, required, completed) VALUES (?, 'quest_test_crafting', ?, ?, ?, ?)"
    );
    objective.run(id, "talk_smith", 2, 2, 1);
    objective.run(id, "craft_axe", 0, 1, 0);

    await run({ type: "connect", userId: id });

    expect(found("tile", id)).toEqual([`${p.x},${p.y}`]);
    expect(found("item", id)).toEqual(["item_stone_01", "item_wooden_club"]);
    expect(found("npc", id)).toEqual(["npc_smith"]);
    const yard = landmarkPoint("landmark_stone_yard")!;
    expect(found("heard_tile", id)).toEqual([`${yard.x},${yard.y}`]);
    expect(found("resource_output", id)).toEqual([]);
    expect(messages(id)).toEqual([]);

    writer
      .prepare("UPDATE objective_progress SET current = 1 WHERE user_id = ? AND objective_id = 'craft_axe'")
      .run(id);
    await run({ type: "connect", userId: id });
    expect(found("resource_output", id)).toEqual(["resource_trees_01:item_log_01"]);

    const version = discoveryVersion(id);
    await run({ type: "connect", userId: id });
    expect(discoveryVersion(id)).toBe(version);
  });

  it("doesn't backfill a quest giver the player hasn't talked to", async () => {
    const id = crypto.randomUUID();
    writer
      .prepare("INSERT INTO users (id, data) VALUES (?, ?)")
      .run(id, JSON.stringify({ ...getUser(userId)!, id }));
    writer
      .prepare(
        "INSERT INTO quest_progress (user_id, quest_id, status, started_at, completed_at) VALUES (?, 'quest_test_wanderer', 'in_progress', ?, NULL)"
      )
      .run(id, now);

    await run({ type: "connect", userId: id });

    expect(found("npc", id)).toEqual([]);
    expect(found("heard_tile", id)).not.toEqual([]);
  });

  it("gives the view the player's discoveries and their version", async () => {
    await run({ type: "move", userId, direction: "up" });
    const p = getUser(userId)!.p;

    const view = selectGame(loadView(userId, now)!, { now });

    expect(view.discoveries.tiles.has(`${p.x},${p.y}`)).toBe(true);
    expect(view.discoveries).toEqual(getDiscoveries(userId));
    expect(view.discoveryVersion).toBe(discoveryVersion(userId));

    const cached = view.discoveries;
    expect(selectGame(loadView(userId, now)!, { now }).discoveries).toBe(cached);
    discover(userId, "npc", "npc_wanderer", now);
    const next = selectGame(loadView(userId, now)!, { now });
    expect(next.discoveries.npcs.has("npc_wanderer")).toBe(true);
    expect(next.discoveryVersion).toBe(discoveryVersion(userId));
  });

  it("keys the scene rows on discoveries, never on density", async () => {
    await run({ type: "move", userId, direction: "enter" });
    const keys = () => {
      const view = selectGame(loadView(userId, now)!, { now });
      const screen = buildScreen(view, {});
      return new Map(
        [...screen.regions, ...screen.parts].map((f) => [f.id, f.key])
      );
    };

    const before = keys();
    const version = `d${discoveryVersion(userId)}`;
    for (const id of [
      "resources",
      "monsters",
      "npcs",
      "dialogue",
      "minimap",
      "journal",
      "activity",
    ]) {
      expect(before.get(id)).toContain(version);
    }
    expect([...before.values()].join()).not.toContain("density");

    discover(userId, "resource_output", "resource_grass_01:item_grass", now);
    const after = keys();
    for (const id of [
      "resources",
      "monsters",
      "npcs",
      "dialogue",
      "minimap",
      "journal",
      "activity",
    ]) {
      expect(after.get(id), id).not.toBe(before.get(id));
    }
    for (const id of ["inventory", "equipment", "hud", "zone-header"]) {
      expect(after.get(id), id).toBe(before.get(id));
    }
  });

  it("redraws only what shows discoveries when one is made", async () => {
    await run({ type: "move", userId, direction: "enter" });
    const keys = () => {
      const view = selectGame(loadView(userId, now)!, { now });
      const screen = buildScreen(view, {});
      return new Map(
        [...screen.regions, ...screen.parts].map((f) => [f.id, f.key])
      );
    };

    const before = keys();
    const version = `d${discoveryVersion(userId)}`;
    const user = userVersion(userId);
    for (const id of [
      "resources",
      "monsters",
      "npcs",
      "dialogue",
      "minimap",
      "journal",
      "activity",
    ]) {
      expect(before.get(id)).toContain(version);
    }
    expect([...before.values()].join()).not.toContain("density");

    discover(userId, "item", "item_torch", now);
    expect(userVersion(userId)).toBe(user);
    const after = keys();
    for (const id of ["inventory", "equipment", "hud", "zone-header"]) {
      expect(after.get(id), id).toBe(before.get(id));
    }
    expect(after.get("resources")).not.toBe(before.get("resources"));
  });

  it("keys the world map and the tile contents beside it on discoveries", async () => {
    const key = (id: string) => {
      const view = selectGame(loadView(userId, now)!, { now });
      const screen = buildScreen(view, {});
      return [...screen.regions, ...screen.parts].find((f) => f.id === id)!.key;
    };

    for (const id of ["world-map", "minimap"]) {
      const before = key(id);
      expect(before).toContain(`d${discoveryVersion(userId)}`);
      discover(userId, "heard_tile", `0,${id.length}`, now);
      expect(key(id)).not.toBe(before);
    }
  });
});
