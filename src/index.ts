import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { Session, sessionMiddleware } from "hono-sessions";
import { Content } from "./templates/layout";
import { fragmentEvent } from "./sse";
import { getTile, getTileSelection, isOutOfBounds } from "./world";
import { GameLogin } from "./templates/game";
import {
  getPopulatedUser,
  getUser,
  getUserSync,
  saveUser,
  transformUser,
} from "./user/user";
import { ChatMessages } from "./templates/elements";
import { cleanupResources } from "./world/resources";
import { removeFromInventoryById } from "./user/inventory";
import {
  CHAT_EVENT,
  PubSub,
  USER_EVENT,
  ZONE_EVENT,
  type ChatEvent,
  type UserEvent,
  type ZoneEvent,
} from "./sse/pubsub";
import {
  calculateMessageHistory,
  getMessages,
  saveMessage,
} from "./social/chat";
import {
  getOnlineStatus,
  markUserOffline,
  markUserOnline,
} from "./social/active";
import { sendGame, sendUserNotFound } from "./templates/game-update";
import {
  getInProgressAction,
  markActionComplete,
  markActionInProgress,
  processActions,
} from "./user/action";
import type { GameUser } from "./config";
import { addUserToZone, removeUserFromZone } from "./user/zone";
import { serveStatic } from "hono/bun";
import {
  addSystemMessage,
  cleanupSystemMessages,
  clearAllUserSystemMessages,
  removeSystemMessage,
} from "./user/system";
import { questProgressManager } from "./user/quest-progress-manager";
import { questManager } from "./user/quest-generator";
import { QuestNPCCompleted, QuestNPCDialog } from "./templates/quests";
import { sessionStore } from "./lib/libsql-store";

let connections = 0;

type SessionDataTypes = {
  user_id: string;
};

const app = new Hono<{
  Variables: {
    session: Session<SessionDataTypes>;
    session_key_rotation: boolean;
  };
}>({});
app.use(
  "*",
  sessionMiddleware({
    store: sessionStore,
    encryptionKey:
      process.env["SESSION_SECRET"] ?? "secret-key-that-should-be-very-secret",
    expireAfterSeconds: 900, // Expire session after 15 minutes of inactivity
    cookieOptions: {
      sameSite: "Lax", // Recommended for basic CSRF protection in modern browsers
      path: "/", // Required for this library to work properly
      httpOnly: true, // Recommended to avoid XSS attacks
      maxAge: 86400,
    },
  })
);
app.use(
  "/static/assets/*",
  serveStatic({
    root: "./dist/static/assets",
    rewriteRequestPath: (path) => path.replace("/static/assets", ""),
  })
);
app.use("/assets/*", serveStatic({ root: "./public" }));

app.get("/", async (c) => {
  return c.html(
    Content({
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
            }),
            1
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
            error: "User not found",
          }),
          1
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
  return streamSSE(
    c,
    async (stream) => {
      const tempUser = await getPopulatedUser(user_id);

      if (!tempUser) {
        await stream.writeSSE(
          fragmentEvent(
            GameLogin({
              user_id: "",
              error: "User not found",
            }),
            id
          )
        );
        return;
      }

      connections++;

      let user: GameUser = tempUser;

      await markUserOnline(user.id);
      if (user.z) {
        await addUserToZone(user.id, user.p.x, user.p.y);
      }

      await sendGame(stream, {
        user_id: user.id,
        user,
      });

      const processChatEvent = ({ user_id, message }: ChatEvent) => {
        if (user_id === user.id) {
          // No need to process the users own message
          return;
        }
        console.log("chat message", user_id, message);
        id++;

        getOnlineStatus(user_id).then((status) => {
          if (!status) {
            return;
          }

          return getMessages(calculateMessageHistory(status.online_at)).then(
            (messages) => {
              stream
                .writeSSE(fragmentEvent(ChatMessages(messages, user), id))
                .then(() => {
                  console.log("chat messages sent to user");
                });
            }
          );
        });
      };

      PubSub.subscribe(CHAT_EVENT, processChatEvent);

      const processZoneUpdate = ({ x, y }: ZoneEvent) => {
        if (x !== user.p.x || y !== user.p.y) {
          // No need to process the users own message
          return;
        }

        id++;

        sendGame(
          stream,
          {
            user_id: user.id,
          },
          id
        ).then(() => {
          console.log("zone update sent to user");
        });
      };

      PubSub.subscribe(ZONE_EVENT, processZoneUpdate);

      const processUserEvent = ({ user_id }: UserEvent) => {
        if (user_id !== user.id) {
          // No need to process the users own message
          return;
        }

        getPopulatedUser(user_id).then((newUser) => {
          if (newUser === null) {
            return;
          }

          user = newUser!;
        });
      };

      PubSub.subscribe(USER_EVENT, processUserEvent);

      let isAborted = false;

      stream.onAbort(async () => {
        PubSub.off(CHAT_EVENT, processChatEvent);
        PubSub.off(USER_EVENT, processUserEvent);
        PubSub.off(ZONE_EVENT, processZoneUpdate);
        await markUserOffline(user_id);
        if (user.z) {
          await removeUserFromZone(user.id);
        }

        connections--;
        console.log("user offline");
        isAborted = true;
      });

      while (isAborted === false) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    },
    async (err) => {
      console.error(err);
    }
  );
});

