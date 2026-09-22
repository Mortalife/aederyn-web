import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SSEStreamingApi } from "hono/streaming";
import { beforeAll, describe, expect, it, vi } from "vitest";

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
const { MAP_HEIGHT, MAP_WIDTH } = await import("../config.js");
const { resourcesById } = await import("../config/resources.js");
const { writer } = await import("../db/writer.js");
const { bumpUser, userVersion } = await import("./versions.js");
const { ALERT_MS } = await import("./view/select.js");
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

/** Each top-level element in a patch, by id. Only `div`s nest here. */
const patchedElements = (data: string) => {
  const elements = new Map<string, string>();
  let depth = 0;
  let start = 0;
  let id = "";
  for (const match of data.matchAll(/<(\/?)div\b([^>]*)>/g)) {
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
  for (let x = 0; x < MAP_WIDTH; x++) {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      if (getTileSelection(x, y).accessible) {
        return { x, y };
      }
    }
  }
  throw new Error("No accessible tile");
};

/** A tile with a limitless resource that needs no items. */
const gatherableZone = () => {
  for (let x = 0; x < MAP_WIDTH; x++) {
    for (let y = 0; y < MAP_HEIGHT; y++) {
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
    const connection = openConnection(alice, false, stream, now)!;

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
    const connection = openConnection(alice, false, stream, now)!;

    now += 200;
    await run({ type: "move", userId: alice, direction: "enter" });

    expect(writes).toHaveLength(2);
    // Entering a zone swaps the layout: the whole of #content goes.
    expect(patchedIds(writes[1]!)).toContain("content");

    now += 200;
    await run({ type: "chat", userId: alice, message: "hello" });

    expect(writes).toHaveLength(3);
    expect(patchedIds(writes[2]!)).toEqual(["chat-messages"]);
    expect(writes[2]).toContain("hello");

    closeConnection(connection);
    now += 200;
    await run({ type: "move", userId: alice, direction: "exit" });
  });

  it("renders a zone's players once for everyone in it", async () => {
    now += 200;
    await run({ type: "move", userId: alice, direction: "enter" });

    const a = fakeStream();
    const b = fakeStream();
    const connections = [
      openConnection(alice, false, a.stream, now)!,
      openConnection(bob, false, b.stream, now)!,
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

  it("redraws once an alert runs out, with no command", () => {
    const { stream, writes } = fakeStream();
    const connection = openConnection(alice, false, stream, now)!;

    now += 200;
    writer.transaction(() =>
      addSystemMessage(alice, "Something happened", "success", now)
    )();
    tick(now);
    expect(writes).toHaveLength(2);
    expect(writes[1]).toContain("text-green-400");

    // Still recent: nothing to redraw.
    now += 200;
    tick(now);
    expect(writes).toHaveLength(2);

    now += ALERT_MS;
    tick(now);
    expect(writes).toHaveLength(3);
    expect(patchedIds(writes[2]!)).toEqual(["info"]);
    expect(writes[2]).not.toContain("text-green-400");

    now += 200;
    tick(now);
    expect(writes).toHaveLength(3);

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
    const connection = openConnection(carol, false, stream, now)!;

    now += 200;
    const startedAt = now;
    await run({ type: "gather_start", userId: carol, resourceId: resource.id });

    expect(writes).toHaveLength(2);
    const start = patchedElements(writes[1]!).get("resources")!;
    expect(start).toContain(`id="progress-${resource.id}"`);
    // The client animates from these, so the HTML has no elapsed time in it.
    expect(start).toContain(`delay: ${startedAt} - Date.now()`);
    expect(start).toContain(`duration: ${resource.collectionTime * 1000},`);

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
    const finish = patchedElements(writes[2]!).get("resources")!;
    expect(finish).not.toContain("progress-");

    closeConnection(connection);
  });

  it("keeps a resource's messages to the tile it was gathered on", async () => {
    // Two neighbouring tiles with the same limited resource.
    const { a, resource } = (() => {
      for (let x = 0; x < MAP_WIDTH; x++) {
        for (let y = 0; y < MAP_HEIGHT; y++) {
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
    const connection = openConnection(dave, false, stream, now)!;

    now += 200;
    await run({ type: "gather_start", userId: dave, resourceId: resource.id });
    now += resource.collectionTime * 1000 + 200;
    tick(now);
    const card = (data: string) =>
      data.slice(data.indexOf(`id="resources-${resource.id}"`));
    expect(card(writes.at(-1)!)).toContain("You have completed");

    // Next door, within the flash: its own count, and no message from A.
    for (const direction of ["exit", "right", "enter"] as const) {
      now += 200;
      await run({ type: "move", userId: dave, direction });
    }
    const next = card(writes.at(-1)!);
    expect(next).toContain(`${resource.amount} left`);
    expect(next).not.toContain("You have completed");

    closeConnection(connection);
  });

  it("forgets closed connections", () => {
    expect(connectionCount()).toBe(0);
  });
});
