import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SSEStreamingApi } from "hono/streaming";
import { beforeAll, describe, expect, it, vi } from "vitest";
import "../test/config/index.js";

// The connections open at import time, so point them at a scratch database
// before importing anything that touches them.
process.env.DATABASE_PATH = mkdtempSync(join(tmpdir(), "game-conn-")) + "/";

const { submit } = await import("./commands.js");
const { tick } = await import("./loop.js");
const { openConnection, closeConnection, connectionCount } = await import(
  "./connections.js"
);
const { getUser } = await import("../user/user.js");
const { getTileSelection } = await import("../world/index.js");
const { MAP_BOUNDS } = await import("../config.js");
const { resourcesById } = await import("../config/resources.js");
const { writer } = await import("../db/writer.js");
const { bumpUser, userVersion } = await import("./versions.js");
const { FIGHT_LINGER_MS } = await import("./view/select.js");
const { monstersById } = await import("../config/monsters.js");
const { addSystemMessage } = await import("./systems/system-messages.js");

let now = 1_000_000_000_000;

const run = async <C extends Parameters<typeof submit>[0]>(command: C) => {
  const result = submit(command);
  tick(now);
  return result;
};

/** A stream that records the patches it's sent. */
const fakeStream = () => {
  const writes: string[] = [];
  const stream = {
    closed: false,
    writeSSE: vi.fn(async ({ data }: { data: string }) => {
      writes.push(data);
    }),
  };
  return { stream: stream as unknown as SSEStreamingApi, writes };
};

/** Each top-level element in a patch, by id. Only `div`s nest, and `main` is the scene. */
const patchedElements = (data: string) => {
  const elements = new Map<string, string>();
  let depth = 0;
  let start = 0;
  let id = "";
  for (const match of data.matchAll(/<(\/?)(?:div|main|section|nav)\b([^>]*)>/g)) {
    if (match[1]) {
      if (--depth === 0) {
        elements.set(id, data.slice(start, match.index + match[0].length));
      }
      continue;
    }
    if (depth++ === 0) {
      start = match.index;
      id = /id="([^"]+)"/.exec(match[2]!)?.[1] ?? "?";
    }
  }
  return elements;
};

const patchedIds = (data: string) => [...patchedElements(data).keys()];

const accessibleZone = () => {
  for (let x = MAP_BOUNDS.minX; x <= MAP_BOUNDS.maxX; x++) {
    for (let y = MAP_BOUNDS.minY; y <= MAP_BOUNDS.maxY; y++) {
      if (getTileSelection(x, y).accessible) {
        return { x, y };
      }
    }
  }
  throw new Error("No accessible tile");
};

/** A tile with a limitless resource that needs no items. */
const gatherableZone = () => {
  for (let x = MAP_BOUNDS.minX; x <= MAP_BOUNDS.maxX; x++) {
    for (let y = MAP_BOUNDS.minY; y <= MAP_BOUNDS.maxY; y++) {
      const tile = getTileSelection(x, y);
      const resource = tile.resources
        .map((id) => resourcesById.get(id))
        .find((r) => r && r.required_items.length === 0 && r.limitless);
      if (resource && tile.accessible) {
        return { p: { x, y }, resource };
      }
    }
  }
  throw new Error("No gatherable resource on the map");
};

/** Put a player on the world map at `p`, outside the loop. */
const placeAt = (userId: string, p: { x: number; y: number }) => {
  const user = getUser(userId)!;
  writer
    .prepare("UPDATE users SET data = ? WHERE id = ?")
    .run(JSON.stringify({ ...user, p, z: false }), userId);
  bumpUser(userId);
};

let alice: string;
let bob: string;

beforeAll(async () => {
  alice = (await run({ type: "login", userId: "" }))!;
  bob = (await run({ type: "login", userId: "" }))!;
  const zone = accessibleZone();
  placeAt(alice, zone);
  placeAt(bob, zone);
  await run({ type: "connect", userId: alice });
  await run({ type: "connect", userId: bob });
});

