import { v4 as uuidv4 } from 'uuid';

/**
 * ConversationIndexer
 *
 * Responsible for embedding conversation turns and summaries and storing
 * them in the ConversationMemoryStore so they can participate in
 * semantic conversation retrieval.
 *
 * Reuses the existing embeddingService — no new embedding infrastructure.
 *
 * Metadata stored per entry (minimum required by the spec):
 *   - conversationId
 *   - turnId  (turns only)
 *   - type    ('turn' | 'summary')
 *   - timestamp
 */
class ConversationIndexer {
  #embeddingService;
  #conversationMemoryStore;

  constructor({ embeddingService, conversationMemoryStore }) {
    this.#embeddingService = embeddingService;
    this.#conversationMemoryStore = conversationMemoryStore;
  }

  /**
   * Embeds a conversation turn and stores it in the memory collection.
   *
   * The embedded text combines both sides of the exchange so that
   * semantic search can match on either the user question or the
   * assistant response.
   *
   * @param {object} params
   * @param {string} params.conversationId
   * @param {string} params.turnId        - From ConversationStore.addTurn()
   * @param {string} params.userMessage
   * @param {string} params.assistantResponse
   * @param {string} [params.timestamp]   - ISO string (defaults to now)
   */
  async indexTurn({ conversationId, turnId, userMessage, assistantResponse, timestamp }) {
    if (!conversationId) throw new Error('conversationId is required.');
    if (!turnId) throw new Error('turnId is required.');
    if (!userMessage) throw new Error('userMessage is required.');
    if (!assistantResponse) throw new Error('assistantResponse is required.');

    // Combine both sides so retrieval can match on either question or answer
    const text = `User: ${userMessage}\nAssistant: ${assistantResponse}`;

    const embedding = await this.#embeddingService.embed(text);

    await this.#conversationMemoryStore.add([{
      id: turnId,
      text,
      embedding,
      metadata: {
        conversationId,
        turnId,
        type: 'turn',
        timestamp: timestamp ?? new Date().toISOString(),
      },
    }]);
  }

  /**
   * Embeds a conversation summary and stores it in the memory collection.
   *
   * Summaries participate in semantic retrieval alongside turns, allowing
   * the retriever to surface compressed history when it is relevant.
   *
   * @param {object} params
   * @param {string} params.conversationId
   * @param {string} params.text          - The summary text produced by ConversationSummarizer
   * @param {string} [params.timestamp]   - ISO string (defaults to now)
   */
  async indexSummary({ conversationId, text, timestamp }) {
    if (!conversationId) throw new Error('conversationId is required.');
    if (!text || !text.trim()) throw new Error('summary text is required.');

    const embedding = await this.#embeddingService.embed(text);

    await this.#conversationMemoryStore.add([{
      id: `${conversationId}-summary-${uuidv4()}`,
      text,
      embedding,
      metadata: {
        conversationId,
        type: 'summary',
        timestamp: timestamp ?? new Date().toISOString(),
      },
    }]);
  }
}

export default ConversationIndexer;
