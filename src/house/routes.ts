import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { PubSub, USER_EVENT, UserEvent } from "../sse/pubsub.js";
import { sendHouse } from "../templates/game-update.js";
import { HouseContainer } from "./templates.js";
import { Layout } from "../templates/layout.js";
import { getBaseHouse } from "./index.js";
import { houseTiles, TileType } from "../config/house-tiles.js";

const houseRoutes = new Hono();

let x: number | null = null;
let y: number | null = null;
let houseMap = getBaseHouse();

houseRoutes.get("/", async (c) => {
  return c.html(
    await Layout({
      title: "Aederyn Online - Web",
      description: "Aederyn Online - Web",
      image: "",
      children: HouseContainer(houseMap),
    })
  );
});

houseRoutes.post("/tile/:x/:y", async (c) => {
  const newX = c.req.param("x");
  const newY = c.req.param("y");

  return streamSSE(c, async (stream) => {
    if (!newX || !newY) {
      return;
    }

    x = parseInt(newX);
    y = parseInt(newY);

    PubSub.publish(USER_EVENT, {
      user_id: "house-tile",
    });
  });
});

houseRoutes.post("/tile/:x/:y/:action", async (c) => {
  const newX = c.req.param("x");
  const newY = c.req.param("y");
  const action = c.req.param("action");

  return streamSSE(c, async (stream) => {
    // Shouldn't be the case
    if (!newX || !newY || !action) {
      return;
    }

    // Only perform actions on the tile you've selected
    if (x !== parseInt(newX) || y !== parseInt(newY)) {
      return;
    }

    const tile = houseMap.tiles.find(
      (tile) =>
        tile.position.x === parseInt(newX) && tile.position.y === parseInt(newY)
    );

    // Tile not found
    if (!tile) {
      return;
    }

    const tileAction = tile.type.availableActions.find(
      (tileAction) => tileAction.id === action
    );

    // Action not found
    if (!tileAction) {
      return;
    }

    //TODO: Make sure nothing else is in progress
    if (tileAction.requirements.timeToComplete) {
      tile.actionInProgress = {
        action: tileAction,
        startedAt: Date.now(),
        completesAt: Date.now() + tileAction.requirements.timeToComplete * 1000,
      };
    } else if (tileAction.result.resultingTileId) {
      const newTile = houseTiles[
        tileAction.result.resultingTileId as keyof typeof houseTiles
      ] as TileType | undefined;

      if (newTile) {
        tile.type = structuredClone(newTile);
      }
    }

    PubSub.publish(USER_EVENT, {
      user_id: "house-tile",
    });
  });
});

houseRoutes.get("/feed", async (c) => {
  return streamSSE(
    c,
    async (stream) => {
      const processUserEvent = ({ user_id }: UserEvent) => {
        if (user_id !== "house-tile") {
          return;
        }

        if (x !== null && y !== null) {
          sendHouse(stream, { user_id, tile: { x, y }, houseMap });
        }
      };

      PubSub.subscribe(USER_EVENT, processUserEvent);

      let isAborted = false;

      stream.onAbort(async () => {
        PubSub.off(USER_EVENT, processUserEvent);

        console.log("user offline");
        isAborted = true;
      });

      await sendHouse(stream, { user_id: "", houseMap });

      while (!isAborted) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    },
    async (err) => {
      console.error(err);
    }
  );
});

setInterval(() => {
  const now = Date.now();
  houseMap.tiles.forEach((tile) => {
    if (tile.actionInProgress) {
      if (now >= tile.actionInProgress.completesAt) {
        if (tile.actionInProgress.action.result.resultingTileId) {
          const newTile = houseTiles[
            tile.actionInProgress.action.result
              .resultingTileId as keyof typeof houseTiles
          ] as TileType | undefined;

          if (newTile) {
            tile.type = structuredClone(newTile);
          } else {
            console.log("Tile not found", tile.actionInProgress.action.result);
          }
        }
        tile.actionInProgress = undefined;
        PubSub.publish(USER_EVENT, {
          user_id: "house-tile",
        });
      }
    }
  });
}, 1000);

export { houseRoutes };
