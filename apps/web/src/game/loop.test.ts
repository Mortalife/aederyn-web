import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import "../test/config/index.js";

// The connections open at import time, so point them at a scratch database
// before importing anything that touches them.
process.env.DATABASE_PATH = mkdtempSync(join(tmpdir(), "game-loop-")) + "/";

const { submit, enqueue } = await import("./commands.js");
const { tick } = await import("./loop.js");
const { getUser } = await import("../user/user.js");
const { getInProgressAction } = await import("../user/action.js");
const { getSystemMessages } = await import("../user/system.js");
const { getMessages, restrictUserId } = await import("../social/chat.js");
const { getOnlineStatus } = await import("../social/active.js");
const { questProgressManager } = await import(
  "../user/quest-progress-manager.js"
);
const { getTileSelection } = await import("../world/index.js");
const { resourcesById } = await import("../config/resources.js");
const { MAP_BOUNDS, MAX_INVENTORY_SIZE } = await import(
  "../config.js"
);
type GameUserModel = import("../config.js").GameUserModel;
type Resource = import("../config.js").ResourceModel;
const { writer } = await import("../db/writer.js");
const { bumpQuests } = await import("./versions.js");
const { quests: questConfig } = await import("../config/quests.js");
const { monstersById } = await import("../config/monsters.js");
const { markMonsterKilled } = await import("./systems/monsters.js");
const { COMBAT_LOG_MS } = await import("../world/monsters.js");
const { loadView } = await import("./view/load.js");
const { FIGHT_LINGER_MS, FLASH_MS, selectGame, weakestStyles } = await import("./view/select.js");
const { UserInfo } = await import("../templates/hud.js");
const { ZoneMonsters } = await import("../templates/combat.js");
const { Activity } = await import("../templates/activity.js");
const { LogCombat } = await import("../templates/log.js");
const { zoneVersion } = await import("./versions.js");
const { itemsById } = await import("../config/items.js");
const { damageAfterDefence } = await import("./systems/combat.js");
const { START_POSITION, UNARMED } = await import("../config.js");
const { getZoneUsers } = await import("../user/zone.js");
const { getDiscoveries } = await import("../user/discoveries.js");
const { isOutOfBounds } = await import("../world/index.js");

let now = 1_000_000_000_000;

/** Submit a command and run the tick that applies it. */
const run = async <C extends Parameters<typeof submit>[0]>(command: C) => {
  const result = submit(command);
  tick(now);
  return result;
};

let userId: string;

const freeResourceAt = (x: number, y: number) =>
  getTileSelection(x, y)
    .resources.map((id) => resourcesById.get(id))
    .find((r) => r && r.required_items.length === 0 && r.limitless);

/** Overwrite parts of the stored user, for state no command can reach. */
const setUser = (changes: Partial<GameUserModel>) => {
  const user = getUser(userId)!;
  writer
    .prepare("UPDATE users SET data = ? WHERE id = ?")
    .run(JSON.stringify({ ...user, ...changes }), userId);
};

/**
 * Put the player in a zone with a resource `find` picks out.
 * There's no teleport command, so this writes the position directly.
 */
const placeOn = (find: (x: number, y: number) => Resource | undefined) => {
  for (let x = MAP_BOUNDS.minX; x <= MAP_BOUNDS.maxX; x++) {
    for (let y = MAP_BOUNDS.minY; y <= MAP_BOUNDS.maxY; y++) {
      const resource = find(x, y);
      if (resource && getTileSelection(x, y).accessible) {
        setUser({ p: { x, y }, z: true });
        return resource;
      }
    }
  }
  throw new Error("No matching resource on the map");
};

const STEPS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
} as const;

/** A direction from `p` whose cell does, or doesn't, let the player in. */
const stepFrom = (p: { x: number; y: number }, reachable: boolean) => {
  for (const [direction, d] of Object.entries(STEPS)) {
    const x = p.x + d.x;
    const y = p.y + d.y;
    const ok = !isOutOfBounds(x, y) && getTileSelection(x, y).accessible;
    if (ok === reachable) {
      return { direction: direction as keyof typeof STEPS, to: { x, y } };
    }
  }
  return null;
};

/** A limitless resource that needs no items. */
const placeOnResource = async () => placeOn(freeResourceAt);

beforeAll(async () => {
  userId = (await run({ type: "login", userId: "" }))!;
});