describe("connections", () => {
  it("sends the whole game on open, then nothing while idle", () => {
    const { stream, writes } = fakeStream();
    const connection = openConnection(alice, stream, now)!;

    expect(writes).toHaveLength(1);
    expect(patchedIds(writes[0]!)).toEqual(["game"]);

    for (let i = 0; i < 5; i++) {
      now += 200;
      tick(now);
    }
    expect(writes).toHaveLength(1);

    closeConnection(connection);
  });

  it("draws an action on the next tick, patching only what changed", async () => {
    const { stream, writes } = fakeStream();
    const connection = openConnection(alice, stream, now)!;

    now += 200;
    await run({ type: "move", userId: alice, direction: "enter" });

    expect(writes).toHaveLength(2);
    // Entering a zone swaps the layout: the whole of #scene goes.
    expect(patchedIds(writes[1]!)).toContain("scene");

    now += 200;
    await run({ type: "chat", userId: alice, message: "hello" });

    expect(writes).toHaveLength(3);
    expect(patchedIds(writes[2]!)).toEqual(["log-chat"]);
    expect(writes[2]).toContain("hello");

    closeConnection(connection);
    now += 200;
    await run({ type: "move", userId: alice, direction: "exit" });
  });

  it("swaps only the scene between the map and a zone", async () => {
    const { stream, writes } = fakeStream();
    const connection = openConnection(alice, stream, now)!;
    const unchanged = [
      "hud",
      "activity",
      "inventory",
      "equipment",
      "log-chat",
      "log-combat",
    ];

    now += 200;
    await run({ type: "move", userId: alice, direction: "enter" });

    expect(writes).toHaveLength(2);
    const entered = patchedElements(writes[1]!);
    expect(entered.get("scene")).toContain('id="zone"');
    // Who's here is part of the side panel, and it did change.
    expect(entered.get("zone-players")).not.toContain("Enter a zone");
    for (const id of unchanged) {
      expect(entered.has(id)).toBe(false);
    }

    now += 200;
    await run({ type: "move", userId: alice, direction: "exit" });

    expect(writes).toHaveLength(3);
    const exited = patchedElements(writes[2]!);
    expect(exited.get("scene")).toContain('id="world-map"');
    expect(exited.has("zone")).toBe(false);
    for (const id of unchanged) {
      expect(exited.has(id)).toBe(false);
    }

    // The log is on screen on the map too.
    now += 200;
    await run({ type: "chat", userId: alice, message: "from the map" });
    expect(patchedIds(writes.at(-1)!)).toEqual(["log-chat"]);

    closeConnection(connection);
  });

  it("renders a zone's players once for everyone in it", async () => {
    now += 200;
    await run({ type: "move", userId: alice, direction: "enter" });

    const a = fakeStream();
    const b = fakeStream();
    const connections = [
      openConnection(alice, a.stream, now)!,
      openConnection(bob, b.stream, now)!,
    ];

    now += 200;
    await run({ type: "move", userId: bob, direction: "enter" });

    // Alice sees Bob arrive; Bob gets the zone layout.
    const alicePatch = a.writes.at(-1)!;
    expect(patchedIds(alicePatch)).toContain("zone-players");
    expect(alicePatch).toContain(`other-user-${bob}`);
    expect(b.writes.at(-1)).toContain(`other-user-${alice}`);

    // Same HTML for both: it was rendered once and shared.
    expect(b.writes.at(-1)).toContain(
      patchedElements(alicePatch).get("zone-players")!
    );

    connections.forEach(closeConnection);
    now += 200;
    await run({ type: "move", userId: alice, direction: "exit" });
    await run({ type: "move", userId: bob, direction: "exit" });
  });

  it("shares a chat message's render and patches only the log with it", async () => {
    const a = fakeStream();
    const b = fakeStream();
    const connections = [
      openConnection(alice, a.stream, now)!,
      openConnection(bob, b.stream, now)!,
    ];

    now += 200;
    await run({ type: "chat", userId: bob, message: "anyone got an axe?" });

    const seen = patchedElements(a.writes.at(-1)!);
    expect([...seen.keys()]).toEqual(["log-chat"]);
    expect(seen.get("log-chat")).toContain("anyone got an axe?");
    expect(seen.get("log-chat")).toContain('class="log-line log-chat');
    expect(b.writes.at(-1)).toBe(a.writes.at(-1));

    connections.forEach(closeConnection);
  });

  it("puts system messages in the log, not the menu", () => {
    const { stream, writes } = fakeStream();
    const connection = openConnection(alice, stream, now)!;
    expect(writes[0]).not.toContain("Notifications");

    now += 200;
    writer.transaction(() =>
      addSystemMessage(alice, "Something happened", "success", now)
    )();
    tick(now);
    expect(writes).toHaveLength(2);
    const patched = patchedElements(writes[1]!);
    expect([...patched.keys()]).toEqual(["log-game"]);
    expect(patched.get("log-game")).toContain("Something happened");
    expect(patched.get("log-game")).toContain("text-emerald-300");

    // Nothing to take down later.
    now += 20_000;
    tick(now);
    expect(writes).toHaveLength(2);

    now += 200;
    writer.transaction(() =>
      addSystemMessage(alice, "Discovered: Somewhere", "info", now, {
        action_type: "discovery",
        action_id: "somewhere",
      })
    )();
    tick(now);
    expect(patchedIds(writes[2]!)).toEqual(["log-game"]);
    expect(writes[2]).toContain("Discovered: Somewhere");

    closeConnection(connection);
  });

  it("sends a gathering player two patches: start and finish", async () => {
    const carol = (await run({ type: "login", userId: "" }))!;
    const { p, resource } = gatherableZone();
    placeAt(carol, p);
    await run({ type: "connect", userId: carol });
    now += 200;
    await run({ type: "move", userId: carol, direction: "enter" });

    const { stream, writes } = fakeStream();
    const connection = openConnection(carol, stream, now)!;

    now += 200;
    const startedAt = now;
    await run({ type: "gather_start", userId: carol, resourceId: resource.id });

    expect(writes).toHaveLength(2);
    const start = patchedElements(writes[1]!);
    expect(start.get("resources")).toContain(
      `id="progress-${resource.id}-${startedAt}"`
    );
    const activity = start.get("activity")!;
    expect(activity).toContain(resource.name);
    expect(activity).toContain("Cancel");
    // The client animates from these, so the HTML has no elapsed time in it.
    expect(activity).toContain(`delay: ${startedAt} - Date.now()`);
    expect(activity).toContain(`duration: ${resource.collectionTime * 1000},`);

    // Nothing while the bar fills, not even a re-render.
    const version = userVersion(carol);
    const endsAt = startedAt + resource.collectionTime * 1000;
    while (now + 200 < endsAt) {
      now += 200;
      tick(now);
    }
    expect(writes).toHaveLength(2);
    expect(userVersion(carol)).toBe(version);

    now += 200;
    tick(now);
    expect(writes).toHaveLength(3);
    const finish = patchedElements(writes[2]!);
    expect(finish.get("resources")).not.toContain("progress-");
    expect(finish.get("activity")).toContain("Nothing in progress");
    expect(finish.get("activity")).not.toContain("Cancel");
    // The result floats up from the row, and goes in the log.
    const gain = `+${resource.reward_items[0]!.qty} `;
    expect(finish.get("resources")).toContain(gain);
    expect(finish.get("log-game")).toContain("You have completed");

    closeConnection(connection);
  });

  it("keeps a resource's messages to the tile it was gathered on", async () => {
    // Two neighbouring tiles with the same limited resource.
    const { a, resource } = (() => {
      for (let x = MAP_BOUNDS.minX; x <= MAP_BOUNDS.maxX; x++) {
        for (let y = MAP_BOUNDS.minY; y <= MAP_BOUNDS.maxY; y++) {
          const here = getTileSelection(x, y);
          const right = getTileSelection(x + 1, y);
          const resource = here.resources
            .map((id) => resourcesById.get(id))
            .find(
              (r) =>
                r &&
                !r.limitless &&
                r.required_items.length === 0 &&
                right.resources.includes(r.id)
            );
          if (resource && here.accessible && right.accessible) {
            return { a: { x, y }, resource };
          }
        }
      }
      throw new Error("No neighbouring tiles share a resource");
    })();

    const dave = (await run({ type: "login", userId: "" }))!;
    placeAt(dave, a);
    await run({ type: "connect", userId: dave });
    now += 200;
    await run({ type: "move", userId: dave, direction: "enter" });

    const { stream, writes } = fakeStream();
    const connection = openConnection(dave, stream, now)!;

    now += 200;
    await run({ type: "gather_start", userId: dave, resourceId: resource.id });
    now += resource.collectionTime * 1000 + 200;
    tick(now);
    const card = (data: string) =>
      data.slice(data.indexOf(`id="resources-${resource.id}"`));
    expect(card(writes.at(-1)!)).toContain('id="float-');

    // Next door, within the flash: its own count, and no message from A.
    for (const direction of ["exit", "right", "enter"] as const) {
      now += 200;
      await run({ type: "move", userId: dave, direction });
    }
    const next = card(writes.at(-1)!);
    expect(next).toContain(`${resource.amount} left`);
    expect(next).not.toContain('id="float-');

    closeConnection(connection);
  });

  it("shows a fight in the activity bar and the combat log, not the monster's card", async () => {
    const chicken = monstersById.get("monster_chicken")!;
    const { zone, spawn } = (() => {
      for (let x = MAP_BOUNDS.minX; x <= MAP_BOUNDS.maxX; x++) {
        for (let y = MAP_BOUNDS.minY; y <= MAP_BOUNDS.maxY; y++) {
          const tile = getTileSelection(x, y);
          const spawn = tile.monsters?.indexOf(chicken.id) ?? -1;
          if (tile.accessible && spawn >= 0) {
            return { zone: { x, y }, spawn };
          }
        }
      }
      throw new Error("No chicken on the map");
    })();
    const erin = (await run({ type: "login", userId: "" }))!;
    placeAt(erin, zone);
    await run({ type: "connect", userId: erin });
    now += 200;
    await run({ type: "move", userId: erin, direction: "enter" });

    const { stream, writes } = fakeStream();
    const connection = openConnection(erin, stream, now)!;
    const idle = patchedElements(writes[0]!).get("game")!;
    expect(idle).toContain("Nothing in progress");

    now += 200;
    await run({ type: "attack", userId: erin, spawn });
    let patch = patchedElements(writes.at(-1)!);
    const activity = patch.get("activity")!;
    expect(activity).toContain(chicken.name);
    expect(activity).toContain("/game/combat/flee");
    expect(activity).toContain("swing-activity-player-");
    expect(activity).toContain("swing-activity-monster-");
    expect(patch.get("log-combat")).toContain(`You hit ${chicken.name} for`);
    expect(patch.get("log-game")).toContain(`You attack ${chicken.name}.`);
    const card = patch.get("monsters")!;
    expect(card).toContain("In combat with you");
    expect(card).not.toContain("swing-");
    expect(card).not.toContain("You hit");
    expect(card).toContain('id="float-');

    // The monster's next swing hurts, with a flash at the screen's edge.
    const swings = Math.ceil(chicken.attack.speed / 200);
    for (let i = 0; i < swings; i++) {
      now += 200;
      tick(now);
    }
    expect(writes.join("")).toContain(`${chicken.name} hit you for`);
    expect(writes.join("")).toContain('class="hurt-vignette"');

    now += 200;
    await run({ type: "flee", userId: erin });
    patch = patchedElements(writes.at(-1)!);
    expect(patch.get("activity")).toContain("Nothing in progress");

    closeConnection(connection);
    now += FIGHT_LINGER_MS;
  });

  it("forgets closed connections", () => {
    expect(connectionCount()).toBe(0);
  });
});
