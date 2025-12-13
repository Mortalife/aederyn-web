import { Context, Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { Session, sessionMiddleware } from "hono-sessions";
import { Content, Layout } from "./templates/layout.js";
import { fragmentEvent } from "./sse/index.js";
import { getTile, getTileSelection, isOutOfBounds } from "./world/index.js";
import { GameLogin } from "./templates/game.js";
import {
  getPopulatedUser,
  getUser,
  getUserSync,
  saveUser,
  transformUser,
} from "./user/user.js";
import { ChatMessages } from "./templates/elements.js";
import { cleanupResources } from "./world/resources.js";
import { removeFromInventoryById } from "./user/inventory.js";
import {
  CHAT_EVENT,
  PubSub,
  USER_EVENT,
  ZONE_EVENT,
  type ChatEvent,
  type UserEvent,
  type ZoneEvent,
} from "./sse/pubsub.js";
import {
  calculateMessageHistory,
  getMessages,
  saveMessage,
} from "./social/chat.js";
import {
  getOnlineStatus,
  markUserOffline,
  markUserOnline,
} from "./social/active.js";
import {
  sendGame,
  sendHouse,
  sendUserNotFound,
} from "./templates/game-update.js";
import {
  getInProgressAction,
  markActionComplete,
  markActionInProgress,
  processActions,
} from "./user/action.js";
import type { GameUser } from "./config.js";
import { addUserToZone, removeUserFromZone } from "./user/zone.js";
import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";
import {
  addSystemMessage,
  cleanupSystemMessages,
  clearAllUserSystemMessages,
  removeSystemMessage,
} from "./user/system.js";
import { questProgressManager } from "./user/quest-progress-manager.js";
import { questManager } from "./user/quest-generator.js";
import { sessionStore } from "./lib/libsql-store.js";
// import { houseRoutes } from "./house/routes.js";
import pDebounce from "p-debounce";
import { setTimeout as delay } from "timers/promises";
import { compression } from "./lib/compression.js";
import { getStream, returnStream } from "./sse/stream.js";
import { isProduction } from "./lib/runtime.js";
import { env } from "./lib/env.js";

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
  app.use("/assets/*", serveStatic({ root: "./public" }));
}

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

// app.route("/house", houseRoutes);

app.post("/game/login", async (c) => {
  const { user_id = "" } = await c.req.json<{ user_id: string }>();
  const user = await getUserSync(user_id);

  if (user) {
    const session = c.get("session");
    session.set("user_id", user.id);
  }

  return streamSSE(
    c,
    async (stream) => {
      if (!user) {
        await stream.writeSSE(
          fragmentEvent(
            GameLogin({
              user_id,
              error: "User not found",
            })
          )
        );
        return;
      }

      await sendGame(stream, {
        user_id: user.id,
      });
    },
    async (err) => {
      console.error(err);
    }
  );
});
app.delete("/game/logout", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  const user = await getUserSync(user_id);

  if (user) {
    session.deleteSession();
  }

  return streamSSE(
    c,
    async (stream) => {
      await stream.writeSSE(
        fragmentEvent(
          GameLogin({
            user_id: "",
          })
        )
      );
    },
    async (err) => {
      console.error(err);
    }
  );
});

app.get("/game", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  let id = 0;

  const stream = getStream(c);
  const tempUser = await getPopulatedUser(user_id);
  if (!tempUser) {
    await stream.writeSSE(
      fragmentEvent(
        GameLogin({
          user_id: "",
        })
      )
    );
    return returnStream(c, stream);
  }

  let user: GameUser = tempUser;

  await markUserOnline(user.id);
  if (user.z) {
    await addUserToZone(user.id, user.p.x, user.p.y);
  }

  await sendGame(stream, {
    user_id: user.id,
    user,
  });

  const processChatEvent = pDebounce.promise(
    async ({ user_id, message }: ChatEvent) => {
      await delay(200);
      console.log("chat message", user_id, message);

      const status = await getOnlineStatus(user_id);
      if (!status) {
        return;
      }

      const messages = await getMessages(
        calculateMessageHistory(status.online_at)
      );

      stream.writeSSE(fragmentEvent(ChatMessages(messages, user))).then(() => {
        console.log("chat messages sent to user");
      });
    }
  );

  PubSub.subscribe(CHAT_EVENT, processChatEvent);

  const processZoneUpdate = pDebounce.promise(async ({ x, y }: ZoneEvent) => {
    if (x !== user.p.x || y !== user.p.y) {
      // No need to process the users own message
      return;
    }
    await delay(200);

    await sendGame(stream, {
      user_id: user.id,
    });
    console.log("zone update sent to user");
  });

  PubSub.subscribe(ZONE_EVENT, processZoneUpdate);

  const processUserEvent = pDebounce.promise(async ({ user_id }: UserEvent) => {
    await delay(200);
    const user = await getPopulatedUser(user_id);
    if (user === null) {
      return;
    }

    await sendGame(stream, {
      user_id: user.id,
      user,
    });
  });

  PubSub.subscribe(USER_EVENT, processUserEvent);

  stream.onAbort(async () => {
    console.log("user aborted");
    PubSub.off(CHAT_EVENT, processChatEvent);
    PubSub.off(USER_EVENT, processUserEvent);
    PubSub.off(ZONE_EVENT, processZoneUpdate);
    await markUserOffline(user.id);
    if (user.z) {
      await removeUserFromZone(user.id);
    }

    console.log("user offline");
  });

  return returnStream(c, stream);
});

