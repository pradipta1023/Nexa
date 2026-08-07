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

  async search({ queryEmbedding, topK: nResults }) {
    if (!queryEmbedding) throw new Error("Embedding must be provided for searching");

    const queryResult = await this.#collection.query({ queryEmbeddings: [queryEmbedding], nResults, include: ["documents", "metadatas"] })

    const ids = queryResult.ids[0];
    const documents = queryResult.documents[0];
    const metadatas = queryResult.metadatas[0] || [];

    return ids
      .map((id, index) => ({ id, text: documents[index], metadata: metadatas[index] }));
  }
}

export default ChromaVectorStore;