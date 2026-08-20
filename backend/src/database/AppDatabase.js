import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

/**
 * Central database instance for the application.
 *
 * Owns the single better-sqlite3 connection and is responsible for
 * creating all tables across every domain (Conversation, KnowledgeBase,
 * Resource, CleanupJob).  All store classes receive the db instance
 * by injection — they do not open their own connections.
 */
class AppDatabase {
  #db;

  constructor(dbPath) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.#db = new Database(dbPath);
    this.#db.pragma('journal_mode = WAL');
    this.#db.pragma('foreign_keys = ON');

    this.#initSchema();
  }

  /** Returns the raw better-sqlite3 Database instance for injection into stores. */
  get db() {
    return this.#db;
  }

  #initSchema() {
    this.#db.exec(`
      -- ─────────────────────────────────────────────
      -- Conversation domain (existing)
      -- ─────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS conversations (
        conversation_id TEXT PRIMARY KEY,
        summary_text    TEXT,
        summary_tokens  INTEGER,
        version         INTEGER NOT NULL DEFAULT 0,
        total_tokens    INTEGER NOT NULL DEFAULT 0,
        created_at      TEXT    NOT NULL,
        updated_at      TEXT    NOT NULL
      );

      CREATE TABLE IF NOT EXISTS turns (
        rowid               INTEGER PRIMARY KEY AUTOINCREMENT,
        turn_id             TEXT    UNIQUE NOT NULL,
        conversation_id     TEXT    NOT NULL,
        user_message        TEXT    NOT NULL,
        assistant_response  TEXT    NOT NULL,
        token_count         INTEGER NOT NULL,
        timestamp           TEXT    NOT NULL,
        FOREIGN KEY (conversation_id)
          REFERENCES conversations(conversation_id) ON DELETE CASCADE
      );

      -- ─────────────────────────────────────────────
      -- Knowledge Base domain (new)
      -- ─────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS knowledge_bases (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS resources (
        id                TEXT    PRIMARY KEY,
        knowledge_base_id TEXT    NOT NULL,
        name              TEXT    NOT NULL,
        type              TEXT    NOT NULL CHECK(type IN ('text', 'pdf', 'link')),
        status            TEXT    NOT NULL DEFAULT 'pending'
                            CHECK(status IN ('pending', 'processing', 'ready', 'failed')),
        source            TEXT,
        ingestion_version INTEGER NOT NULL DEFAULT 0,
        created_at        TEXT    NOT NULL,
        updated_at        TEXT    NOT NULL,
        FOREIGN KEY (knowledge_base_id)
          REFERENCES knowledge_bases(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_resources_kb_id
        ON resources(knowledge_base_id);

      CREATE INDEX IF NOT EXISTS idx_resources_status
        ON resources(status);

      -- ─────────────────────────────────────────────
      -- Background cleanup domain (new)
      -- ─────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS cleanup_jobs (
        id           TEXT    PRIMARY KEY,
        type         TEXT    NOT NULL,
        payload      TEXT    NOT NULL,   -- JSON blob
        status       TEXT    NOT NULL DEFAULT 'pending'
                       CHECK(status IN ('pending', 'failed')),
        attempts     INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        last_error   TEXT,
        created_at   TEXT    NOT NULL,
        updated_at   TEXT    NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cleanup_jobs_status
        ON cleanup_jobs(status);
    `);
  }
}

export default AppDatabase;