app.get("/game/refresh", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  return streamSSE(
    c,
    async (stream) => {
      const user = await getPopulatedUser(user_id);

      if (!user) {
        await stream.writeSSE(
          fragmentEvent(
            GameLogin({
              user_id: "",
              error: "User not found",
            })
          )
        );
        return;
      }
      await sendGame(stream, {
        user_id: user.id,
        user,
      });
    },
    async (err, stream) => {
      console.error(err);
    }
  );
});

app.post("/game/move/:direction", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  const direction = c.req.param("direction");

  const user = await getPopulatedUser(user_id);

  if (!user) {
    return c.redirect("");
  }

  if (user.z && direction !== "exit") {
    return c.body(null, 204);
  }

  // Cancel inprogress actions
  await markActionComplete(user.id, user.p.x, user.p.y);

  switch (direction) {
    case "up":
      user.p.y -= 1;
      break;
    case "down":
      user.p.y += 1;
      break;
    case "left":
      user.p.x -= 1;
      break;
    case "right":
      user.p.x += 1;
      break;
    case "enter":
      user.z = true;
      await addUserToZone(user.id, user.p.x, user.p.y);
      break;
    case "exit":
      user.z = false;
      await removeUserFromZone(user.id);
      break;
    default:
      console.error("Invalid direction");
      return c.body(null, 204);
  }

  const mapTile = getTileSelection(user.p.x, user.p.y);

  if (!isOutOfBounds(user.p.x, user.p.y) && mapTile.accessible) {
    await saveUser(user.id, transformUser(user));
  }

  return c.body(null, 204);
});

app.get("/game/resources/:resource_id", async (c) => {
  const resource_id = c.req.param("resource_id");
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";

  const user = await getPopulatedUser(user_id);

  if (!user) {
    return c.redirect("");
  }

  const mapTile = await getTile(user.p.x, user.p.y);

  if (!mapTile) {
    return c.body(null, 204);
  }

  const resource = mapTile.resources.find(
    (resource) => resource.id === resource_id
  );

  if (!resource) {
    return c.body(null, 204);
  }

  const success = await markActionInProgress(user, resource.id);
  if (!success) {
    await addSystemMessage(user.id, "You can't do that yet.", "warning");
    return c.body(null, 204);
  }

  return c.body(null, 204);
});

app.delete("/game/resources/:resource_id", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  const resource_id = c.req.param("resource_id");

  const user = await getPopulatedUser(user_id);

  if (!user) {
    return c.redirect("");
  }

  const mapTile = await getTile(user.p.x, user.p.y);

  if (!mapTile) {
    return c.body(null, 204);
  }

  const resource = mapTile.resources.find(
    (resource) => resource.id === resource_id
  );

  if (!resource) {
    return c.body(null, 204);
  }

  await markActionComplete(user.id, user.p.x, user.p.y);

  return c.body(null, 204);
});

app.post("/game/chat", async (c) => {
  const { message } = await c.req.json();
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";

  const user = await getUser(user_id);

  if (!user) {
    return c.redirect("");
  }

  await saveMessage(user_id, message);

  PubSub.publish(CHAT_EVENT, {
    user_id,
    message,
  });

  return c.body(null, 204);
});

