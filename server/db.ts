// Plain SQLite access using Node's built-in `node:sqlite` (Node 22.18+), so no native
// dependency is needed. Server only: importing this from client code fails the build.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA_VERSION = 2;

const g = globalThis as unknown as { __newsrenDb?: DatabaseSync };

export function dbPath(): string {
  return process.env.NEWSREN_DB_PATH?.trim() || path.join(process.cwd(), ".data", "newsren.sqlite");
}

function migrate(db: DatabaseSync) {
  const { user_version } = db.prepare("PRAGMA user_version").get() as { user_version: number };
  if (user_version >= SCHEMA_VERSION) return;
  db.exec(`
    BEGIN;
    -- AI output cache. key = sha256(task, model, prompt version, evidence hash, audience, question).
    CREATE TABLE IF NOT EXISTS ai_cache (
      key TEXT PRIMARY KEY,
      task TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      evidence_hash TEXT NOT NULL,
      audience TEXT,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    -- One row per provider call, for server-side request limits.
    CREATE TABLE IF NOT EXISTS ai_calls (
      ts_ms INTEGER NOT NULL,
      client TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_calls_ts ON ai_calls(ts_ms);
    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      publisher TEXT NOT NULL,
      topic_label TEXT NOT NULL,
      feed_url TEXT NOT NULL,
      homepage_url TEXT NOT NULL,
      category TEXT NOT NULL,
      kind TEXT NOT NULL,
      last_attempt_at TEXT,
      last_success_at TEXT,
      last_error TEXT,
      consecutive_failures INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      canonical_url TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT,
      category TEXT NOT NULL,
      feed_id TEXT NOT NULL REFERENCES feeds(id),
      published_at TEXT,
      first_retrieved_at TEXT NOT NULL,
      last_retrieved_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_articles_feed ON articles(feed_id);
    CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at);
    PRAGMA user_version = ${SCHEMA_VERSION};
    COMMIT;
  `);
}

export function getDb(): DatabaseSync {
  if (g.__newsrenDb) return g.__newsrenDb;
  const file = dbPath();
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
  migrate(db);
  g.__newsrenDb = db;
  return db;
}
