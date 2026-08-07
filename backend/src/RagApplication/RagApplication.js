class RagApplication {
  #chunker;
  #embeddingPipeline;
  #vectorStore;
  #retriever;
  #promptBuilder;
  #chatService;
  #chunkOptions;

  constructor({ chunker,
    embeddingPipeline,
    vectorStore,
    retriever,
    promptBuilder,
    chatService,
    chunkOptions }) {

    this.#chunker = chunker;
    this.#embeddingPipeline = embeddingPipeline;
    this.#vectorStore = vectorStore;
    this.#retriever = retriever;
    this.#promptBuilder = promptBuilder;
    this.#chatService = chatService;
    this.#chunkOptions = chunkOptions;
  }

  async add(context) {
    console.log("\n⏳ Processing document...");
    console.log("⏳ Chunking text...");
    const chunks = this.#chunker(context,
      {
        chunkSize: this.#chunkOptions.chunkSize,
        overlap: this.#chunkOptions.overlap
      });
    console.log("⏳ Generating embeddings...");

    const embeddings = await this.#embeddingPipeline.embed(chunks);
    console.log("⏳ Saving embeddings...");
    this.#vectorStore.add(embeddings);

    return embeddings.length;
  }

  async ask(question) {
    console.log("\n⏳ Searching relevant context...");
    const chunks = await this.#retriever.retrieve(question);
    console.log("⏳ Building prompt...");
    const prompt = this.#promptBuilder.build({ question, chunks });
    console.log("⏳ Generating answer...");
    const answer = await this.#chatService.generate({ prompt });
    return { answer, retrievedChunks: chunks }
  }
}

export default RagApplication;