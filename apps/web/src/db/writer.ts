import Database from "better-sqlite3";
import { env } from "../lib/env.js";
import { runMigrations } from "./migrations.js";
import { isProduction } from "../lib/runtime.js";

export const DATABASE_FILE = `${env.DATABASE_PATH}local.db`;

/**
 * The only connection allowed to write to the game database. Import it only
 * from `game/`, whose tick is the single writer (see GAME_LOOP.md).
 */
export const writer = new Database(DATABASE_FILE);

writer.pragma("journal_mode = WAL");
writer.pragma("busy_timeout = 5000");
writer.pragma("synchronous = NORMAL");
writer.pragma("cache_size = 2000");
writer.pragma("foreign_keys = ON");

runMigrations(writer);

if (!isProduction()) {
  console.log(writer.prepare("SELECT * FROM users").all());
} else {
  console.log(writer.prepare("SELECT count(*) AS c FROM users").get());
}
