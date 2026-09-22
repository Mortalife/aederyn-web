/**
 * In-memory version counters. Commands and systems bump them (through
 * `changes.ts`) for whatever they change, so renders can be memoized by
 * version. They start from zero on each boot, which is fine: nothing
 * outside this process caches by them.
 */
const users = new Map<string, number>();
const zones = new Map<string, number>();
let chat = 0;
let quests = 0;
let online = 0;

const zoneKey = (x: number, y: number) => `${x},${y}`;

export const bumpUser = (user_id: string) => {
  users.set(user_id, (users.get(user_id) ?? 0) + 1);
};

export const bumpZone = (x: number, y: number) => {
  const key = zoneKey(x, y);
  zones.set(key, (zones.get(key) ?? 0) + 1);
};

export const bumpChat = () => {
  chat++;
};

/** The active quests: bumped when quests rotate. */
export const bumpQuests = () => {
  quests++;
};

/** Who is online: bumped when a player connects or disconnects. */
export const bumpOnline = () => {
  online++;
};

export const userVersion = (user_id: string) => users.get(user_id) ?? 0;

export const zoneVersion = (x: number, y: number) =>
  zones.get(zoneKey(x, y)) ?? 0;

export const chatVersion = () => chat;

export const questsVersion = () => quests;

export const onlineVersion = () => online;
