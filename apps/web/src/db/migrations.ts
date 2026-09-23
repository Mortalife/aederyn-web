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
  // Combat
  [
    // Only monsters that differ from "alive at full HP" have a row, as with
    // resource_usage. `hp` is current HP while alive; `respawn_at` is set
    // while dead, and the row goes when it respawns.
    `CREATE TABLE monster_state (
      x INT, y INT, monster_id TEXT,
      hp INT,
      respawn_at INT,
      PRIMARY KEY (x, y, monster_id)
    )`,
    // One fight per player, and one fighter per monster for now.
    `CREATE TABLE combat (
      user_id TEXT PRIMARY KEY,
      x INT, y INT, monster_id TEXT,
      started_at INT,
      next_player_at INT,
      next_monster_at INT,
      UNIQUE (x, y, monster_id)
    )`,
  ],
  [
    `CREATE TABLE health_regen (
      user_id TEXT PRIMARY KEY,
      last_at INT NOT NULL,
      at_camp INT NOT NULL
    )`,
  ],
  // The last hit each side landed, so the fight can show it.
  [
    "ALTER TABLE combat ADD COLUMN player_hit INT",
    "ALTER TABLE combat ADD COLUMN player_hit_at INT",
    "ALTER TABLE combat ADD COLUMN monster_hit INT",
    "ALTER TABLE combat ADD COLUMN monster_hit_at INT",
  ],
  // Replaces the last-hit columns, so hits outlive the fight that dealt them.
  [
    "ALTER TABLE combat DROP COLUMN player_hit",
    "ALTER TABLE combat DROP COLUMN player_hit_at",
    "ALTER TABLE combat DROP COLUMN monster_hit",
    "ALTER TABLE combat DROP COLUMN monster_hit_at",
    `CREATE TABLE combat_hits (
      id INTEGER PRIMARY KEY,
      x INT, y INT, monster_id TEXT,
      user_id TEXT,
      by_monster INT NOT NULL,
      damage INT NOT NULL,
      fatal INT NOT NULL,
      at INT NOT NULL
    )`,
    "CREATE INDEX combat_hits_at ON combat_hits (at)",
  ],
  // A tile can list a monster more than once, so rows are keyed by spawn:
  // the monster's index in the tile's list. Only transient fight state is
  // lost by recreating these.
  [
    "DROP TABLE monster_state",
    `CREATE TABLE monster_state (
      x INT, y INT, spawn INT, monster_id TEXT,
      hp INT,
      respawn_at INT,
      PRIMARY KEY (x, y, spawn)
    )`,
    "DROP TABLE combat",
    `CREATE TABLE combat (
      user_id TEXT PRIMARY KEY,
      x INT, y INT, spawn INT, monster_id TEXT,
      started_at INT,
      next_player_at INT,
      next_monster_at INT,
      UNIQUE (x, y, spawn)
    )`,
    "DELETE FROM combat_hits",
    "ALTER TABLE combat_hits ADD COLUMN spawn INT NOT NULL DEFAULT 0",
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