app.delete("/game/inventory/:inventory_id", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  const inventory_id = c.req.param("inventory_id");

  await removeFromInventoryById(user_id, inventory_id);

  return c.body(null, 204);
});

app.delete("/game/system-messages", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";

  const user = await getPopulatedUser(user_id);

  if (!user) {
    return c.redirect("");
  }

  await clearAllUserSystemMessages(user.id);

  return c.body(null, 204);
});

app.delete("/game/system-messages/:system_message_id", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  const systemMessageId = c.req.param("system_message_id");

  const user = await getPopulatedUser(user_id);

  if (!user) {
    return c.redirect("");
  }

  if (!systemMessageId) {
    return c.body(null, 204);
  }

  await removeSystemMessage(user.id, systemMessageId);

  return c.body(null, 204);
});

app.post("/game/quest/:quest_id", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  const quest_id = c.req.param("quest_id");

  const user = await getUser(user_id);

  if (!user) {
    return c.redirect("");
  }

  if (!quest_id) {
    return c.body(null, 204);
  }

  const { availableQuests } = await questProgressManager.getZoneQuestsForUser(
    user.id,
    user.p.x,
    user.p.y,
    questManager
  );

  const quest = availableQuests.find((q) => q.id === quest_id);

  if (!quest) {
    //TODO: Add update event
    await addSystemMessage(user.id, "No such quest", "error");
    return c.body(null, 204);
  }

  await questProgressManager.startQuest(user.id, quest);

  return c.body(null, 204);
});

app.put("/game/quest/:quest_id/objective/:objective_id", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  const quest_id = c.req.param("quest_id");
  const objective_id = c.req.param("objective_id");

  const user = await getUser(user_id);

  console.log(user_id, quest_id, objective_id);

  if (!user) {
    return c.redirect("");
  }

  if (!quest_id) {
    return c.body(null, 204);
  }

  const interactions = await questProgressManager.getZoneNPCInteractionsForUser(
    user.id,
    user.p.x,
    user.p.y
  );

  const interaction = interactions.find(
    (i) => i.quest_id === quest_id && i.objective.id === objective_id
  );

  if (!interaction || !interaction.objective.progress) {
    await addSystemMessage(
      user.id,
      "Not sure what we're doing here...",
      "error"
    );

    return c.body(null, 204);
  }

  await questProgressManager.updateObjectiveProgress(
    user.id,
    interaction.quest_id,
    interaction.objective.id,
    interaction.objective.progress?.current + 1
  );

  return c.body(null, 204);
});

app.post("/game/quest/:quest_id/complete", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  const quest_id = c.req.param("quest_id");

  const user = await getUser(user_id);
  console.log(user_id, quest_id);

  if (!user) {
    return c.redirect("");
  }

  if (!quest_id) {
    return c.body(null, 204);
  }

  const status = await questProgressManager.getQuestStatus(user.id, quest_id);

  if (!status) {
    await addSystemMessage(user.id, "No such quest", "error");
  } else if (status?.status === "in_progress") {
    await addSystemMessage(user.id, "You're still on this quest!", "error");
  } else if (status?.status === "completed") {
    await addSystemMessage(
      user.id,
      "You've already completed this quest!",
      "error"
    );
  } else if (status?.status === "available") {
    await addSystemMessage(user.id, "You haven't started this quest!", "error");
  } else if (status?.status === "completable") {
    await questProgressManager.completeQuest(user.id, quest_id, questManager);
  }

  return c.body(null, 204);
});

app.delete("/game/quest/:quest_id", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  const quest_id = c.req.param("quest_id");
  return streamSSE(c, async (stream) => {
    const user = await getUser(user_id);
    console.log(user_id, quest_id);

    if (!user) {
      return;
    }

    if (!quest_id) {
      return;
    }

    await questProgressManager.cancelQuest(user.id, quest_id);

    await sendGame(stream, {
      user_id,
    });
  });
});

app.get("/health", (c) => {
  return c.text("OK");
});

setInterval(() => {
  Promise.resolve()
    .then(async () => {
      const start = Date.now();
      await cleanupResources();
      await processActions();
      await cleanupSystemMessages();

      if (Date.now() - start > 100) {
        console.log(`LAG: Processed actions in ${Date.now() - start}ms`);
      }
    })
    .catch((err) => console.error(err));
}, 100);

if (isProduction()) {
  serve({
    fetch: app.fetch,
    port: 3000,
  });
}

export default app;
