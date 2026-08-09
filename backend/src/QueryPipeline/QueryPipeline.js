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

  async *askStream({ question, config }) {
    const topK = config?.topK || 15;
    const retrievedChunks = await this.#retriever.retrieve(question, { topK });
    const prompt = this.#promptBuilder.build({ question, chunks: retrievedChunks });
    
    const stream = this.#chatService.generateStream({ 
        prompt, 
        model: config?.model, 
        maxTokens: config?.maxTokens, 
        temperature: config?.temperature 
    });

    for await (const chunk of stream) {
      yield chunk;
    }
  }
}

export default QueryPipeline;