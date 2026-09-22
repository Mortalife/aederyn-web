import { writer } from "../../db/writer.js";
import type {
  SystemMessageContext,
  SystemMessageType,
} from "../../user/system.js";
import { userChanged } from "../changes.js";

const insertSystemMessage = writer.prepare<
  [
    string,
    string,
    string,
    number,
    string | null,
    string | null,
    number | null,
    number | null
  ]
>(
  "INSERT INTO system_messages (id, user_id, message, type, sent_at, action_type, action_id, location_x, location_y) VALUES (null, ?, ?, ?, ?, ?, ?, ?, ?)"
);
const deleteSystemMessage = writer.prepare<[string, string]>(
  "DELETE FROM system_messages WHERE user_id = ? AND id = ?"
);
const deleteUserSystemMessages = writer.prepare<[string]>(
  "DELETE FROM system_messages WHERE user_id = ?"
);
const trimSystemMessages = writer.prepare(`
  DELETE FROM system_messages
  WHERE id NOT IN (
    SELECT id
    FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY sent_at DESC) AS row_num
      FROM system_messages
    ) AS sub
    WHERE row_num <= 20
  )
`);

export const addSystemMessage = (
  user_id: string,
  message: string,
  type: SystemMessageType,
  now: number,
  context?: SystemMessageContext
) => {
  insertSystemMessage.run(
    user_id,
    message,
    type,
    now,
    context?.action_type ?? null,
    context?.action_id ?? null,
    context?.location_x ?? null,
    context?.location_y ?? null
  );
  userChanged(user_id);
};

export const removeSystemMessage = (user_id: string, id: string) => {
  deleteSystemMessage.run(user_id, id);
  userChanged(user_id);
};

export const clearAllUserSystemMessages = (user_id: string) => {
  deleteUserSystemMessages.run(user_id);
  userChanged(user_id);
};

export const cleanupSystemMessages = () => {
  trimSystemMessages.run();
};
