/**
 * ConversationMemoryStore
 *
 * A dedicated vector store for conversation memory, completely isolated from
 * the knowledge/document collection. Wraps a ChromaVectorStore instance that
 * was initialised with its own Chroma collection (e.g. "conversation-memory").
 *
 * Key invariant: every search() call is automatically scoped to a single
 * conversationId. Callers never construct ChromaDB `where` clauses directly.
 *
 * The underlying ChromaVectorStore can be swapped for any other implementation
 * without changing this class or any higher-level service.
 */
class ConversationMemoryStore {
  #vectorStore;

  constructor({ vectorStore }) {
    this.#vectorStore = vectorStore;
  }

  /**
   * Stores embedded conversation turns or summaries.
   * Delegates directly to the underlying vector store.
   *
   * @param {Array<{ id: string, text: string, embedding: number[], metadata: object }>} vectors
   */
  async add(vectors) {
    return this.#vectorStore.add(vectors);
  }

  /**
   * Searches for conversation turns/summaries semantically similar to the
   * query embedding, always filtered to a single conversationId.
   *
   * @param {object}   params
   * @param {number[]} params.queryEmbedding
   * @param {number}   params.topK
   * @param {string}   params.conversationId - Required. Results are strictly
   *   scoped to this conversation. Results from other conversations are never
   *   returned.
   * @returns {Promise<Array<{ id: string, text: string, metadata: object }>>}
   */
  async search({ queryEmbedding, topK, conversationId }) {
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('conversationId is required for conversation memory search.');
    }

    return this.#vectorStore.search({
      queryEmbedding,
      topK,
      where: { conversationId: { $eq: conversationId } },
    });
  }
}

export default ConversationMemoryStore;
