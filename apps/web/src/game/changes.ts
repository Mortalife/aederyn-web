import {
  bumpChat,
  bumpDiscoveries,
  bumpOnline,
  bumpQuests,
  bumpUser,
  bumpZone,
} from "./versions.js";

/**
 * What commands and systems call when they change something a screen shows.
 * Each change bumps a version counter, and after the tick commits the loop
 * re-renders the connections whose versions moved (`connections.ts`).
 */
export const userChanged = (user_id: string) => {
  bumpUser(user_id);
};

/** The user found something new. What shows it redraws; the rest stays. */
export const discovered = (user_id: string) => {
  bumpDiscoveries(user_id);
};

export const zoneChanged = (x: number, y: number) => {
  bumpZone(x, y);
};

export const chatPosted = () => {
  bumpChat();
};

/** Someone came online or went offline: the online count changed. */
export const onlineChanged = () => {
  bumpOnline();
};

/** The active quests changed, which can affect every player's screen. */
export const questsChanged = () => {
  bumpQuests();
};
