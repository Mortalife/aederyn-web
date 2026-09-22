import { Context, Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { Session, sessionMiddleware } from "hono-sessions";
import { Content } from "./templates/layout.js";
import { fragmentEvent, patchEvent, redirectEvent } from "./sse/index.js";
import { GameLogin } from "./templates/game.js";
import { getUser } from "./user/user.js";
import { MAX_CHAT_MESSAGE_LENGTH } from "./social/chat.js";
import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";
import { sessionStore } from "./lib/sqlite-store.js";
import { compression } from "./lib/compression.js";
import { getStream, returnStream } from "./sse/stream.js";
import { isProduction } from "./lib/runtime.js";
import { env } from "./lib/env.js";
import {
  enqueue,
  isDirection,
  submit,
  type Command,
} from "./game/commands.js";
import { startLoop } from "./game/loop.js";
import {
  closeConnection,
  openConnection,
  renderGameFor,
} from "./game/connections.js";

type SessionDataTypes = {
  user_id: string;
};

type HonoApp = {
  Variables: {
    session: Session<SessionDataTypes>;
    session_key_rotation: boolean;
  };
};

const app = new Hono<HonoApp>({});

app.use(compression);

app.use("*", (c, next) => {
  if (c.req.path === "/health") {
    return next();
  }

  const session = sessionMiddleware({
    store: sessionStore,
    encryptionKey: env.SESSION_SECRET,
    expireAfterSeconds: 60 * 60 * 24 * 90, // Expire session after 90 days of inactivity
    cookieOptions: {
      sameSite: "Lax", // Recommended for basic CSRF protection in modern browsers
      path: "/", // Required for this library to work properly
      httpOnly: true, // Recommended to avoid XSS attacks
    },
  });

  return session(c, next);
});

if (isProduction()) {
  app.use(
    "/static/assets/*",
    serveStatic({
      root: "./dist/static/assets",
      rewriteRequestPath: (path) => path.replace("/static/assets", ""),
    })
  );
}
app.use(
  "/assets/*",
  serveStatic({
    root: "./public",
    rewriteRequestPath: (path) => path.replace("/assets", ""),
  })
);

app.get("/", async (c) => {
  return c.html(
    await Content({
      siteData: {
        title: "Aederyn Online - Web",
        description: "Aederyn Online - Web",
        image: "",
      },
      user_id: "",
    })
  );
});

app.post("/game/login", async (c) => {
  const { user_id = "", isMobile = false } = await c.req.json<{
    user_id: string;
    isMobile: boolean;
  }>();
  const id = await submit({ type: "login", userId: user_id });

  if (id) {
    const session = c.get("session");
    session.set("user_id", id);
  }

  const stream = getStream(c);

  if (!id) {
    await stream.writeSSE(
      fragmentEvent(
        GameLogin({
          user_id,
          error: "User not found",
        })
      )
    );
  } else {
    await stream.writeSSE(redirectEvent("/"));
  }

  return returnStream(c, stream);
});

app.delete("/game/logout", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";

  if (user_id) {
    session.deleteSession();
  }
  const stream = getStream(c);

  await stream.writeSSE(redirectEvent("/"));

  return returnStream(c, stream);
});

app.get("/game", async (c) => {
  const session = c.get("session");
  const userId = session.get("user_id") ?? "";

  const datastarParam = c.req.query("datastar");
  const signals = datastarParam ? JSON.parse(datastarParam) : {};
  const isMobile = Boolean(signals.isMobile);

  const stream = getStream(c);

  if (!userId || !getUser(userId)) {
    await stream.writeSSE(fragmentEvent(GameLogin({ user_id: "" })));
    return returnStream(c, stream);
  }

  // Wait for it to commit so the first render sees the player online.
  await submit({ type: "connect", userId });

  // From here the tick sends this stream whatever changes.
  const connection = openConnection(userId, isMobile, stream);

  if (!connection) {
    await stream.writeSSE(
      fragmentEvent(GameLogin({ user_id: userId, error: "User not found" }))
    );
    return returnStream(c, stream);
  }

  stream.onAbort(() => {
    closeConnection(connection);
    enqueue({ type: "disconnect", userId });
  });

  return returnStream(c, stream);
});

