class Retriever {
  #embeddingService;
  #vectorStore;
  constructor({ embeddingService, vectorStore }) {
    this.#embeddingService = embeddingService;
    this.#vectorStore = vectorStore;
  }

  async retrieve(question, { topK = 5, knowledgeBaseId } = {}) {
    if (typeof question !== "string") throw new Error("Question must be a string");

    if (!question || question.trim().length === 0)
      throw new Error("Question must be provided for getting answer");

    const queryEmbedding = await this.#embeddingService.embed(question);

    const searchParams = { queryEmbedding, topK };
    if (knowledgeBaseId) {
      searchParams.where = { knowledgeBaseId: { $eq: knowledgeBaseId } };
    }

    return this.#vectorStore.search(searchParams);
  }
}

export default Retriever;