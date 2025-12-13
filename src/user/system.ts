import { client } from "../database.js";
import { PubSub, USER_EVENT } from "../sse/pubsub.js";

export type SystemMessage = {
  id: string;
  user_id: string;
  message: string;
  type: string;
  sent_at: number;
};

export const addSystemMessage = async (
  user_id: string,
  message: string,
  type: "info" | "error" | "success" | "warning"
) => {
  await client.execute({
    sql: "INSERT INTO system_messages (id, user_id, message, type, sent_at) VALUES (null, ?, ?, ?, ?)",
    args: [user_id, message, type, Date.now()],
  });
  PubSub.publish(USER_EVENT, {
    user_id,
  });
};
export const removeSystemMessage = async (user_id: string, id: string) => {
  await client.execute({
    sql: "DELETE FROM system_messages WHERE user_id = ? AND id = ?",
    args: [user_id, id],
  });
  PubSub.publish(USER_EVENT, {
    user_id,
  });
};

export const clearAllUserSystemMessages = async (user_id: string) => {
  await client.execute({
    sql: "DELETE FROM system_messages WHERE user_id = ?",
    args: [user_id],
  });
  PubSub.publish(USER_EVENT, {
    user_id,
  });
};

export const getSystemMessages = async (user_id: string) => {
  const result = await client.execute({
    sql: "SELECT * FROM system_messages WHERE user_id = ? ORDER BY sent_at DESC",
    args: [user_id],
  });
  return result.rows as unknown as SystemMessage[];
};

export const cleanupSystemMessages = async () => {
  await client.execute({
    sql: `
      DELETE FROM system_messages
      WHERE id NOT IN (
        SELECT id
        FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY sent_at DESC) AS row_num
          FROM system_messages
        ) AS sub
        WHERE row_num <= 20
      )
    `,
    args: [],
  });
};