describe("game loop", () => {
  it("creates a user on login and marks them online on connect", async () => {
    expect(userId).toBeTruthy();
    expect(getOnlineStatus(userId)).toBeNull();

    await run({ type: "connect", userId });

    expect(getOnlineStatus(userId)).toMatchObject({ online_at: now });
  });

  it("moves the player", async () => {
    const before = getUser(userId)!.p;

    await run({ type: "move", userId, direction: "down" });
    await run({ type: "move", userId, direction: "up" });

    expect(getUser(userId)!.p).toEqual(before);
  });

  it("won't move onto an inaccessible cell", async () => {
    const before = getUser(userId)!.p;
    expect(getTileSelection(before.x - 1, before.y).accessible).toBe(false);

    await run({ type: "move", userId, direction: "left" });

    expect(getUser(userId)!.p).toEqual(before);
  });

  it("gathers a resource over several ticks", async () => {
    const resource = await placeOnResource();

    await run({ type: "gather_start", userId, resourceId: resource.id });
    expect(getInProgressAction(userId)).toMatchObject({
      resource_id: resource.id,
    });

    // A second gather is rejected with a message, not by the handler.
    await run({ type: "gather_start", userId, resourceId: resource.id });
    expect(getSystemMessages(userId)[0]?.message).toBe(
      "You can't do that yet."
    );

    now += resource.collectionTime * 1000 + 1;
    tick(now);

    expect(getInProgressAction(userId)).toBeNull();
    const inventory = getUser(userId)!.i;
    for (const reward of resource.reward_items) {
      expect(inventory.find((i) => i.item_id === reward.item_id)?.qty).toBe(
        reward.qty
      );
    }
  });

  it("drops an inventory item", async () => {
    const [item] = getUser(userId)!.i;

    await run({ type: "inventory_drop", userId, inventoryId: item!.id });

    expect(getUser(userId)!.i.map((i) => i.id)).not.toContain(
      item!.id
    );
  });

  it("stores chat messages", async () => {
    await run({ type: "chat", userId, message: "hello" });

    expect(getMessages(0)[0]).toMatchObject({
      user_id: userId,
      message: "hello",
      sent_at: now,
    });
  });

  it("clears system messages", async () => {
    await run({ type: "system_messages_clear", userId });

    expect(getSystemMessages(userId)).toEqual([]);
  });

  it("rotates contracts and offers one at its board", async () => {
    await run({ type: "rotate_contracts", force: true });
    const contract = questProgressManager
      .getActiveQuests(now)
      .find((q) => q.kind === "contract");
    expect(contract).toBeDefined();

    await run({ type: "quest_start", userId, questId: "nope" });
    expect(getSystemMessages(userId)[0]?.message).toBe(
      "No such quest"
    );

    const zone = questProgressManager.getZoneQuestsForUser(
      userId,
      contract!.giver.x,
      contract!.giver.y,
      now
    );
    expect(zone.availableQuests.map((q) => q.id)).toContain(contract!.id);
  });

  it("keeps a move and a completing action from the same tick", async () => {
    const user = getUser(userId)!;
    const resource = freeResourceAt(user.p.x, user.p.y)!;

    await run({ type: "gather_start", userId, resourceId: resource.id });
    const before = getUser(userId)!.i.length;

    // Previously the move's save could overwrite the gathered inventory.
    now += resource.collectionTime * 1000 + 1;
    const moved = submit({ type: "move", userId, direction: "exit" });
    tick(now);
    await moved;

    // The move cancels the action first, so nothing is gathered, and the
    // move's save doesn't clobber anything.
    const after = getUser(userId)!;
    expect(after.p).toEqual(user.p);
    expect(after.i.length).toBe(before);
    expect(getInProgressAction(userId)).toBeNull();
  });

  it("rolls back only the command that throws", async () => {
    enqueue({ type: "chat", userId, message: "before" });
    // better-sqlite3 throws when binding an object.
    const bad = submit({ type: "chat", userId, message: {} as never });
    enqueue({ type: "chat", userId, message: "after" });
    tick(now);
    await expect(bad).rejects.toThrow();

    const messages = getMessages(0).map((m) => m.message);
    expect(messages).toContain("before");
    expect(messages).toContain("after");
  });

  it("moves quest objectives along through events in the same tick", async () => {
    const resource = await placeOnResource();
    const { p } = getUser(userId)!;
    // Completion rewards come from config, so borrow a real contract's id.
    const questId = questConfig.find((q) => q.kind === "contract")!.id;
    const quest = {
      id: questId,
      kind: "contract",
      type: "exploration",
      name: "Events",
      description: "",
      giver: { entity_id: null, ...p },
      completion: { entity_id: null, message: "", return_message: null, ...p },
      objectives: [
        {
          id: "gather",
          type: "gather",
          description: "Gather",
          resource_id: resource.id,
          amount: 1,
          progress: null,
        },
        {
          id: "explore",
          type: "explore",
          description: "Look around",
          chance: 1,
          found_message: null,
          progress: null,
          ...p,
        },
      ],
      rewards: [],
      starts_at: now,
      ends_at: now + 3_600_000,
    };
    writer
      .prepare(
        "INSERT OR REPLACE INTO contracts (quest_id, starts_at, ends_at, data) VALUES (?, ?, ?, ?)"
      )
      .run(questId, quest.starts_at, quest.ends_at, JSON.stringify(quest));
    // Written behind the loop's back, so invalidate the parsed quests.
    bumpQuests();

    await run({ type: "quest_start", userId, questId });
    expect(questProgressManager.getQuestStatus(userId, questId)?.status).toBe(
      "in_progress"
    );

    await run({ type: "gather_start", userId, resourceId: resource.id });
    now += resource.collectionTime * 1000 + 1;
    tick(now);

    const objectives = () =>
      Object.fromEntries(
        questProgressManager
          .getQuestProgress(userId, questId)!
          .objectives.map((o) => [o.objective_id, !!o.completed])
      );
    expect(objectives()).toEqual({ gather: true, explore: false });

    await run({ type: "move", userId, direction: "exit" });
    await run({ type: "move", userId, direction: "enter" });

    expect(objectives()).toEqual({ gather: true, explore: true });
    expect(questProgressManager.getQuestStatus(userId, questId)?.status).toBe(
      "completable"
    );
    expect(getSystemMessages(userId).map((m) => m.message)).toContain(
      "Discovered: Look around"
    );

    await run({ type: "quest_complete", userId, questId });
    expect(questProgressManager.getQuestStatus(userId, questId)?.status).toBe(
      "completed"
    );
  });
});

