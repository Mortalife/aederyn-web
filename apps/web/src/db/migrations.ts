import type { Database } from "better-sqlite3";

/**
 * Append-only. Each entry is one migration; `PRAGMA user_version` records how
 * many have run. Never edit or reorder an entry once it has shipped.
 *
 * Migration 1 is the schema that `client.migrate` re-ran on every boot under
 * libsql. Its DROPs reset the runtime tables once when this runner first sees
 * an existing database, the same as a restart used to.
 */
const migrations: string[][] = [
  [
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
    // Previously QuestProgressManager.migrations()
    `CREATE TABLE IF NOT EXISTS quest_progress (
      user_id TEXT NOT NULL,
      quest_id TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER,
      completed_at INTEGER,
      PRIMARY KEY (user_id, quest_id)
      FOREIGN KEY (quest_id)
        REFERENCES quests(quest_id)
        ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS objective_progress (
      user_id TEXT NOT NULL,
      quest_id TEXT NOT NULL,
      objective_id TEXT NOT NULL,
      current INTEGER NOT NULL DEFAULT 0,
      required INTEGER NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT 0,
      updated_at INTEGER,
      completed_at INTEGER,
      PRIMARY KEY (user_id, quest_id, objective_id),
      FOREIGN KEY (user_id, quest_id)
        REFERENCES quest_progress(user_id, quest_id)
        ON DELETE CASCADE
    )`,
    "CREATE INDEX IF NOT EXISTS idx_quest_progress_user ON quest_progress(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_objective_progress_user ON objective_progress(user_id)",
    // Previously QuestManager.migrations()
    "DROP TABLE IF EXISTS quests_templates",
    `CREATE TABLE IF NOT EXISTS quests (
      quest_id TEXT NOT NULL,
      version INT NOT NULL,
      startX INT NOT NULL,
      startY INT NOT NULL,
      endX INT NOT NULL,
      endY INT NOT NULL,
      starts_at INT NOT NULL,
      ends_at INT NOT NULL,
      data TEXT NOT NULL,
      PRIMARY KEY (quest_id)
    )`,
  ],
];

export const runMigrations = (db: Database, list: string[][] = migrations) => {
  const current = db.pragma("user_version", { simple: true }) as number;

  for (let version = current; version < list.length; version++) {
    db.transaction(() => {
      for (const sql of list[version]!) {
        db.exec(sql);
      }
      db.pragma(`user_version = ${version + 1}`);
    })();
    console.log(`Migrated database to version ${version + 1}`);
  }
};
