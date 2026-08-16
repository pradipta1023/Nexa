import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

/**
 * SQLite implementation of the conversation store.
 *
 * Persists data to a local SQLite file while maintaining the exact
 * same synchronous abstraction boundary as InMemoryConversationStore.
 */
class SqliteConversationStore {
  #db;

  constructor(dbPath = 'conversations.sqlite') {
    // Ensure the directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.#db = new Database(dbPath);
    
    // Use WAL mode for better concurrency and performance
    this.#db.pragma('journal_mode = WAL');

    this.#initSchema();
  }

  #initSchema() {
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        conversation_id TEXT PRIMARY KEY,
        summary_text TEXT,
        summary_tokens INTEGER,
        version INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS turns (
        rowid INTEGER PRIMARY KEY AUTOINCREMENT,
        turn_id TEXT UNIQUE NOT NULL,
        conversation_id TEXT NOT NULL,
        user_message TEXT NOT NULL,
        assistant_response TEXT NOT NULL,
        token_count INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
      );
    `);
  }

  /**
   * Creates a new conversation and stores it.
   * If a conversation with the given id already exists it is left untouched.
   * @param {string} conversationId
   * @returns {object} The conversation
   */
  createConversation(conversationId) {
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('conversationId must be a non-empty string.');
    }

    const stmt = this.#db.prepare('SELECT conversation_id FROM conversations WHERE conversation_id = ?');
    const existing = stmt.get(conversationId);

    if (!existing) {
      const now = new Date().toISOString();
      const insert = this.#db.prepare(`
        INSERT INTO conversations (conversation_id, version, total_tokens, created_at, updated_at)
        VALUES (?, 0, 0, ?, ?)
      `);
      insert.run(conversationId, now, now);
    }

    return this.getConversation(conversationId);
  }

  /**
   * Returns the conversation for the given id, or null if it does not exist.
   * @param {string} conversationId
   * @returns {object|null}
   */
  getConversation(conversationId) {
    const convRow = this.#db.prepare('SELECT * FROM conversations WHERE conversation_id = ?').get(conversationId);
    if (!convRow) return null;

    const turnsRows = this.#db.prepare('SELECT * FROM turns WHERE conversation_id = ? ORDER BY rowid ASC').all(conversationId);

    return {
      conversationId: convRow.conversation_id,
      summary: convRow.summary_text !== null ? { text: convRow.summary_text, tokenCount: convRow.summary_tokens } : null,
      version: convRow.version,
      totalTokens: convRow.total_tokens,
      createdAt: convRow.created_at,
      updatedAt: convRow.updated_at,
      turns: turnsRows.map(row => ({
        turnId: row.turn_id,
        userMessage: row.user_message,
        assistantResponse: row.assistant_response,
        tokenCount: row.token_count,
        timestamp: row.timestamp
      }))
    };
  }

  /**
   * Returns true if a conversation with the given id exists.
   * @param {string} conversationId
   * @returns {boolean}
   */
  exists(conversationId) {
    const row = this.#db.prepare('SELECT 1 FROM conversations WHERE conversation_id = ?').get(conversationId);
    return !!row;
  }

  /**
   * Appends a new turn to the conversation and increments the version.
   * @param {string} conversationId
   * @param {{ userMessage: string, assistantResponse: string, tokenCount: number }} turnData
   * @returns {object} The newly created turn
   */
  addTurn(conversationId, { userMessage, assistantResponse, tokenCount }) {
    if (!this.exists(conversationId)) throw new Error(`Conversation not found: ${conversationId}`);

    if (typeof userMessage !== 'string' || !userMessage.trim()) {
      throw new Error('userMessage must be a non-empty string.');
    }
    if (typeof assistantResponse !== 'string' || !assistantResponse.trim()) {
      throw new Error('assistantResponse must be a non-empty string.');
    }
    if (typeof tokenCount !== 'number' || tokenCount < 0) {
      throw new Error('tokenCount must be a non-negative number.');
    }

    const turnId = uuidv4();
    const timestamp = new Date().toISOString();

    const insertTurn = this.#db.prepare(`
      INSERT INTO turns (turn_id, conversation_id, user_message, assistant_response, token_count, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const updateConv = this.#db.prepare(`
      UPDATE conversations 
      SET version = version + 1, total_tokens = total_tokens + ?, updated_at = ?
      WHERE conversation_id = ?
    `);

    const transaction = this.#db.transaction(() => {
      insertTurn.run(turnId, conversationId, userMessage, assistantResponse, tokenCount, timestamp);
      updateConv.run(tokenCount, timestamp, conversationId);
    });

    transaction();

    return {
      turnId,
      userMessage,
      assistantResponse,
      tokenCount,
      timestamp
    };
  }

  /**
   * Applies a summary that compresses a specific set of turns.
   * @param {string} conversationId
   * @param {{ text: string, tokenCount: number }} summary
   * @param {string[]} summarizedTurnIds
   * @returns {boolean}
   */
  updateSummary(conversationId, summary, summarizedTurnIds) {
    if (!this.exists(conversationId)) throw new Error(`Conversation not found: ${conversationId}`);

    if (!Array.isArray(summarizedTurnIds) || summarizedTurnIds.length === 0) {
      throw new Error('summarizedTurnIds must be a non-empty array.');
    }
    if (!summary || typeof summary.text !== 'string') throw new Error('summary.text must be a string.');
    if (typeof summary.tokenCount !== 'number') throw new Error('summary.tokenCount must be a number.');

    // Calculate tokens to remove
    const placeholders = summarizedTurnIds.map(() => '?').join(',');
    const getTokensRemoved = this.#db.prepare(`
      SELECT SUM(token_count) as total FROM turns 
      WHERE conversation_id = ? AND turn_id IN (${placeholders})
    `);
    const result = getTokensRemoved.get(conversationId, ...summarizedTurnIds);
    const tokensRemoved = result.total || 0;

    const deleteTurns = this.#db.prepare(`
      DELETE FROM turns 
      WHERE conversation_id = ? AND turn_id IN (${placeholders})
    `);

    const updateConv = this.#db.prepare(`
      UPDATE conversations 
      SET summary_text = ?, summary_tokens = ?, total_tokens = total_tokens - ? + ?, updated_at = ?
      WHERE conversation_id = ?
    `);

    const transaction = this.#db.transaction(() => {
      deleteTurns.run(conversationId, ...summarizedTurnIds);
      updateConv.run(
        summary.text, summary.tokenCount, 
        tokensRemoved, summary.tokenCount, 
        new Date().toISOString(), 
        conversationId
      );
    });

    transaction();

    return true;
  }
}

export default SqliteConversationStore;