describe("moving from a zone", () => {
  /** A zone with a free resource and a neighbour the player can step onto. */
  const placeWithExit = () =>
    placeOn((x, y) => (stepFrom({ x, y }, true) ? freeResourceAt(x, y) : undefined));

  it("leaves the zone and steps onto the next cell in one command", async () => {
    placeWithExit();
    await run({ type: "move", userId, direction: "enter" });
    const from = getUser(userId)!.p;
    expect(getZoneUsers(from.x, from.y).map((u) => u.id)).toContain(userId);
    const { direction, to } = stepFrom(from, true)!;

    await run({ type: "move", userId, direction });

    const user = getUser(userId)!;
    expect(user.z).toBe(false);
    expect(user.p).toEqual(to);
    expect(getZoneUsers(from.x, from.y).map((u) => u.id)).not.toContain(userId);
    expect(getDiscoveries(userId).tiles).toContain(`${to.x},${to.y}`);
  });

  it("cancels an action in progress, as exit does", async () => {
    const resource = placeWithExit();
    const from = getUser(userId)!.p;
    await run({ type: "gather_start", userId, resourceId: resource.id });
    expect(getInProgressAction(userId)).not.toBeNull();

    await run({ type: "move", userId, direction: stepFrom(from, true)!.direction });

    expect(getInProgressAction(userId)).toBeNull();
    expect(getUser(userId)!.z).toBe(false);
  });

  it("refuses a step onto a cell it can't reach, staying in the zone", async () => {
    const resource = placeOn((x, y) =>
      stepFrom({ x, y }, true) && stepFrom({ x, y }, false)
        ? freeResourceAt(x, y)
        : undefined
    );
    const from = getUser(userId)!.p;
    await run({ type: "gather_start", userId, resourceId: resource.id });

    await run({ type: "move", userId, direction: stepFrom(from, false)!.direction });

    expect(getUser(userId)!).toMatchObject({ p: from, z: true });
    expect(getInProgressAction(userId)).not.toBeNull();
    await run({ type: "gather_cancel", userId, resourceId: resource.id });
  });
});

describe("equipment", () => {
  const axe = (id: string, currentDurability = 10) => ({
    id,
    qty: 1,
    item_id: "item_stone_axe_01",
    metadata: { currentDurability },
  });

  it("moves an equipped item out of the inventory, swapping what was there", async () => {
    setUser({ i: [axe("axe-1"), axe("axe-2")], e: {} });

    await run({ type: "equip", userId, inventoryId: "axe-1" });
    expect(getUser(userId)!.e.mainHand?.id).toBe("axe-1");
    expect(getUser(userId)!.i.map((i) => i.id)).toEqual(["axe-2"]);

    await run({ type: "equip", userId, inventoryId: "axe-2" });
    expect(getUser(userId)!.e.mainHand?.id).toBe("axe-2");
    expect(getUser(userId)!.i.map((i) => i.id)).toEqual(["axe-1"]);
  });

  it("won't equip an item without a slot", async () => {
    setUser({ i: [{ id: "grass", qty: 1, item_id: "item_grass_01" }], e: {} });

    await run({ type: "equip", userId, inventoryId: "grass" });

    expect(getUser(userId)!.e).toEqual({});
    expect(getUser(userId)!.i.map((i) => i.id)).toEqual(["grass"]);
    expect(getSystemMessages(userId).map((m) => m.message)).toContain(
      "You can't equip Wild Grass."
    );
  });

  it("unequips into the inventory only when there's room", async () => {
    const full = Array.from({ length: MAX_INVENTORY_SIZE }, (_, n) => ({
      id: `grass-${n}`,
      qty: 1,
      item_id: "item_grass_01",
    }));
    setUser({ i: full, e: { mainHand: axe("axe-1") } });

    await run({ type: "unequip", userId, slot: "mainHand" });
    expect(getUser(userId)!.e.mainHand?.id).toBe("axe-1");
    expect(getSystemMessages(userId).map((m) => m.message)).toContainEqual(
      expect.stringMatching(/^Your inventory is full/)
    );

    setUser({ i: full.slice(1) });
    await run({ type: "unequip", userId, slot: "mainHand" });
    expect(getUser(userId)!.e).toEqual({});
    expect(getUser(userId)!.i.at(-1)?.id).toBe("axe-1");
  });

  /** A resource that needs only the axe, and wears it down. */
  const placeOnAxeResource = () => {
    const resource = placeOn((x, y) =>
      getTileSelection(x, y)
        .resources.map((id) => resourcesById.get(id))
        .find(
          (r) =>
            r?.required_items.length === 1 &&
            r.required_items[0]!.item_id === "item_stone_axe_01" &&
            r.required_items[0]!.itemDurabilityReduction
        )
    );
    return {
      resource,
      wear: resource.required_items[0]!.itemDurabilityReduction!,
    };
  };

  const gather = async (resource: Resource) => {
    await run({ type: "gather_start", userId, resourceId: resource.id });
    now += resource.collectionTime * 1000 + 1;
    tick(now);
  };

  it("won't gather with a tool too worn for the job", async () => {
    const { resource, wear } = placeOnAxeResource();
    setUser({ i: [], e: { mainHand: axe("axe-1", wear - 1) } });

    await gather(resource);

    const user = getUser(userId)!;
    expect(user.e.mainHand?.metadata?.currentDurability).toBe(wear - 1);
    expect(user.i).toEqual([]);
    expect(getSystemMessages(userId).map((m) => m.message)).toContain(
      "You do not have enough durability."
    );
  });

  it("gathers with an equipped tool and wears it down in its slot", async () => {
    const { resource, wear } = placeOnAxeResource();
    setUser({ i: [], e: { mainHand: axe("axe-1") } });

    await gather(resource);

    const user = getUser(userId)!;
    expect(user.e.mainHand?.metadata?.currentDurability).toBe(10 - wear);
    for (const reward of resource.reward_items) {
      expect(user.i.find((i) => i.item_id === reward.item_id)?.qty).toBe(
        reward.qty
      );
    }
  });

  it("wears the equipped tool before a carried one", async () => {
    const { resource, wear } = placeOnAxeResource();
    setUser({ i: [axe("spare", wear)], e: { mainHand: axe("held") } });

    await gather(resource);

    const user = getUser(userId)!;
    expect(user.e.mainHand?.metadata?.currentDurability).toBe(10 - wear);
    expect(user.i.find((i) => i.id === "spare")?.metadata).toEqual({
      currentDurability: wear,
    });
  });

  it("wears the most worn carried tool first", async () => {
    const { resource, wear } = placeOnAxeResource();
    setUser({ i: [axe("fresh"), axe("worn", wear + 1)], e: {} });

    await gather(resource);

    const durability = (id: string) =>
      getUser(userId)!.i.find((i) => i.id === id)?.metadata?.currentDurability;
    expect(durability("fresh")).toBe(10);
    expect(durability("worn")).toBe(1);
  });
});

