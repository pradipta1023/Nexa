class Retriever {
  #embeddingService;
  #vectorStore;
  constructor({ embeddingService, vectorStore }) {
    this.#embeddingService = embeddingService;
    this.#vectorStore = vectorStore;
  }

  async retrieve(question, { topK = 5 } = {}) {
    if (typeof question !== "string") throw new Error("Question must be a string");

    if (!question || question.trim().length === 0)
      throw new Error("Question must be provided for getting answer");

    const queryEmbedding = await this.#embeddingService.embed(question);

    return this.#vectorStore.search({ queryEmbedding, topK });
  }
}

export default Retriever;