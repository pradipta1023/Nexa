/**
 * ConversationRetriever
 *
 * Responsible for finding relevant past conversation turns and summaries
 * given a user's new question.
 *
 * This mirrors the structure of the document Retriever but targets
 * the conversation memory store and requires a conversationId.
 */
class ConversationRetriever {
  #embeddingService;
  #conversationMemoryStore;

  constructor({ embeddingService, conversationMemoryStore }) {
    this.#embeddingService = embeddingService;
    this.#conversationMemoryStore = conversationMemoryStore;
  }

  /**
   * Retrieves relevant conversation context for a question.
   *
   * @param {string} question
   * @param {string} conversationId - Required
   * @param {object} [options]
   * @param {number} [options.topK=5]
   * @returns {Promise<Array<{ id: string, text: string, metadata: object }>>}
   */
  async retrieve(question, conversationId, { topK = 5 } = {}) {
    if (typeof question !== "string") {
      throw new Error("Question must be a string");
    }

    if (!question || question.trim().length === 0) {
      throw new Error("Question must be provided for getting answer");
    }

    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error("conversationId must be a non-empty string");
    }

    const queryEmbedding = await this.#embeddingService.embed(question);

    return this.#conversationMemoryStore.search({
      queryEmbedding,
      topK,
      where: { conversationId: { $eq: conversationId } }
    });
  }
}

export default ConversationRetriever;
