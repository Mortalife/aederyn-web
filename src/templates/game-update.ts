import type { SSEStreamingApi } from "hono/streaming";
import type { GameUser } from "../config.js";
import {
  getOnlineStatus,
  getOnlineUsersCount,
  type UserOnlineStatus,
} from "../social/active.js";
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
import { getSystemMessages, type SystemMessage } from "../user/system.js";
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
    isMobile,
  }: {
    user_id: string;
    status?: UserOnlineStatus;
    user?: GameUser;
    map?: WorldTile[];
    chatMessages?: ChatMessage[];
    isMobile?: boolean;
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
  const totalPlayersOnline = await getOnlineUsersCount();

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

  // Pre-compute contextual flashes map to avoid filtering on every render
  // Keys are either "action_type" or "action_type:action_id"
  const contextFlashes = new Map<string, SystemMessage>();
  const now = Date.now();
  for (const msg of messages) {
    if (msg.action_type && msg.sent_at > now - 5000) {
      // Store by action_type:action_id if action_id exists
      if (msg.action_id) {
        const key = `${msg.action_type}:${msg.action_id}`;
        if (!contextFlashes.has(key)) {
          contextFlashes.set(key, msg);
        }
      }
      // Also store by action_type alone (first one wins)
      if (!contextFlashes.has(msg.action_type)) {
        contextFlashes.set(msg.action_type, msg);
      }
    }
  }

  // Pre-compute resource objectives map to avoid looping on every render
  const resourceObjectives = new Set<string>();
  for (const quest of quests.inProgressQuests) {
    if (
      quest.currentObjective &&
      (quest.currentObjective.type === "gather" ||
        quest.currentObjective.type === "craft") &&
      quest.currentObjective.resource_id
    ) {
      resourceObjectives.add(quest.currentObjective.resource_id);
    }
  }

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
    isMobile,
    resourceObjectives,
    contextFlashes,
    totalPlayersOnline,
  });

  if (start % 4 === 0) {
    console.log(
      `Game state generated in ${Date.now() - start}ms (shown 1 in 4)`
    );
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
