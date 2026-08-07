class QueryPipeline {
  #retriever;
  #chatService;
  #promptBuilder;
  constructor({
    retriever,
    chatService,
    promptBuilder
  }) {
    this.#retriever = retriever;
    this.#chatService = chatService;
    this.#promptBuilder = promptBuilder;
  }

  async ask({ question, topK = 15 }) {
    const retrievedChunks = await this.#retriever.retrieve(question, { topK })
    const prompt = this.#promptBuilder.build({ question, chunks: retrievedChunks });
    const answer = await this.#chatService.generate({ prompt });

    return { answer, retrievedChunks, prompt };
  }
}

export default QueryPipeline;