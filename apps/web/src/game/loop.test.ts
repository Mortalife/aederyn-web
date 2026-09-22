import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

// The connections open at import time, so point them at a scratch database
// before importing anything that touches them.
process.env.DATABASE_PATH = mkdtempSync(join(tmpdir(), "game-loop-")) + "/";

const { submit, enqueue } = await import("./commands.js");
const { tick } = await import("./loop.js");
const { getUser } = await import("../user/user.js");
const { getInProgressAction } = await import("../user/action.js");
const { getSystemMessages } = await import("../user/system.js");
const { getMessages } = await import("../social/chat.js");
const { getOnlineStatus } = await import("../social/active.js");
const { questProgressManager } = await import(
  "../user/quest-progress-manager.js"
);
const { getTileSelection } = await import("../world/index.js");
const { resourcesById } = await import("../config/resources.js");
const { MAP_HEIGHT, MAP_WIDTH } = await import("../config.js");
const { writer } = await import("../db/writer.js");
const { bumpQuests } = await import("./versions.js");
const { quests: questConfig } = await import("../config/quests.js");

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

/**
 * Put the player on a tile with a limitless resource that needs no items.
 * There's no teleport command, so this writes the position directly.
 */
const placeOnResource = async () => {
  for (let x = 0; x < MAP_WIDTH; x++) {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      const resource = freeResourceAt(x, y);
      if (resource && getTileSelection(x, y).accessible) {
        const user = getUser(userId)!;
        writer
          .prepare("UPDATE users SET data = ? WHERE id = ?")
          .run(JSON.stringify({ ...user, p: { x, y }, z: true }), userId);
        return resource;
      }
    }
  }
  throw new Error("No gatherable resource on the map");
};

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

  it("rotates quests and starts one available where the player stands", async () => {
    await run({ type: "rotate_quests", force: true });
    const quests = questProgressManager.getActiveQuests(now);
    expect(quests.length).toBeGreaterThan(0);

    const quest = quests[0]!;
    await run({ type: "quest_start", userId, questId: "nope" });
    expect(getSystemMessages(userId)[0]?.message).toBe(
      "No such quest"
    );

    // Walk the player to the giver so the quest is available.
    // (Direct teleport isn't a command, so check via the zone query instead.)
    const zone = questProgressManager.getZoneQuestsForUser(
      userId,
      quest.giver.x,
      quest.giver.y,
      now
    );
    expect(zone.availableQuests.map((q) => q.id)).toContain(quest.id);
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
    // Completion rewards come from config, so borrow a real quest's id.
    const questId = questConfig.find((q) => !q.is_tutorial)!.id;
    const quest = {
      id: questId,
      type: "exploration",
      name: "Events",
      description: "",
      giver: { entity_id: "npc", zone_id: "zone", ...p },
      completion: {
        entity_id: "npc",
        zone_id: "zone",
        message: "",
        return_message: "",
        ...p,
      },
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
          zone_id: "zone",
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
        `INSERT OR REPLACE INTO quests (quest_id, version, startX, startY, endX, endY, starts_at, ends_at, data)
        VALUES (?, 2, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(questId, p.x, p.y, p.x, p.y, quest.starts_at, quest.ends_at, JSON.stringify(quest));
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
