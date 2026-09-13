class EmbeddingPipeline {
  #embeddingService;
  constructor({ embeddingService }) {
    this.#embeddingService = embeddingService;
  }

  async embed(chunks) {
    if (!chunks)
      throw new Error("Chunks are required to embed");

    if (!Array.isArray(chunks))
      throw new Error("Chunks must be an array.");

    if (chunks.length === 0)
      return [];

    const embeddedChunks = [];
    for (let i = 0; i < chunks.length; i += 20) {

      const slicedChunks = chunks.slice(i, i + 20);
      const embeddings = await this.#embeddingService.embedMany(slicedChunks.map(chunk => chunk.text));
      embeddedChunks.push(...slicedChunks.map((chunk, index) => ({ ...chunk, embedding: embeddings[index], })));
    }

    return embeddedChunks;
  }
}

export default EmbeddingPipeline;