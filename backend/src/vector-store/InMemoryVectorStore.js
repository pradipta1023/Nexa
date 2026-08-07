import cosineSimiliarity from "../similiarity-search/cosineSimiliarity.js";

class InMemoryVectorStore {
  #storage;
  #ids;
  constructor(store = []) {
    this.#storage = store;
    this.#ids = new Set();
  }

  add(vectors) {
    if (!vectors) throw new Error("Input must be provided to store");

    if (!Array.isArray(vectors)) throw new Error("Input must be an array");

    if (vectors.length === 0) throw new Error("Length of the vector can't be zero");

    const idFrequency = vectors.reduce((acc, { id }) => {
      acc[id] = acc[id] || 0;
      acc[id]++;

      return acc;
    }, {})

    if (Object.values(idFrequency).some(v => v !== 1)) throw new Error("Id's must be unique for each embeddings");

    if (vectors.some(chunk => this.#ids.has(chunk.id))) throw new Error("Provided id is already present");

    if (vectors.some((chunk) => [undefined, null].includes(chunk.id) || !chunk.embedding || !chunk.text)) throw new Error("All fields [ id, text, embedding ] must be provided for each chunk.")

    vectors.forEach(({ id }) => this.#ids.add(id))
    this.#storage.push(...vectors);
  }

  #createSearchResult(embedding, chunk) {
    const similarity = cosineSimiliarity(embedding, chunk.embedding);

    return { id: chunk.id, text: chunk.text, similarity };
  }

  search({ queryEmbedding, topK = 5 }) {
    if (!queryEmbedding) throw new Error("Embedding must be provided for searching");

    return this.#storage
      .map((chunk) => this.#createSearchResult(queryEmbedding, chunk))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  clear() {
    this.#storage = [];
    this.#ids = new Set();
  }
}

export default InMemoryVectorStore;