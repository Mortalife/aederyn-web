import { reader } from "../db/reader.js";

export type UserAction = {
  user_id: string;
  x: number;
  y: number;
  resource_id: string;
  inprogress_at: number;
  completed_at: number;
};

const selectUserAction = reader.prepare<[string], UserAction>(
  "SELECT * FROM inprogress WHERE user_id = ?"
);

export const getInProgressAction = (user_id: string) =>
  selectUserAction.get(user_id) ?? null;
