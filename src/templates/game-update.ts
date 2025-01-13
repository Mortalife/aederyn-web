import type { SSEStreamingApi } from "hono/streaming";
import type { GameUser } from "../config";
import { getOnlineStatus, type UserOnlineStatus } from "../social/active";
import {
  calculateMessageHistory,
  getMessages,
  type ChatMessage,
} from "../social/chat";
import { getPopulatedUser } from "../user/user";
import { generateMap, type WorldTile } from "../world";
import { Game, GameLogin } from "./game";
import { fragmentEvent } from "../sse";
import { getInProgressAction } from "../user/action";
import { getZoneUsers } from "../user/zone";
import { getSystemMessages } from "../user/system";
import { questProgressManager } from "../user/quest-progress-manager";
import { questManager } from "../user/quest-generator";

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

  console.log(`Game state generated in ${Date.now() - start}ms`);
  return stream.writeSSE(fragmentEvent(game, id));
};

export const sendUserNotFound = async (
  stream: SSEStreamingApi,
  user_id: string,
  id: number = 1
) =>
  stream.writeSSE(
    fragmentEvent(
      GameLogin({
        user_id,
        error: "User not found",
      }),
      id
    )
  );
