import { getOnlineStatus, getOnlineUsersCount } from "../../social/active.js";
import {
  calculateMessageHistory,
  getMessages,
  type ChatMessage,
} from "../../social/chat.js";
import { getInProgressAction } from "../../user/action.js";
import { questProgressManager } from "../../user/quest-progress-manager.js";
import { getSystemMessages } from "../../user/system.js";
import { getPopulatedUser } from "../../user/user.js";
import { getZoneUsers } from "../../user/zone.js";
import type { OtherUser } from "../../config.js";
import { getResourceUsageInArea } from "../../world/resources.js";
import { visibleArea } from "../../world/index.js";
import { chatVersion, onlineVersion, zoneVersion } from "../versions.js";

/**
 * Reads shared by many screens are cached by the version of what they read,
 * so a zone change or a chat message is read once, not once per connection.
 * Only this process writes the game database, so a version that hasn't
 * moved means the rows haven't either.
 */
const zoneUsers = new Map<string, { version: number; users: OtherUser[] }>();

const loadZoneUsers = (x: number, y: number) => {
  const key = `${x},${y}`;
  const version = zoneVersion(x, y);
  const cached = zoneUsers.get(key);

  if (cached?.version === version) {
    return cached.users;
  }

  const users = getZoneUsers(x, y);
  zoneUsers.set(key, { version, users });
  return users;
};

let chat: { version: number; since: number; messages: ChatMessage[] } | null =
  null;

/** Messages newer than `since`, newest first. */
const loadChat = (since: number) => {
  const version = chatVersion();

  // A cached read that reaches further back covers this one too.
  if (!chat || chat.version !== version || since < chat.since) {
    chat = { version, since, messages: getMessages(since) };
  }

  return since === chat.since
    ? chat.messages
    : chat.messages.filter((message) => message.sent_at > since);
};

let onlineCount: { version: number; count: number } | null = null;

const loadOnlineCount = () => {
  const version = onlineVersion();

  if (onlineCount?.version !== version) {
    onlineCount = { version, count: getOnlineUsersCount() };
  }

  return onlineCount.count;
};

/**
 * Everything a player's screen needs, read from the reader connection in
 * one synchronous pass. Each table is read once; everything derived from
 * it is left to the pure selectors in `select.ts`.
 */
export const loadView = (userId: string, now: number) => {
  const user = getPopulatedUser(userId);

  if (!user) {
    return null;
  }

  const onlineAt = getOnlineStatus(userId)?.online_at ?? now;

  return {
    user,
    chatMessages: loadChat(calculateMessageHistory(onlineAt)),
    resourceUsage: getResourceUsageInArea(visibleArea(user.p)),
    /** Everyone in the player's zone, the player included. */
    zoneUsers: user.z ? loadZoneUsers(user.p.x, user.p.y) : [],
    messages: getSystemMessages(user.id),
    totalPlayersOnline: loadOnlineCount(),
    inprogress: getInProgressAction(user.id),
    activeQuests: questProgressManager.getActiveQuests(now),
    questState: questProgressManager.getUserQuestState(user.id),
  };
};

export type ViewInput = NonNullable<ReturnType<typeof loadView>>;
