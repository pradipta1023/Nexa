class ChromaVectorStore {
  #collection;
  constructor({ collection }) {
    this.#collection = collection;
  }

  async add(vectors) {
    if (!vectors) throw new Error("Input must be provided to store");

    if (!Array.isArray(vectors)) throw new Error("Input must be an array");

    const ids = [];
    const embeddings = [];
    const documents = [];
    const metadatas = [];
    let hasMetadata = false;

    for (const { id, embedding, text, metadata } of vectors) {
      ids.push(id);
      embeddings.push(embedding);
      documents.push(text);
      if (metadata && Object.keys(metadata).length > 0) {
        hasMetadata = true;
        metadatas.push(metadata);
      } else {
        metadatas.push({ _empty: true });
      }
    }

    const payload = { ids, embeddings, documents };
    if (hasMetadata) {
        payload.metadatas = metadatas;
    }

    await this.#collection.add(payload)
  }

  /**
   * Searches the collection for the most similar vectors.
   *
   * @param {object} params
   * @param {number[]} params.queryEmbedding
   * @param {number}  params.topK
   * @param {object}  [params.where] - Optional ChromaDB metadata filter.
   *   Use this to scope queries to a specific conversationId:
   *   e.g. { conversationId: { $eq: 'abc-123' } }
   *   The knowledge collection never passes a where filter so its
   *   behaviour is completely unchanged.
   * @returns {Promise<Array<{ id: string, text: string, metadata: object }>>}
   */
  async search({ queryEmbedding, topK: nResults, where }) {
    if (!queryEmbedding) throw new Error('Embedding must be provided for searching');

    const queryParams = {
      queryEmbeddings: [queryEmbedding],
      nResults,
      include: ['documents', 'metadatas'],
    };

    if (where) queryParams.where = where;

    const queryResult = await this.#collection.query(queryParams);

    const ids       = queryResult.ids[0];
    const documents = queryResult.documents[0];
    const metadatas = queryResult.metadatas[0] || [];

    return ids.map((id, index) => ({
      id,
      text: documents[index],
      metadata: metadatas[index],
    }));
  }
  async delete({ where }) {
    if (!where) throw new Error('A where filter must be provided for deletion');
    await this.#collection.delete({ where });
  }
}

export default ChromaVectorStore;