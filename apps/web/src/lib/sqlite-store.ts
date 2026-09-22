import type { Store, SessionData } from "hono-sessions";
import Database from "better-sqlite3";
import { env } from "./env.js";
import { runMigrations } from "../db/migrations.js";

// Sessions live in their own file and are written from request handlers.
// They aren't game state, so they sit outside the game loop's single writer.
const db = new Database(`${env.DATABASE_PATH}local.sessions.db`);

db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
db.pragma("synchronous = NORMAL");
db.pragma("cache_size = 2000");
db.pragma("foreign_keys = ON");

runMigrations(db, [
  ["CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, data TEXT)"],
]);

const getSession = db.prepare<[string], { data: string }>(
  "SELECT data FROM sessions WHERE id = ?"
);
const upsertSession = db.prepare<[string, string]>(
  "INSERT INTO sessions (id, data) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET data = excluded.data"
);
const deleteSession = db.prepare<[string]>(
  "DELETE FROM sessions WHERE id = ?"
);

class SqliteStore implements Store {
  async getSessionById(sessionId: string): Promise<SessionData | null> {
    const session = getSession.get(sessionId);

    return session?.data ? JSON.parse(session.data) : null;
  }

  async createSession(sessionId: string, initialData: SessionData) {
    upsertSession.run(sessionId, JSON.stringify(initialData));
  }

  async persistSessionData(sessionId: string, sessionData: SessionData) {
    upsertSession.run(sessionId, JSON.stringify(sessionData));
  }

  async deleteSession(sessionId: string) {
    deleteSession.run(sessionId);
  }
}

export const sessionStore = new SqliteStore();