describe("monsters", () => {
  const chicken = monstersById.get("monster_chicken")!;
  let zone: { x: number; y: number };

  const zoneMonsters = () => selectGame(loadView(userId, now)!, { now }).monsters;

  beforeAll(() => {
    zone = (() => {
      for (let x = MAP_BOUNDS.minX; x <= MAP_BOUNDS.maxX; x++) {
        for (let y = MAP_BOUNDS.minY; y <= MAP_BOUNDS.maxY; y++) {
          const tile = getTileSelection(x, y);
          if (tile.accessible && tile.monsters?.includes(chicken.id)) {
            return { x, y };
          }
        }
      }
      throw new Error("No chicken on the map");
    })();
    setUser({ p: zone, z: true });
  });

  it("shows a zone's monsters alive at full health", () => {
    const alive = {
      monster: chicken,
      hp: chicken.health,
      respawnAt: null,
      engaged: false,
      combat: null,
      hits: [],
      weakTo: ["melee", "magic"],
    };
    expect(zoneMonsters()).toEqual([
      { spawn: 0, ...alive },
      { spawn: 1, ...alive },
    ]);

    const rendered = ZoneMonsters(zoneMonsters()).toString();
    expect(rendered).toContain(chicken.name);
    expect(rendered).toContain(`${chicken.health}/${chicken.health}`);
    expect(rendered).not.toContain("Respawns in");
  });

  it("ignores state left by a different monster at the same spawn", () => {
    writer
      .prepare(
        "INSERT INTO monster_state (x, y, spawn, monster_id, hp, respawn_at) VALUES (?, ?, 0, 'monster_gone', 1, NULL)"
      )
      .run(zone.x, zone.y);
    try {
      expect(zoneMonsters()[0]).toMatchObject({ spawn: 0, hp: chicken.health, respawnAt: null });
    } finally {
      writer.prepare("DELETE FROM monster_state WHERE monster_id = 'monster_gone'").run();
    }
  });

  it("respawns a killed monster once its respawn time has passed", () => {
    const before = zoneVersion(zone.x, zone.y);
    writer.transaction(() =>
      markMonsterKilled(zone.x, zone.y, 0, chicken, now)
    )();
    const respawnAt = now + chicken.respawnTime * 1000;

    expect(zoneVersion(zone.x, zone.y)).toBeGreaterThan(before);
    expect(zoneMonsters()[0]).toMatchObject({ hp: 0, respawnAt });
    expect(zoneMonsters()[1]).toMatchObject({ hp: chicken.health, respawnAt: null });
    expect(ZoneMonsters(zoneMonsters()).toString()).toContain("Respawns in");

    // Still dead just before, and nothing changes on screen.
    now = respawnAt - 1;
    const dead = zoneVersion(zone.x, zone.y);
    tick(now);
    expect(zoneMonsters()[0]).toMatchObject({ respawnAt });
    expect(zoneVersion(zone.x, zone.y)).toBe(dead);

    now = respawnAt;
    tick(now);
    expect(zoneMonsters()[0]).toMatchObject({
      hp: chicken.health,
      respawnAt: null,
    });
    expect(zoneVersion(zone.x, zone.y)).toBeGreaterThan(dead);
  });

  it("shows a monster someone is fighting as engaged", () => {
    writer
      .prepare(
        "INSERT INTO combat (user_id, x, y, spawn, monster_id, started_at, next_player_at, next_monster_at) VALUES (?, ?, ?, 0, ?, ?, ?, ?)"
      )
      .run(userId, zone.x, zone.y, chicken.id, now, now, now);

    expect(zoneMonsters()[0]).toMatchObject({ engaged: true });
    expect(ZoneMonsters(zoneMonsters()).toString()).toContain("In combat");

    writer.prepare("DELETE FROM combat").run();
  });

  it("finds the styles a monster defends least against", () => {
    expect(weakestStyles({ melee: 10, ranged: 0, magic: 5 })).toEqual([
      "ranged",
    ]);
    expect(weakestStyles({ melee: 0, ranged: 20, magic: 0 })).toEqual([
      "melee",
      "magic",
    ]);
    expect(weakestStyles({ melee: 5, ranged: 5, magic: 5 })).toEqual([]);
  });
});

