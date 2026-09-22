import { writer } from "../../db/writer.js";
import { chatPosted } from "../changes.js";

const insertMessage = writer.prepare<[string, string, number]>(
  "INSERT INTO messages (id, user_id, message, sent_at) VALUES (null, ?, ?, ?)"
);

export const saveMessage = (user_id: string, message: string, now: number) => {
  insertMessage.run(user_id, message, now);
  chatPosted();
};
