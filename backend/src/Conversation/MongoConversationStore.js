import { v4 as uuidv4 } from 'uuid';

/**
 * MongoDB Atlas implementation of the conversation store.
 *
 * Accepts an injected MongoDatabase instance so the entire
 * application shares a single connection.
 */
class MongoConversationStore {
  #db;

  constructor(db) {
    if (!db) throw new Error('MongoConversationStore requires a db instance.');
    this.#db = db;
  }

  /**
   * Creates a new conversation and stores it.
   * If a conversation with the given id already exists it is left untouched.
   * @param {string} conversationId
   * @returns {Promise<object>} The conversation
   */
  async createConversation(conversationId) {
    this.#validateConversationId(conversationId);

    const exists = await this.exists(conversationId);
    if (!exists) {
      await this.#insertNewConversation(conversationId);
    }

    return this.getConversation(conversationId);
  }

  /**
   * Returns the conversation for the given id, or null if it does not exist.
   * @param {string} conversationId
   * @returns {Promise<object|null>}
   */
  async getConversation(conversationId) {
    const convRow = await this.#db.conversations.findOne({ _id: conversationId });
    if (!convRow) return null;

    const turnsRows = await this.#fetchTurns(conversationId);
    return this.#mapToConversation(convRow, turnsRows);
  }

  /**
   * Returns true if a conversation with the given id exists.
   * @param {string} conversationId
   * @returns {Promise<boolean>}
   */
  async exists(conversationId) {
    const row = await this.#db.conversations.findOne(
      { _id: conversationId },
      { projection: { _id: 1 } }
    );
    return Boolean(row);
  }

  /**
   * Appends a new turn to the conversation and increments the version.
   * @param {string} conversationId
   * @param {{ userMessage: string, assistantResponse: string, tokenCount: number }} turnData
   * @returns {Promise<object>} The newly created turn
   */
  async addTurn(conversationId, turnData) {
    await this.#ensureConversationExists(conversationId);
    this.#validateTurnData(turnData);

    const turn = this.#prepareTurn(conversationId, turnData);
    await this.#commitTurnWithTransaction(conversationId, turn);

    return this.#mapTurnResponse(turn);
  }

  /**
   * Applies a summary that compresses a specific set of turns.
   * @param {string} conversationId
   * @param {{ text: string, tokenCount: number }} summary
   * @param {string[]} summarizedTurnIds - Exact turnIds the summarizer processed
   * @returns {Promise<boolean>} Always true
   */
  async updateSummary(conversationId, summary, summarizedTurnIds) {
    await this.#ensureConversationExists(conversationId);
    this.#validateSummaryData(summary, summarizedTurnIds);

    await this.#commitSummaryWithTransaction(conversationId, summary, summarizedTurnIds);
    return true;
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  #validateConversationId(conversationId) {
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('conversationId must be a non-empty string.');
    }
  }

  #validateTurnData({ userMessage, assistantResponse, tokenCount }) {
    if (typeof userMessage !== 'string' || !userMessage.trim())
      throw new Error('userMessage must be a non-empty string.');
    if (typeof assistantResponse !== 'string' || !assistantResponse.trim())
      throw new Error('assistantResponse must be a non-empty string.');
    if (typeof tokenCount !== 'number' || tokenCount < 0)
      throw new Error('tokenCount must be a non-negative number.');
  }

  #validateSummaryData(summary, summarizedTurnIds) {
    if (!Array.isArray(summarizedTurnIds) || summarizedTurnIds.length === 0)
      throw new Error('summarizedTurnIds must be a non-empty array.');
    if (!summary || typeof summary.text !== 'string')
      throw new Error('summary.text must be a string.');
    if (typeof summary.tokenCount !== 'number')
      throw new Error('summary.tokenCount must be a number.');
  }

  async #ensureConversationExists(conversationId) {
    if (!(await this.exists(conversationId))) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
  }

  async #insertNewConversation(conversationId) {
    const now = new Date();
    await this.#db.conversations.insertOne({
      _id: conversationId,
      version: 0,
      totalTokens: 0,
      createdAt: now,
      updatedAt: now,
      summaryText: null,
      summaryTokens: null
    });
  }

  async #fetchTurns(conversationId) {
    return this.#db.turns
      .find({ conversationId })
      .sort({ timestamp: 1 })
      .toArray();
  }

  #mapToConversation(convRow, turnsRows) {
    return {
      conversationId: convRow._id,
      summary: convRow.summaryText !== null
        ? { text: convRow.summaryText, tokenCount: convRow.summaryTokens }
        : null,
      version: convRow.version,
      totalTokens: convRow.totalTokens,
      createdAt: convRow.createdAt.toISOString(),
      updatedAt: convRow.updatedAt.toISOString(),
      turns: turnsRows.map(turn => this.#mapTurnResponse(turn))
    };
  }

  #prepareTurn(conversationId, { userMessage, assistantResponse, tokenCount }) {
    return {
      _id: uuidv4(),
      conversationId,
      userMessage,
      assistantResponse,
      tokenCount,
      timestamp: new Date()
    };
  }

  #mapTurnResponse(turn) {
    return {
      turnId: turn._id,
      userMessage: turn.userMessage,
      assistantResponse: turn.assistantResponse,
      tokenCount: turn.tokenCount,
      timestamp: turn.timestamp.toISOString()
    };
  }

  async #commitTurnWithTransaction(conversationId, turn) {
    const session = this.#db.client.startSession();
    try {
      await session.withTransaction(async () => {
        await this.#db.turns.insertOne(turn, { session });
        await this.#db.conversations.updateOne(
          { _id: conversationId },
          {
            $inc: { version: 1, totalTokens: turn.tokenCount },
            $set: { updatedAt: turn.timestamp },
          },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }
  }

  async #commitSummaryWithTransaction(conversationId, summary, summarizedTurnIds) {
    const session = this.#db.client.startSession();
    try {
      await session.withTransaction(async () => {
        const tokensRemoved = await this.#calculateTokensToRemove(
          conversationId, 
          summarizedTurnIds, 
          session
        );

        await this.#db.turns.deleteMany(
          { conversationId, _id: { $in: summarizedTurnIds } },
          { session }
        );

        await this.#updateConversationSummary(
          conversationId, 
          summary, 
          tokensRemoved, 
          session
        );
      });
    } finally {
      await session.endSession();
    }
  }

  async #calculateTokensToRemove(conversationId, summarizedTurnIds, session) {
    const turnsToRemove = await this.#db.turns
      .find(
        { conversationId, _id: { $in: summarizedTurnIds } },
        { session, projection: { tokenCount: 1 } }
      )
      .toArray();

    return turnsToRemove.reduce((sum, turn) => sum + turn.tokenCount, 0);
  }

  async #updateConversationSummary(conversationId, summary, tokensRemoved, session) {
    await this.#db.conversations.updateOne(
      { _id: conversationId },
      {
        $set: {
          summaryText: summary.text,
          summaryTokens: summary.tokenCount,
          updatedAt: new Date(),
        },
        $inc: { totalTokens: summary.tokenCount - tokensRemoved },
      },
      { session }
    );
  }
}

export default MongoConversationStore;
