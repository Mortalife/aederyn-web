import { deepmerge } from "deepmerge-ts";
import { BASE_USER, items, type GameUser, type GameUserModel } from "../config";
import { client } from "../database";
import { PubSub, USER_EVENT } from "../sse/pubsub";

export const getUserSync = async (id: string) => {
  console.log("getUserSync", id);
  if (!id) {
    id = crypto.randomUUID();
    await client.execute({
      sql: "INSERT INTO users (id, data) VALUES (?, ?)",
      args: [id, JSON.stringify({ ...BASE_USER, id })],
    });
  }

  const result = await client.execute({
    sql: "SELECT id, data FROM users WHERE id = ?",
    args: [id],
  });

  if (!result.rows.length) {
    return null;
  }

  const user = result.rows[0];
  const data = JSON.parse(user["data"] as string) as typeof BASE_USER;

  const newUser = deepmerge(BASE_USER, data, {
    id: user["id"],
  });

  await client.execute({
    sql: "UPDATE users SET data = ? WHERE id = ?",
    args: [JSON.stringify(newUser), id],
  });

  return newUser as unknown as GameUserModel;
};

export const saveUser = async (id: string, data: GameUserModel) => {
  await client.execute({
    sql: "UPDATE users SET data = ? WHERE id = ?",
    args: [JSON.stringify(data), id],
  });
  PubSub.publish(USER_EVENT, { user_id: id });
};

export const getUser = async (id: string) => {
  const result = await client.execute({
    sql: "SELECT data FROM users WHERE id = ?",
    args: [id],
  });

  if (!result.rows.length) {
    return null;
  }

  const data = result.rows[0]["data"];
  const user = JSON.parse(data as string);
  return user as GameUserModel;
};

export const getPopulatedUser = async (
  id: string
): Promise<GameUser | null> => {
  const user = await getUser(id);

  if (!user) {
    return null;
  }

  return {
    ...user,
    i: user.i.map((item) => ({
      id: item.id,
      qty: item.qty,
      item: items.find((i) => i.id === item.item_id)!,
    })),
  };
};

export const transformUser = (user: GameUser): GameUserModel => ({
  ...user,
  i: user.i.map((item) => ({
    id: item.id,
    item_id: item.item.id,
    qty: item.qty,
  })),
});
