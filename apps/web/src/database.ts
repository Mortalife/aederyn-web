import { createClient } from "@libsql/client";
import { QuestProgressManager } from "./user/quest-progress-manager.js";
import { QuestManager } from "./user/quest-generator.js";
import { isProduction } from "./lib/runtime.js";

export const client = createClient({
  url: `file:${process.env["DATABASE_PATH"] ?? ""}local.db`,
});

await client.execute("PRAGMA journal_mode = WAL;");
await client.execute("PRAGMA busy_timeout = 5000;");
await client.execute("PRAGMA synchronous = NORMAL;");
await client.execute("PRAGMA cache_size = 2000;");
await client.execute("PRAGMA foreign_keys = ON;");

await client.migrate([
  "CREATE TABLE IF NOT EXISTS users (id TEXT, data TEXT, PRIMARY KEY (id))",
  "DROP TABLE IF EXISTS resource_usage",
  "CREATE TABLE IF NOT EXISTS resource_usage (x INT, y INT, resource_id TEXT, qty INT, refresh_at INT, interval INT, PRIMARY KEY (x, y, resource_id))",
  "CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, user_id TEXT, message TEXT, sent_at INT)",
  "CREATE TABLE IF NOT EXISTS online (user_id TEXT PRIMARY KEY, online_at INT)",
  "DROP TABLE IF EXISTS inprogress",
  "CREATE TABLE IF NOT EXISTS inprogress (user_id TEXT PRIMARY KEY,x INT, y INT, resource_id TEXT, inprogress_at INT, completed_at INT)",
  "CREATE TABLE IF NOT EXISTS zone_users (user_id T,x INT, y INT, entered_at INT, PRIMARY KEY (user_id, x, y), UNIQUE(user_id))",
  "DROP TABLE IF EXISTS system_messages",
  "CREATE TABLE IF NOT EXISTS system_messages (id INTEGER PRIMARY KEY, user_id TEXT, message TEXT,type TEXT, action_type TEXT, action_id TEXT, location_x INT, location_y INT, sent_at INT)",
  ...QuestProgressManager.migrations(),
  ...QuestManager.migrations(),
]);

//  await client.execute("DROP TABLE IF EXISTS online");
if (!isProduction()) {
  console.log((await client.execute("SELECT * FROM users")).toJSON());
} else {
  console.log(
    (await client.execute("SELECT count(*) as c FROM users")).rows[0]!["c"]
  );
}