app.get("/game/refresh", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  let id = 0;
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
            }),
            id
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
  return streamSSE(
    c,
    async (stream) => {
      const user = await getPopulatedUser(user_id);

      if (!user) {
        await sendUserNotFound(stream, user_id);
        return;
      }

      if (user.z && direction !== "exit") {
        await sendGame(stream, {
          user_id: user.id,
        });
        return;
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
          return;
      }

      const mapTile = getTileSelection(user.p.x, user.p.y);

      if (!isOutOfBounds(user.p.x, user.p.y) && mapTile.accessible) {
        await saveUser(user.id, transformUser(user));
      }

      await sendGame(stream, {
        user_id: user.id,
      });
    },
    async (err, stream) => {
      console.error(err);
    }
  );
});

app.get("/game/resources/:resource_id", async (c) => {
  const resource_id = c.req.param("resource_id");
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";

  let id = 0;
  return streamSSE(
    c,
    async (stream) => {
      const user = await getPopulatedUser(user_id);

      if (!user) {
        await sendUserNotFound(stream, user_id, id);
        return;
      }

      const mapTile = await getTile(user.p.x, user.p.y);

      if (!mapTile) {
        return;
      }

      const resource = mapTile.resources.find(
        (resource) => resource.id === resource_id
      );

      if (!resource) {
        return;
      }

      const success = await markActionInProgress(user, resource.id);
      if (!success) {
        await addSystemMessage(user.id, "You can't do that yet.", "warning");
        await sendGame(
          stream,
          {
            user_id,
          },
          id
        );
      }

      let current = 0;

      let isActive = true;

      while (isActive && current < resource.collectionTime + 1) {
        await stream.sleep(1000);
        const action = await getInProgressAction(user.id);
        current++;
        id++;

        if (
          !action ||
          action.resource_id !== resource.id ||
          action.x !== user.p.x ||
          action.y !== user.p.y
        ) {
          isActive = false;
          if (current < resource.collectionTime) {
            await addSystemMessage(user.id, "Action interrupted", "info");
          }
        }

        await sendGame(
          stream,
          {
            user_id,
          },
          id
        );
      }
    },
    async (err) => {
      console.error(err);
    }
  );
});

app.delete("/game/resources/:resource_id", async (c) => {
  const { user_id = "" } = await c.req.json();
  const resource_id = c.req.param("resource_id");
  let id = 0;
  return streamSSE(
    c,
    async (stream) => {
      const user = await getPopulatedUser(user_id);

      if (!user) {
        await sendUserNotFound(stream, user_id, id);
        return;
      }

      const mapTile = await getTile(user.p.x, user.p.y);

      if (!mapTile) {
        return;
      }

      const resource = mapTile.resources.find(
        (resource) => resource.id === resource_id
      );

      if (!resource) {
        return;
      }

      await markActionComplete(user.id, user.p.x, user.p.y);
    },
    async (err, stream) => {
      console.error(err);
    }
  );
});

app.post("/game/chat", async (c) => {
  const { message } = await c.req.json();
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";

  return streamSSE(c, async (stream) => {
    const user = await getUser(user_id);

    console.log(user_id, message);

    if (!user) {
      return;
    }

    await saveMessage(user_id, message);

    await sendGame(stream, {
      user_id,
    });

    PubSub.publish(CHAT_EVENT, {
      user_id,
      message,
    });
  });
});

app.delete("/game/inventory/:inventory_id", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  const inventory_id = c.req.param("inventory_id");

  return streamSSE(c, async (stream) => {
    const user = await getUser(user_id);

    if (!user) {
      return;
    }

    await removeFromInventoryById(user_id, inventory_id);

    await sendGame(stream, {
      user_id,
    });
  });
});

app.delete("/game/system-messages", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  let id = 0;
  return streamSSE(
    c,
    async (stream) => {
      const user = await getPopulatedUser(user_id);

      if (!user) {
        await sendUserNotFound(stream, user_id, id);
        return;
      }

      await clearAllUserSystemMessages(user.id);

      await sendGame(stream, {
        user_id,
      });
    },
    async (err) => {
      console.error(err);
    }
  );
});

