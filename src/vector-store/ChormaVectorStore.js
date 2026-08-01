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

    for (const { id, embedding, text, metadata } of vectors) {
      ids.push(id);
      embeddings.push(embedding);
      documents.push(text);
      if (metadata) metadatas.push(metadata);
      else metadatas.push({});
    }

    await this.#collection.add({ ids, embeddings, documents, metadatas })
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