app.get("/game/refresh", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";

  const datastarParam = c.req.query("datastar");
  const signals = datastarParam ? JSON.parse(datastarParam) : {};
  const isMobile = Boolean(signals.isMobile);

  return streamSSE(
    c,
    async (stream) => {
      const game = renderGameFor(user_id, isMobile);
      await stream.writeSSE(
        game
          ? patchEvent([game])
          : fragmentEvent(GameLogin({ user_id, error: "User not found" }))
      );
    },
    async (err, stream) => {
      console.error(err);
    }
  );
});

const commandRoute = (
  toCommand: (c: Context<HonoApp>, userId: string) => Promise<Command | null>
) =>
  async (c: Context<HonoApp>) => {
    const userId = c.get("session").get("user_id") ?? "";

    if (!userId) {
      return c.redirect("");
    }

    const command = await toCommand(c, userId);
    if (command) {
      enqueue(command);
    }

    return c.body(null, 204);
  };

app.post(
  "/game/move/:direction",
  commandRoute(async (c, userId) => {
    const direction = c.req.param("direction");

    return isDirection(direction)
      ? { type: "move", userId, direction }
      : null;
  })
);

app.get(
  "/game/resources/:resource_id",
  commandRoute(async (c, userId) => ({
    type: "gather_start",
    userId,
    resourceId: c.req.param("resource_id"),
  }))
);

app.delete(
  "/game/resources/:resource_id",
  commandRoute(async (c, userId) => ({
    type: "gather_cancel",
    userId,
    resourceId: c.req.param("resource_id"),
  }))
);

app.post(
  "/game/chat",
  commandRoute(async (c, userId) => {
    const { message } = await c.req.json<{ message?: unknown }>();

    if (typeof message !== "string") {
      return null;
    }

    const trimmed = message.trim().slice(0, MAX_CHAT_MESSAGE_LENGTH);

    return trimmed ? { type: "chat", userId, message: trimmed } : null;
  })
);

app.delete(
  "/game/inventory/:inventory_id",
  commandRoute(async (c, userId) => ({
    type: "inventory_drop",
    userId,
    inventoryId: c.req.param("inventory_id"),
  }))
);

app.delete(
  "/game/system-messages",
  commandRoute(async (_c, userId) => ({
    type: "system_messages_clear",
    userId,
  }))
);

app.delete(
  "/game/system-messages/:system_message_id",
  commandRoute(async (c, userId) => ({
    type: "system_message_remove",
    userId,
    messageId: c.req.param("system_message_id"),
  }))
);

app.post(
  "/game/quest/:quest_id",
  commandRoute(async (c, userId) => ({
    type: "quest_start",
    userId,
    questId: c.req.param("quest_id"),
  }))
);

app.put(
  "/game/quest/:quest_id/objective/:objective_id",
  commandRoute(async (c, userId) => ({
    type: "quest_advance",
    userId,
    questId: c.req.param("quest_id"),
    objectiveId: c.req.param("objective_id"),
  }))
);

app.post(
  "/game/quest/:quest_id/complete",
  commandRoute(async (c, userId) => ({
    type: "quest_complete",
    userId,
    questId: c.req.param("quest_id"),
  }))
);

app.delete(
  "/game/quest/:quest_id",
  commandRoute(async (c, userId) => ({
    type: "quest_cancel",
    userId,
    questId: c.req.param("quest_id"),
  }))
);

app.get("/health", (c) => {
  return c.text("OK");
});

startLoop();

if (isProduction()) {
  serve({
    fetch: app.fetch,
    port: 3000,
  });
}

export default app;
