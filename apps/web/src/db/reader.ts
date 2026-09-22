import Database from "better-sqlite3";
// The writer must open first: it creates the file, enables WAL and migrates,
// none of which a read-only connection can do.
import { DATABASE_FILE } from "./writer.js";

/** Read-only connection for handlers and renders. */
export const reader = new Database(DATABASE_FILE, { readonly: true });

reader.pragma("busy_timeout = 5000");
reader.pragma("cache_size = 2000");
