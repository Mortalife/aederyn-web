import type { SSEStreamingApi } from "hono/streaming";
import { patchEvent } from "../sse/index.js";
import {
  buildScreen,
  diffScreen,
  emptyDrawn,
  renderGame,
  type Drawn,
  type RenderCache,
} from "./view/fragments.js";
import { loadView } from "./view/load.js";
import { selectGame } from "./view/select.js";
import {
  chatVersion,
  discoveryVersion,
  onlineVersion,
  questsVersion,
  userVersion,
  zoneVersion,
} from "./versions.js";

/** The versions a connection was last drawn at. */
type Seen = {
  user: number;
  discoveries: number;
  /** The zone the player was in, or null on the world map. */
  zone: { x: number; y: number; version: number } | null;
  chat: number;
  quests: number;
  online: number;
  /** When a flash or alert on screen runs out. */
  wakeAt: number;
};

export type Connection = {
  userId: string;
  stream: SSEStreamingApi;
  drawn: Drawn;
  seen: Seen;
};

const connections = new Set<Connection>();

const isDirty = ({ seen, userId }: Connection, now: number) =>
  now >= seen.wakeAt ||
  seen.user !== userVersion(userId) ||
  seen.discoveries !== discoveryVersion(userId) ||
  seen.quests !== questsVersion() ||
  seen.online !== onlineVersion() ||
  seen.chat !== chatVersion() ||
  // Zone state is only on screen inside a zone.
  (seen.zone !== null &&
    seen.zone.version !== zoneVersion(seen.zone.x, seen.zone.y));

/**
 * Loads and lays out a player's screen. Versions are read at the same time
 * as the rows, and nothing writes in between: this runs between ticks.
 */
const draw = (userId: string, now: number) => {
  const input = loadView(userId, now);
  if (!input) {
    return null;
  }

  const view = selectGame(input, { now });
  const { user } = input;

  const seen: Seen = {
    user: userVersion(userId),
    discoveries: discoveryVersion(userId),
    zone: user.z
      ? { x: user.p.x, y: user.p.y, version: zoneVersion(user.p.x, user.p.y) }
      : null,
    chat: chatVersion(),
    quests: questsVersion(),
    online: onlineVersion(),
    wakeAt: view.wakeAt,
  };

  return { screen: buildScreen(view, input.activeQuests), seen };
};

const send = (connection: Connection, elements: string[]) => {
  if (elements.length === 0 || connection.stream.closed) {
    return;
  }

  connection.stream
    .writeSSE(patchEvent(elements))
    .catch((error) => console.error("SSE write failed", error));
};

/**
 * The whole game for one player, e.g. for a refresh. Null if there's no
 * such user.
 */
export const renderGameFor = (userId: string, now = Date.now()) => {
  const drawing = draw(userId, now);
  return drawing ? renderGame(emptyDrawn(), drawing.screen, userId, now) : null;
};

/**
 * Starts sending a player's screen down `stream`: all of `#game` now, then
 * whatever changes after each tick. Returns null if there's no such user.
 */
export const openConnection = (
  userId: string,
  stream: SSEStreamingApi,
  now = Date.now()
) => {
  const drawing = draw(userId, now);
  if (!drawing) {
    return null;
  }

  const connection: Connection = {
    userId,
    stream,
    drawn: emptyDrawn(),
    seen: drawing.seen,
  };

  send(connection, [renderGame(connection.drawn, drawing.screen, userId, now)]);
  connections.add(connection);

  return connection;
};

export const closeConnection = (connection: Connection) => {
  connections.delete(connection);
};

/**
 * Redraws every connection whose versions moved since it was last drawn,
 * sending one patch with just the fragments that changed. Runs after each
 * tick commits. Renders are shared through `cache`, so a zone's player list
 * renders once for everyone in it.
 */
export const renderConnections = (now: number) => {
  const cache: RenderCache = new Map();

  for (const connection of connections) {
    if (connection.stream.closed) {
      connections.delete(connection);
      continue;
    }

    if (!isDirty(connection, now)) {
      continue;
    }

    try {
      const drawing = draw(connection.userId, now);
      if (!drawing) {
        // The user is gone; the stream closes when the client notices.
        connection.seen.wakeAt = Infinity;
        continue;
      }

      connection.seen = drawing.seen;
      send(connection, diffScreen(connection.drawn, drawing.screen, cache));
    } catch (error) {
      console.error(`Render failed for ${connection.userId}`, error);
    }
  }
};

/** For tests and diagnostics. */
export const connectionCount = () => connections.size;
