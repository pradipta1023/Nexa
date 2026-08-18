import { v4 as uuidv4 } from 'uuid';

/**
 * SQLite implementation of the conversation store.
 *
 * Accepts an injected better-sqlite3 Database instance so the entire
 * application shares a single connection (managed by AppDatabase).
 */
class SqliteConversationStore {
  #db;

  /**
   * @param {import('better-sqlite3').Database} db - Shared DB instance from AppDatabase.
   */
  constructor(db) {
    if (!db) throw new Error('SqliteConversationStore requires a db instance.');
    this.#db = db;
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

    const existing = this.#db
      .prepare('SELECT conversation_id FROM conversations WHERE conversation_id = ?')
      .get(conversationId);

    if (!existing) {
      const now = new Date().toISOString();
      this.#db
        .prepare(`
          INSERT INTO conversations (conversation_id, version, total_tokens, created_at, updated_at)
          VALUES (?, 0, 0, ?, ?)
        `)
        .run(conversationId, now, now);
    }

    return this.getConversation(conversationId);
  }

  /**
   * Returns the conversation for the given id, or null if it does not exist.
   * @param {string} conversationId
   * @returns {object|null}
   */
  getConversation(conversationId) {
    const convRow = this.#db
      .prepare('SELECT * FROM conversations WHERE conversation_id = ?')
      .get(conversationId);
    if (!convRow) return null;

    const turnsRows = this.#db
      .prepare('SELECT * FROM turns WHERE conversation_id = ? ORDER BY rowid ASC')
      .all(conversationId);

    return {
      conversationId: convRow.conversation_id,
      summary:
        convRow.summary_text !== null
          ? { text: convRow.summary_text, tokenCount: convRow.summary_tokens }
          : null,
      version: convRow.version,
      totalTokens: convRow.total_tokens,
      createdAt: convRow.created_at,
      updatedAt: convRow.updated_at,
      turns: turnsRows.map(row => ({
        turnId: row.turn_id,
        userMessage: row.user_message,
        assistantResponse: row.assistant_response,
        tokenCount: row.token_count,
        timestamp: row.timestamp,
      })),
    };
  }

  /**
   * Returns true if a conversation with the given id exists.
   * @param {string} conversationId
   * @returns {boolean}
   */
  exists(conversationId) {
    const row = this.#db
      .prepare('SELECT 1 FROM conversations WHERE conversation_id = ?')
      .get(conversationId);
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

    if (typeof userMessage !== 'string' || !userMessage.trim())
      throw new Error('userMessage must be a non-empty string.');
    if (typeof assistantResponse !== 'string' || !assistantResponse.trim())
      throw new Error('assistantResponse must be a non-empty string.');
    if (typeof tokenCount !== 'number' || tokenCount < 0)
      throw new Error('tokenCount must be a non-negative number.');

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

    this.#db.transaction(() => {
      insertTurn.run(turnId, conversationId, userMessage, assistantResponse, tokenCount, timestamp);
      updateConv.run(tokenCount, timestamp, conversationId);
    })();

    return { turnId, userMessage, assistantResponse, tokenCount, timestamp };
  }

  /**
   * Applies a summary that compresses a specific set of turns.
   * @param {string} conversationId
   * @param {{ text: string, tokenCount: number }} summary
   * @param {string[]} summarizedTurnIds - Exact turnIds the summarizer processed
   * @returns {boolean} Always true
   */
  updateSummary(conversationId, summary, summarizedTurnIds) {
    if (!this.exists(conversationId)) throw new Error(`Conversation not found: ${conversationId}`);

    if (!Array.isArray(summarizedTurnIds) || summarizedTurnIds.length === 0)
      throw new Error('summarizedTurnIds must be a non-empty array.');
    if (!summary || typeof summary.text !== 'string')
      throw new Error('summary.text must be a string.');
    if (typeof summary.tokenCount !== 'number')
      throw new Error('summary.tokenCount must be a number.');

    const placeholders = summarizedTurnIds.map(() => '?').join(',');

    const result = this.#db
      .prepare(
        `SELECT SUM(token_count) as total FROM turns
         WHERE conversation_id = ? AND turn_id IN (${placeholders})`
      )
      .get(conversationId, ...summarizedTurnIds);
    const tokensRemoved = result.total || 0;

    const deleteTurns = this.#db.prepare(
      `DELETE FROM turns WHERE conversation_id = ? AND turn_id IN (${placeholders})`
    );

    const updateConv = this.#db.prepare(`
      UPDATE conversations
      SET summary_text = ?, summary_tokens = ?, total_tokens = total_tokens - ? + ?, updated_at = ?
      WHERE conversation_id = ?
    `);

    this.#db.transaction(() => {
      deleteTurns.run(conversationId, ...summarizedTurnIds);
      updateConv.run(
        summary.text,
        summary.tokenCount,
        tokensRemoved,
        summary.tokenCount,
        new Date().toISOString(),
        conversationId
      );
    })();

    return true;
  }
}

export default SqliteConversationStore;