app.delete("/game/system-messages/:system_message_id", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  const systemMessageId = c.req.param("system_message_id");
  let id = 0;
  return streamSSE(
    c,
    async (stream) => {
      const user = await getPopulatedUser(user_id);

      if (!user) {
        await sendUserNotFound(stream, user_id, id);
        return;
      }

      if (!systemMessageId) {
        return;
      }

      await removeSystemMessage(user.id, systemMessageId);

      await sendGame(stream, {
        user_id,
      });
    },
    async (err) => {
      console.error(err);
    }
  );
});

app.post("/game/quest/:quest_id", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  const quest_id = c.req.param("quest_id");
  return streamSSE(c, async (stream) => {
    const user = await getUser(user_id);

    if (!user) {
      return;
    }

    if (!quest_id) {
      return;
    }

    const { availableQuests } = await questProgressManager.getZoneQuestsForUser(
      user.id,
      user.p.x,
      user.p.y,
      questManager
    );

    const quest = availableQuests.find((q) => q.id === quest_id);

    if (!quest) {
      await addSystemMessage(user.id, "No such quest", "error");
      await sendGame(stream, {
        user_id,
      });
      return;
    }

    await questProgressManager.startQuest(user.id, quest);
    await sendGame(stream, {
      user_id,
    });
  });
});

app.get("/game/quest/:quest_id/objective/:objective_id", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  const quest_id = c.req.param("quest_id");
  const objective_id = c.req.param("objective_id");
  return streamSSE(c, async (stream) => {
    const user = await getUser(user_id);

    if (!user) {
      return;
    }

    if (!quest_id) {
      return;
    }

    const interactions =
      await questProgressManager.getZoneNPCInteractionsForUser(
        user.id,
        user.p.x,
        user.p.y
      );

    const interaction = interactions.find(
      (i) => i.quest_id === quest_id && i.objective.id === objective_id
    );

    if (!interaction) {
      return;
    }

    for (let i = 0; i < 2; i++) {
      await stream.sleep(i * 1500);
      await stream.writeSSE(
        fragmentEvent(
          QuestNPCDialog({
            step: i === 0 ? 0 : 1,
            interaction,
          }),
          i
        )
      );
    }

    await stream.writeSSE(
      fragmentEvent(
        QuestNPCCompleted({
          interaction,
        }),
        2
      )
    );

    return;
  });
});

app.put("/game/quest/:quest_id/objective/:objective_id", async (c) => {
  const session = c.get("session");
  const user_id = session.get("user_id") ?? "";
  const quest_id = c.req.param("quest_id");
  const objective_id = c.req.param("objective_id");
  return streamSSE(c, async (stream) => {
    const user = await getUser(user_id);

    console.log(user_id, quest_id, objective_id);

    if (!user) {
      return;
    }

    if (!quest_id) {
      return;
    }

    const interactions =
      await questProgressManager.getZoneNPCInteractionsForUser(
        user.id,
        user.p.x,
        user.p.y
      );

    const interaction = interactions.find(
      (i) => i.quest_id === quest_id && i.objective.id === objective_id
    );

    if (!interaction) {
      await addSystemMessage(
        user.id,
        "Not sure what we're doing here...",
        "error"
      );
      await sendGame(stream, {
        user_id,
      });
      return;
    }

    await questProgressManager.updateObjectiveProgress(
      user.id,
      interaction.quest_id,
      interaction.objective.id,
      1
    );

    await sendGame(stream, {
      user_id,
    });
  });
});

app.post("/game/quest/:quest_id/complete", async (c) => {
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
      await addSystemMessage(
        user.id,
        "You haven't started this quest!",
        "error"
      );
    } else if (status?.status === "completable") {
      await questProgressManager.completeQuest(user.id, quest_id, questManager);
    }

    await sendGame(stream, {
      user_id,
    });
  });
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
  console.log(
    `Memory used: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(
      2
    )}MB`
  );
  return c.text("OK");
});

setInterval(() => {
  const start = Date.now();
  Promise.resolve()
    .then(async () => {
      await cleanupResources();
      await processActions();
      await cleanupSystemMessages();

      if (Date.now() - start > 100) {
        console.log(`LAG: Processed actions in ${Date.now() - start}ms`);
      }
    })
    .catch((err) => console.error(err));
}, 100);

setInterval(() => {
  console.log(
    `${new Date().toISOString()}: Memory used: ${(
      process.memoryUsage().heapUsed /
      1024 /
      1024
    ).toFixed(2)}MB, connections: ${connections}`
  );
}, 60000);

export default {
  fetch: app.fetch,
  idleTimeout: 0,
};
