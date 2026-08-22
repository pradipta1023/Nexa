class Retriever {
  #embeddingService;
  #vectorStore;
  constructor({ embeddingService, vectorStore }) {
    this.#embeddingService = embeddingService;
    this.#vectorStore = vectorStore;
  }

  async retrieve(question, { topK = 5, resourceIds } = {}) {
    if (typeof question !== "string") throw new Error("Question must be a string");

    if (!question || question.trim().length === 0)
      throw new Error("Question must be provided for getting answer");

    const queryEmbedding = await this.#embeddingService.embed(question);

    const searchParams = { queryEmbedding, topK };
    if (resourceIds && Array.isArray(resourceIds) && resourceIds.length > 0) {
      if (resourceIds.length === 1) {
        searchParams.where = { resourceId: { $eq: resourceIds[0] } };
      } else {
        searchParams.where = { resourceId: { $in: resourceIds } };
      }
    }

    return this.#vectorStore.search(searchParams);
  }
}

export default Retriever;