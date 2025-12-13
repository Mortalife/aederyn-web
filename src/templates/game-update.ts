import type { SSEStreamingApi } from "hono/streaming";
import type { GameUser } from "../config.js";
import { getOnlineStatus, type UserOnlineStatus } from "../social/active.js";
import {
  calculateMessageHistory,
  getMessages,
  type ChatMessage,
} from "../social/chat.js";
import { getPopulatedUser } from "../user/user.js";
import { generateMap, type WorldTile } from "../world/index.js";
import { Game, GameLogin } from "./game.js";
import { fragmentEvent } from "../sse/index.js";
import { getInProgressAction } from "../user/action.js";
import { getZoneUsers } from "../user/zone.js";
import { getSystemMessages } from "../user/system.js";
import { questProgressManager } from "../user/quest-progress-manager.js";
import { questManager } from "../user/quest-generator.js";
import { HouseMap } from "../config/house-tiles.js";
import { House } from "../house/templates.js";
import { getBaseHouse } from "../house/index.js";

export const sendGame = async (
  stream: SSEStreamingApi,
  {
    user_id,
    status,
    user,
    map,
    chatMessages,
  }: {
    user_id: string;
    status?: UserOnlineStatus;
    user?: GameUser;
    map?: WorldTile[];
    chatMessages?: ChatMessage[];
  },
  id: number = 1
) => {
  let start = Date.now();
  if (!user) {
    const tempUser = await getPopulatedUser(user_id);

    if (!tempUser) {
      return GameLogin({ user_id, error: "User not found" });
    }

    user = tempUser;
  }

  if (!chatMessages) {
    if (!status) {
      const tempStatus = await getOnlineStatus(user_id);

      if (!tempStatus) {
        status = {
          online_at: Date.now(),
          user_id: user_id,
        };
      } else {
        status = tempStatus!;
      }
    }
    chatMessages = await getMessages(calculateMessageHistory(status.online_at));
  }

  if (!map) {
    map = await generateMap(user.p);
  }

  const players = await getZoneUsers(user.id, user.p.x, user.p.y);
  const messages = await getSystemMessages(user.id);

  const quests = await questProgressManager.getZoneQuestsForUser(
    user.id,
    user.p.x,
    user.p.y,
    questManager
  );
  const mapIndicators = await questProgressManager.getMapIndicatorsForUser(
    user.id,
    map
  );
  const npcInteractions =
    await questProgressManager.getZoneNPCInteractionsForUser(
      user.id,
      user.p.x,
      user.p.y
    );

  const inprogress = await getInProgressAction(user_id);
  const game = Game({
    map,
    mapIndicators,
    user,
    messages,
    inprogress: inprogress ?? undefined,
    players,
    chatMessages,
    quests,
    npcInteractions,
  });

  if (start % 4 === 0) {
    console.log(`Game state generated in ${Date.now() - start}ms`);
  }

  return stream.writeSSE(fragmentEvent(game));
};

export const sendUserNotFound = async (
  stream: SSEStreamingApi,
  user_id: string
) =>
  stream.writeSSE(
    fragmentEvent(
      GameLogin({
        user_id,
        error: "User not found",
      })
    )
  );

export const sendHouse = async (
  stream: SSEStreamingApi,
  {
    user_id,
    tile,
    houseMap,
  }: {
    user_id: string;
    tile?: { x: number; y: number };
    houseMap?: HouseMap;
  }
) => {
  let start = Date.now();

  if (start % 4 === 0) {
    console.log(`Game state generated in ${Date.now() - start}ms`);
  }

  if (!houseMap) {
    houseMap = getBaseHouse();
  }

  return stream.writeSSE(fragmentEvent(House(houseMap, tile)));
};
