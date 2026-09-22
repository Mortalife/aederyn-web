import { reader } from "../db/reader.js";

export type SystemMessageActionType =
  | "resource"
  | "quest"
  | "inventory"
  | "combat"
  | "zone"
  | "system";

export type SystemMessageContext = {
  action_type?: SystemMessageActionType;
  action_id?: string;
  location_x?: number;
  location_y?: number;
};

export type SystemMessageType = "info" | "error" | "success" | "warning";

export type SystemMessage = {
  id: string;
  user_id: string;
  message: string;
  type: string;
  sent_at: number;
  action_type?: SystemMessageActionType;
  action_id?: string;
  location_x?: number;
  location_y?: number;
};

const selectSystemMessages = reader.prepare<[string], SystemMessage>(
  "SELECT * FROM system_messages WHERE user_id = ? ORDER BY sent_at DESC"
);

export const getSystemMessages = (user_id: string) =>
  selectSystemMessages.all(user_id);