describe("health regeneration", () => {
  it("heals at camp faster, switches rates on travel, and stops at maximum health", async () => {
    const id = (await run({ type: "login", userId: "" }))!;
    const user = getUser(id)!;
    user.h = 95;
    writer.prepare("UPDATE users SET data = ? WHERE id = ?").run(JSON.stringify(user), id);
    const hud = UserInfo(selectGame(loadView(id, now)!, { now }).user).toString();
    expect(hud).toContain("95/100");
    expect(hud).toContain('aria-valuenow="95"');

    tick(now);
    now += 1_999;
    tick(now);
    expect(getUser(id)!.h).toBe(95);
    now += 1;
    tick(now);
    expect(getUser(id)!.h).toBe(96);

    const away = getUser(id)!;
    away.p = { x: START_POSITION.x + 1, y: START_POSITION.y };
    writer.prepare("UPDATE users SET data = ? WHERE id = ?").run(JSON.stringify(away), id);
    tick(now);
    now += 4_999;
    tick(now);
    expect(getUser(id)!.h).toBe(96);
    now += 1;
    tick(now);
    expect(getUser(id)!.h).toBe(97);

    now += 20_000;
    tick(now);
    expect(getUser(id)!.h).toBe(100);
  });

  it("does not heal during combat or count combat time toward later healing", async () => {
    const id = (await run({ type: "login", userId: "" }))!;
    const user = getUser(id)!;
    user.h = 50;
    writer.prepare("UPDATE users SET data = ? WHERE id = ?").run(JSON.stringify(user), id);
    tick(now);

    writer.prepare("INSERT INTO combat (user_id, x, y, monster_id, started_at, next_player_at, next_monster_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, START_POSITION.x, START_POSITION.y, "test_regen_monster", now, now + 100_000, now + 100_000);
    now += 10_000;
    tick(now);
    expect(getUser(id)!.h).toBe(50);

    writer.prepare("DELETE FROM combat WHERE user_id = ?").run(id);
    tick(now);
    now += 1_999;
    tick(now);
    expect(getUser(id)!.h).toBe(50);
    now += 1;
    tick(now);
    expect(getUser(id)!.h).toBe(51);
  });
});

describe("combat", () => {
  const chicken = monstersById.get("monster_chicken")!;
  const original = structuredClone(chicken);
  const club = itemsById.get("item_wooden_club")!;
  const clubWeapon = { name: club.name, speed: 2000, durability: 60, maxDurability: 60 };
  let fighter: string;
  let zone: { x: number; y: number };

  const readFight = (id = fighter) => writer.prepare<[string], {
    user_id: string; spawn: number; next_player_at: number; next_monster_at: number;
  }>("SELECT * FROM combat WHERE user_id = ?").get(id);
  const readHp = () => writer.prepare<[number, number], { hp: number; respawn_at: number | null }>(
    "SELECT hp, respawn_at FROM monster_state WHERE x = ? AND y = ? AND spawn = 0"
  ).get(zone.x, zone.y);
  const equipWeapon = (id: string, durability = 60, itemId = club.id) => {
    const user = getUser(id)!;
    user.p = zone;
    user.z = true;
    user.h = 100;
    user.e.mainHand = { id: crypto.randomUUID(), item_id: itemId, qty: 1, metadata: { currentDurability: durability } };
    writer.prepare("UPDATE users SET data = ? WHERE id = ?").run(JSON.stringify(user), id);
  };
  const attack = (id = fighter, spawn = 0) => run({ type: "attack", userId: id, spawn });

  beforeAll(() => {
    for (let x = MAP_BOUNDS.minX; x <= MAP_BOUNDS.maxX; x++) {
      for (let y = MAP_BOUNDS.minY; y <= MAP_BOUNDS.maxY; y++) {
        if (getTileSelection(x, y).accessible && getTileSelection(x, y).monsters?.includes(chicken.id)) {
          zone = { x, y };
          return;
        }
      }
    }
    throw new Error("No chicken on the map");
  });

  beforeEach(async () => {
    Object.assign(chicken, structuredClone(original));
    writer.prepare("DELETE FROM combat").run();
    writer.prepare("DELETE FROM combat_hits").run();
    writer.prepare("DELETE FROM monster_state").run();
    fighter = (await run({ type: "login", userId: "" }))!;
    equipWeapon(fighter);
  });

  afterEach(() => {
    Object.assign(chicken, structuredClone(original));
    writer.prepare("DELETE FROM combat").run();
    writer.prepare("DELETE FROM combat_hits").run();
    writer.prepare("DELETE FROM monster_state").run();
    writer.prepare("DELETE FROM inprogress").run();
  });

  it("resolves a full fight in swing order, wears the weapon and awards the drop", async () => {
    await attack();
    expect(readHp()?.hp).toBe(40);
    expect(getUser(fighter)!.e.mainHand?.metadata?.currentDurability).toBe(59);
    expect(readFight()?.next_player_at).toBe(now + 2000);
    expect(readFight()?.next_monster_at).toBe(now + 3000);

    now += 2000;
    tick(now);
    expect(readHp()?.hp).toBe(30);
    expect(getUser(fighter)!.h).toBe(100);

    now += 1000;
    tick(now);
    expect(getUser(fighter)!.h).toBe(95);

    now += 1000;
    tick(now);
    expect(readHp()?.hp).toBe(20);
    expect(getUser(fighter)!.h).toBe(95);

    now += 2000;
    tick(now);
    expect(readHp()?.hp).toBe(10);
    expect(getUser(fighter)!.h).toBe(90);

    now += 2000;
    tick(now);
    expect(readFight()).toBeUndefined();
    expect(readHp()).toMatchObject({ hp: 0, respawn_at: now + chicken.respawnTime * 1000 });
    expect(getUser(fighter)!.i.find((i) => i.item_id === "item_feather")?.qty).toBe(3);
    expect(getUser(fighter)!.e.mainHand?.metadata?.currentDurability).toBe(55);
    expect(getSystemMessages(fighter).some((m) => m.message.includes("Acquired: 3 x Feather"))).toBe(true);

    const view = selectGame(loadView(fighter, now)!, { now });
    const html = ZoneMonsters(view.monsters, {
      userId: fighter, gathering: false, weapon: clubWeapon,
      contextFlashes: view.contextFlashes,
    }).toString();
    expect(html).toContain("+3 Feather");
  });

  it("counts kills for the active quest objective", async () => {
    const questId = `quest_test_kill_${fighter}`;
    const quest = {
      id: questId,
      type: "combat",
      name: "Chicken hunt",
      description: "",
      kind: "contract",
      giver: { entity_id: null, ...zone },
      completion: { entity_id: null, message: "", return_message: null, ...zone },
      objectives: [{
        id: "kill_chickens", type: "kill", description: "Defeat two chickens",
        monster_id: chicken.id, count: 2, progress: null,
      }],
      rewards: [],
      starts_at: now,
      ends_at: now + 3_600_000,
    };
    writer.prepare(
      "INSERT INTO contracts (quest_id, starts_at, ends_at, data) VALUES (?, ?, ?, ?)"
    ).run(questId, quest.starts_at, quest.ends_at, JSON.stringify(quest));
    bumpQuests();

    try {
      await run({ type: "quest_start", userId: fighter, questId });
      const progress = () => questProgressManager.getQuestProgress(fighter, questId)!.objectives[0];
      expect(progress().required).toBe(2);

      chicken.health = 10;
      await attack();
      expect(progress()).toMatchObject({ current: 1, completed: 0 });

      await attack(fighter, 1);
      expect(progress()).toMatchObject({ current: 2, completed: 1 });
      expect(questProgressManager.getQuestStatus(fighter, questId)?.status).toBe("completable");
    } finally {
      writer.prepare("DELETE FROM contracts WHERE quest_id = ?").run(questId);
      bumpQuests();
    }
  });

  it("reports drops that do not fit in the inventory", async () => {
    chicken.health = 10;
    const user = getUser(fighter)!;
    user.i = Array.from({ length: MAX_INVENTORY_SIZE }, (_, i) => ({
      id: `full_slot_${i}`, item_id: "item_stick_01", qty: 1,
    }));
    writer.prepare("UPDATE users SET data = ? WHERE id = ?").run(JSON.stringify(user), fighter);
    await attack();
    expect(readFight()).toBeUndefined();
    expect(getSystemMessages(fighter).some((m) => m.message.includes("Discarded: 3 x Feather"))).toBe(true);
  });

  it("returns a dead player to camp at ten health and restores the monster", async () => {
    chicken.attack.damage = 100;
    chicken.attack.speed = 1000;
    await attack();
    now += 1000;
    tick(now);
    expect(readFight()).toBeUndefined();
    expect(readHp()).toBeUndefined();
    expect(getUser(fighter)).toMatchObject({ p: START_POSITION, z: false, h: 10 });
  });

  it("fleeing restores full monster health", async () => {
    await attack();
    expect(readHp()?.hp).toBe(40);
    await run({ type: "flee", userId: fighter });
    expect(readFight()).toBeUndefined();
    expect(readHp()).toBeUndefined();
  });

  it("ends a fight that outlasts the respawn time and spawns a fresh monster", async () => {
    chicken.health = 1000;
    chicken.attack.damage = 0;
    const deadline = now + chicken.respawnTime * 1000;
    await attack();

    now = deadline;
    tick(now);
    expect(readFight()).toBeDefined();
    expect(readHp()?.hp).toBe(840);

    now = deadline + 2000;
    tick(now);
    expect(readFight()).toBeUndefined();
    expect(readHp()).toBeUndefined();
    expect(getSystemMessages(fighter).some((m) => m.message.includes("slipped away"))).toBe(true);

    await attack();
    expect(readFight()).toBeDefined();
  });

  it("keeps fighting barehanded when the weapon breaks, and flashes the break", async () => {
    equipWeapon(fighter, 1);
    await attack();
    expect(readHp()?.hp).toBe(40);
    expect(getUser(fighter)!.e.mainHand).toBeUndefined();
    expect(readFight()).toMatchObject({ next_player_at: now + UNARMED.speed });
    expect(getSystemMessages(fighter).map((m) => m.message).slice(0, 2)).toEqual([
      `Your ${club.name} broke. You're fighting barehanded.`,
      `You attack ${chicken.name}.`,
    ]);

    const view = selectGame(loadView(fighter, now)!, { now });
    const card = ZoneMonsters(view.monsters, {
      userId: fighter, gathering: false, weapon: null,
      contextFlashes: view.contextFlashes,
    }).toString();
    const first = card.slice(card.indexOf('id="monsters-0"'), card.indexOf('id="monsters-1"'));
    expect(first).toContain(`Your ${club.name} broke.`);
    expect(first).not.toContain(`You attack ${chicken.name}.`);
    expect(first.indexOf("broke")).toBeLessThan(first.indexOf("Drops"));
    expect(first).toContain("Flee");
    expect(first).toContain(`Barehanded, ${UNARMED.damage} damage a hit`);

    now += UNARMED.speed;
    tick(now);
    expect(readHp()?.hp).toBe(40 - UNARMED.damage);
  });

  it("fights barehanded without a weapon and lets a monster be attacked on its respawn tick", async () => {
    equipWeapon(fighter, 10, "item_stone_axe_01");
    await attack();
    expect(readFight()).toBeDefined();
    expect(readHp()?.hp).toBe(chicken.health - UNARMED.damage);
    const axe = getUser(fighter)!.e.mainHand!;
    expect(axe.metadata?.currentDurability).toBe(10);
    await run({ type: "flee", userId: fighter });

    const view = selectGame(loadView(fighter, now)!, { now });
    const card = ZoneMonsters(view.monsters, {
      userId: fighter, gathering: false, weapon: null,
      contextFlashes: view.contextFlashes,
    }).toString();
    expect(card).toContain("/game/monsters/0/attack");
    expect(card).toContain("Barehanded");

    equipWeapon(fighter);
    writer.prepare("INSERT INTO monster_state (x, y, spawn, monster_id, hp, respawn_at) VALUES (?, ?, 0, ?, 0, ?)")
      .run(zone.x, zone.y, chicken.id, now + 1000);
    await attack();
    expect(readFight()).toBeUndefined();
    now += 1000;
    await attack();
    expect(readFight()).toBeDefined();
    expect(readHp()?.hp).toBe(40);
  });

  it("allows one fighter per spawn and keeps gathering and fighting exclusive", async () => {
    await attack();
    const second = (await run({ type: "login", userId: "" }))!;
    equipWeapon(second);
    await attack(second);
    expect(readFight(second)).toBeUndefined();
    expect(getSystemMessages(second)[0]?.message).toContain("already fighting someone");

    await attack(second, 1);
    expect(readFight(second)).toMatchObject({ spawn: 1 });
    const [first, other] = selectGame(loadView(second, now)!, { now }).monsters;
    expect(first).toMatchObject({ engaged: true, combat: { user_id: fighter } });
    expect(other).toMatchObject({ engaged: true, combat: { user_id: second } });
    expect(other!.hits.every((hit) => hit.user_id === second)).toBe(true);
    await run({ type: "flee", userId: second });

    await attack(second, 2);
    expect(readFight(second)).toBeUndefined();

    const resource = getTileSelection(zone.x, zone.y).resources[0];
    if (resource) {
      await run({ type: "gather_start", userId: fighter, resourceId: resource });
      expect(getInProgressAction(fighter)).toBeNull();
    }

    await run({ type: "flee", userId: fighter });
    writer.prepare("INSERT INTO inprogress (user_id, x, y, resource_id, inprogress_at, completed_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(fighter, zone.x, zone.y, "test_resource", now, now + 10000);
    await attack();
    expect(readFight()).toBeUndefined();
    expect(getSystemMessages(fighter).some((m) => m.message.includes("Finish gathering"))).toBe(true);
  });

  it("keeps fighting through weapon changes, with whatever is in hand at each swing", async () => {
    await attack();
    expect(readHp()?.hp).toBe(40);
    const clubId = getUser(fighter)!.e.mainHand!.id;
    await run({ type: "unequip", userId: fighter, slot: "mainHand" });
    expect(readFight()).toBeDefined();

    now += 2000;
    tick(now);
    expect(readHp()?.hp).toBe(40 - UNARMED.damage);

    await run({ type: "equip", userId: fighter, inventoryId: clubId });
    expect(readFight()).toBeDefined();
    now += UNARMED.speed;
    tick(now);
    expect(readHp()?.hp).toBe(40 - UNARMED.damage - 10);
  });

  it("ends the fight when the player disconnects", async () => {
    await attack();
    await run({ type: "disconnect", userId: fighter });
    expect(readFight()).toBeUndefined();
    expect(readHp()).toBeUndefined();
  });

  it("ends the fight when the player exits the zone", async () => {
    await attack();
    await run({ type: "move", userId: fighter, direction: "exit" });
    expect(getUser(fighter)!.z).toBe(false);
    expect(readFight()).toBeUndefined();
    expect(readHp()).toBeUndefined();
  });

  it("ends the fight on a step out of the zone exactly as exit does", async () => {
    const step = stepFrom(zone, true)!;
    const leave = async (direction: "exit" | typeof step.direction) => {
      const id = (await run({ type: "login", userId: "" }))!;
      equipWeapon(id);
      await attack(id);
      expect(readFight(id)).toBeDefined();
      await run({ type: "move", userId: id, direction });
      const user = getUser(id)!;
      return {
        user,
        outcome: {
          z: user.z,
          fight: readFight(id),
          hp: readHp(),
          // Landing on a new cell is announced; that's the move, not the exit.
          messages: getSystemMessages(id)
            .filter(({ action_id }) => !action_id?.startsWith("tile:"))
            .map(({ message, type }) => ({ message, type })),
          monsters: [...getDiscoveries(id).monsters],
        },
      };
    };

    const exited = await leave("exit");
    const stepped = await leave(step.direction);

    expect(exited.outcome.fight).toBeUndefined();
    expect(exited.outcome.messages).toContainEqual({ message: "You flee the fight.", type: "info" });
    expect(stepped.outcome).toEqual(exited.outcome);
    expect(exited.user.p).toEqual(zone);
    expect(stepped.user.p).toEqual(step.to);
  });

  it("keeps fighting when a step from the zone is refused, or on enter", async () => {
    const step = stepFrom(zone, false);
    await attack();
    if (step) {
      await run({ type: "move", userId: fighter, direction: step.direction });
    }
    await run({ type: "move", userId: fighter, direction: "enter" });
    expect(getUser(fighter)!).toMatchObject({ p: zone, z: true });
    expect(readFight()).toBeDefined();
  });

  it("uses every weapon style against each monster defence profile", async () => {
    const profiles = [
      { melee: 100, ranged: 0, magic: 0 },
      { melee: 0, ranged: 100, magic: 0 },
      { melee: 0, ranged: 0, magic: 100 },
    ];
    const styles = ["melee", "ranged", "magic"] as const;
    try {
      for (const style of styles) {
        const itemId = `test_${style}_weapon`;
        itemsById.set(itemId, { ...club, id: itemId, weapon: { style, damage: 20, speed: 2000 } });
      }
      for (const defence of profiles) {
        chicken.defence = defence;
        for (const style of styles) {
          equipWeapon(fighter, 60, `test_${style}_weapon`);
          await attack();
          expect(readHp()?.hp).toBe(chicken.health - (defence[style] === 100 ? 10 : 20));
          await run({ type: "flee", userId: fighter });
        }
      }
    } finally {
      for (const style of styles) itemsById.delete(`test_${style}_weapon`);
    }
    expect(damageAfterDefence(3, 100)).toBe(1);
    expect(damageAfterDefence(1, 1000)).toBe(1);
  });

  it("reduces monster hits using equipped armour for its attack style", async () => {
    chicken.attack.damage = 20;
    chicken.attack.speed = 1000;
    const armourId = "test_combat_armour";
    itemsById.set(armourId, {
      ...club, id: armourId, type: "armor", equipSlot: "chest", weapon: undefined,
      defence: { melee: 100, ranged: 0, magic: 0 },
    });
    try {
      const user = getUser(fighter)!;
      user.e.chest = { id: crypto.randomUUID(), item_id: armourId, qty: 1 };
      writer.prepare("UPDATE users SET data = ? WHERE id = ?").run(JSON.stringify(user), fighter);
      await attack();
      now += 1000;
      tick(now);
      expect(getUser(fighter)!.h).toBe(90);
      expect(readFight()).toBeDefined();
    } finally {
      itemsById.delete(armourId);
    }
  });

  it("shows the fighter the fight and its hits, and everyone the monster", async () => {
    await attack();
    now += 3000;
    tick(now);
    const view = selectGame(loadView(fighter, now)!, { now });
    const [monsterHit, secondHit, firstHit] = view.monsters[0]!.hits;
    expect(monsterHit).toMatchObject({ by_monster: 1, damage: 5, at: now, fatal: 0 });
    expect(secondHit).toMatchObject({ by_monster: 0, damage: 10, at: now - 1000 });
    expect(firstHit).toMatchObject({ by_monster: 0, damage: 10, at: now - 3000 });

    expect(view.activity).toMatchObject({ kind: "fight", active: true, fight: { spawn: 0 } });
    const activity = Activity(view.activity, {
      userId: fighter, health: view.user.h, weaponSpeed: 2000,
    }).toString();
    expect(activity).toContain("Flee");
    expect(activity).toContain(`hit-activity-player-${monsterHit!.id}`);
    expect(activity).toContain(`hit-activity-monster-${secondHit!.id}`);
    expect(activity).toContain(`hurt-${monsterHit!.id}`);
    expect(activity).toContain(`swing-activity-player-${now + 1000}`);
    expect(activity).toContain(`swing-activity-monster-${now + 3000}`);

    const log = LogCombat(view.combatLog, fighter).toString();
    expect(log).toContain(`${chicken.name} hit you for 5`);
    expect(log).toContain(`You hit ${chicken.name} for 10`);
    expect(log.indexOf(`log-h${firstHit!.id}`)).toBeLessThan(log.indexOf(`log-h${monsterHit!.id}`));

    const card = (userId: string) => ZoneMonsters(view.monsters, {
      userId, gathering: false, weapon: clubWeapon,
      contextFlashes: view.contextFlashes,
    }).toString();
    const fighterHtml = card(fighter);
    const spectatorHtml = card("someone_else");
    expect(fighterHtml).toContain("In combat with you");
    expect(fighterHtml).toContain("Flee");
    expect(fighterHtml).not.toContain("swing-");
    expect(fighterHtml).not.toContain("hurt-");
    expect(fighterHtml).not.toContain("hit you for");
    expect(spectatorHtml).toContain(`In combat with ${restrictUserId(fighter)}`);
    expect(spectatorHtml).not.toContain("/game/monsters/0/attack");
    expect(spectatorHtml).toContain("/game/monsters/1/attack");
    expect(spectatorHtml).not.toContain("Flee");
    expect(spectatorHtml).toContain(`hit-monster-0-${secondHit!.id}`);

    const other = selectGame(loadView(fighter, now)!, { now });
    expect(other.combatLog.every(({ hit }) => hit.user_id === fighter)).toBe(true);
  });

  it("keeps the final blow in the activity bar for a moment after a kill, then clears the log", async () => {
    chicken.health = 10;
    await attack();
    const render = (view: ReturnType<typeof selectGame>) =>
      Activity(view.activity, { userId: fighter, health: view.user.h, weaponSpeed: 2000 }).toString();

    let view = selectGame(loadView(fighter, now)!, { now });
    const [finalBlow] = view.monsters[0]!.hits;
    expect(finalBlow).toMatchObject({ by_monster: 0, damage: 10, fatal: 1 });
    expect(view.activity).toMatchObject({ kind: "fight", active: false });
    let html = render(view);
    expect(html).toContain(`0/${chicken.health}`);
    expect(html).toContain(`hit-activity-monster-${finalBlow!.id}`);
    expect(html).toContain("Victory");
    expect(html).not.toContain("Flee");
    expect(LogCombat(view.combatLog, fighter).toString()).toContain(
      `You finished ${chicken.name} off with 10`
    );
    const killedAt = now;
    expect(view.wakeAt).toBe(killedAt + FIGHT_LINGER_MS);

    now = killedAt + FIGHT_LINGER_MS;
    view = selectGame(loadView(fighter, now)!, { now });
    expect(view.activity).toBeNull();
    expect(render(view)).toContain("Nothing in progress");
    expect(view.combatLog).toHaveLength(1);
    now = killedAt + FLASH_MS;
    view = selectGame(loadView(fighter, now)!, { now });
    expect(view.wakeAt).toBe(killedAt + COMBAT_LOG_MS);

    now = killedAt + COMBAT_LOG_MS;
    tick(now);
    view = selectGame(loadView(fighter, now)!, { now });
    expect(view.monsters[0]!.hits).toEqual([]);
    expect(view.combatLog).toEqual([]);
    expect(writer.prepare("SELECT count(*) AS n FROM combat_hits").get()).toEqual({ n: 0 });
  });

  it("keeps equal damage-per-second weapons close against heavy defence", async () => {
    chicken.health = 300;
    chicken.defence = { melee: 200, ranged: 200, magic: 200 };
    chicken.respawnTime = 600;
    const speeds = [
      { id: "test_fast_weapon", damage: 20, speed: 1000 },
      { id: "test_slow_weapon", damage: 40, speed: 2000 },
    ];
    const elapsed: number[] = [];
    try {
      for (const candidate of speeds) {
        itemsById.set(candidate.id, {
          ...club, id: candidate.id,
          weapon: { style: "melee", damage: candidate.damage, speed: candidate.speed },
        });
        equipWeapon(fighter, 100, candidate.id);
        const started = now;
        await attack();
        for (let tickCount = 0; readFight() && tickCount < 80; tickCount++) {
          now += 1000;
          tick(now);
        }
        expect(readFight()).toBeUndefined();
        expect(readHp()?.hp).toBe(0);
        elapsed.push(now - started);
        writer.prepare("DELETE FROM monster_state").run();
      }
    } finally {
      for (const candidate of speeds) itemsById.delete(candidate.id);
    }
    expect(Math.abs(elapsed[0]! - elapsed[1]!)).toBeLessThanOrEqual(4000);
  });
});
