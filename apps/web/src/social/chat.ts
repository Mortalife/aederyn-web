import { reader } from "../db/reader.js";

/**
 * 
"CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, user_id TEXT, message TEXT, sent_at INT)",
 */

export type ChatMessage = {
  id: number;
  user_id: string;
  message: string;
  sent_at: number;
};

export const MAX_CHAT_MESSAGE_LENGTH = 100;

const selectMessagesSince = reader.prepare<[number], ChatMessage>(
  "SELECT * FROM messages WHERE sent_at > ? ORDER BY sent_at DESC"
);

export const getMessages = (since: number) =>
  selectMessagesSince.all(since);

export const calculateMessageHistory = (online_at: number) =>
  online_at - 60 * 60 * 1000;

export const restrictUserId = (user_id: string) => {
  return user_id.slice(0, 8);
};
