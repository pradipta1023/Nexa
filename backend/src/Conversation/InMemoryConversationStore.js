import { createConversation, createTurn } from './Conversation.js';

/**
 * In-memory implementation of the conversation store.
 *
 * Designed so that the implementation can be swapped for a persistent
 * database later without changing any higher-level query architecture.
 * All public methods form the intended abstraction boundary.
 */
class InMemoryConversationStore {
  #store;

  constructor() {
    this.#store = new Map();
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

    if (!this.#store.has(conversationId)) {
      this.#store.set(conversationId, createConversation(conversationId));
    }

    return this.#store.get(conversationId);
  }

  /**
   * Returns the conversation for the given id, or null if it does not exist.
   * @param {string} conversationId
   * @returns {object|null}
   */
  getConversation(conversationId) {
    return this.#store.get(conversationId) ?? null;
  }

  /**
   * Returns true if a conversation with the given id exists.
   * @param {string} conversationId
   * @returns {boolean}
   */
  exists(conversationId) {
    return this.#store.has(conversationId);
  }

  /**
   * Appends a new turn to the conversation and increments the version.
   * @param {string} conversationId
   * @param {{ userMessage: string, assistantResponse: string, tokenCount: number }} turnData
   * @returns {object} The newly created turn
   */
  addTurn(conversationId, { userMessage, assistantResponse, tokenCount }) {
    const conversation = this.#store.get(conversationId);
    if (!conversation) throw new Error(`Conversation not found: ${conversationId}`);

    if (typeof userMessage !== 'string' || !userMessage.trim()) {
      throw new Error('userMessage must be a non-empty string.');
    }
    if (typeof assistantResponse !== 'string' || !assistantResponse.trim()) {
      throw new Error('assistantResponse must be a non-empty string.');
    }
    if (typeof tokenCount !== 'number' || tokenCount < 0) {
      throw new Error('tokenCount must be a non-negative number.');
    }

    const turn = createTurn({ userMessage, assistantResponse, tokenCount });

    conversation.turns.push(turn);
    conversation.totalTokens += tokenCount;
    conversation.version += 1;
    conversation.updatedAt = new Date().toISOString();

    return turn;
  }

  /**
   * Applies a summary that compresses a specific set of turns.
   *
   * The turns identified by summarizedTurnIds are removed from the turns
   * array (they are now captured in the summary). Any turns that arrived
   * AFTER the summarizer took its snapshot are preserved untouched.
   *
   * This means a background summarization job can never lose newer turns —
   * it simply compresses the turns it originally snapshotted.
   *
   * @param {string} conversationId
   * @param {{ text: string, tokenCount: number }} summary
   * @param {string[]} summarizedTurnIds - Exact turnIds the summarizer processed
   * @returns {boolean} Always true — the operation always succeeds
   */
  updateSummary(conversationId, summary, summarizedTurnIds) {
    const conversation = this.#store.get(conversationId);
    if (!conversation) throw new Error(`Conversation not found: ${conversationId}`);

    if (!Array.isArray(summarizedTurnIds) || summarizedTurnIds.length === 0) {
      throw new Error('summarizedTurnIds must be a non-empty array.');
    }
    if (!summary || typeof summary.text !== 'string') throw new Error('summary.text must be a string.');
    if (typeof summary.tokenCount !== 'number') throw new Error('summary.tokenCount must be a number.');

    const summarizedSet = new Set(summarizedTurnIds);

    // Subtract tokens of the turns being compressed.
    const tokensRemoved = conversation.turns
      .filter(t => summarizedSet.has(t.turnId))
      .reduce((total, t) => total + t.tokenCount, 0);

    // Remove only the summarized turns; newer turns remain intact.
    conversation.turns = conversation.turns.filter(t => !summarizedSet.has(t.turnId));

    // Adjust total token count: remove compressed turns, add summary cost.
    conversation.totalTokens = conversation.totalTokens - tokensRemoved + summary.tokenCount;

    conversation.summary = { text: summary.text, tokenCount: summary.tokenCount };
    conversation.updatedAt = new Date().toISOString();

    return true;
  }
}

export default InMemoryConversationStore;
