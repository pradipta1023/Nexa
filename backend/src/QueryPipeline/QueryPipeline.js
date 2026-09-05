class QueryPipeline {
  #retriever;
  #chatService;
  #promptBuilder;
  #conversationRetriever;
  #conversationStore;

  constructor({
    retriever,
    chatService,
    promptBuilder,
    conversationRetriever,
    conversationStore
  }) {
    this.#retriever = retriever;
    this.#chatService = chatService;
    this.#promptBuilder = promptBuilder;
    this.#conversationRetriever = conversationRetriever;
    this.#conversationStore = conversationStore;
  }

  async #buildPrompt(question, conversationId, topK, resourceIds) {
    // Concurrently fetch document chunks and conversation chunks
    const [documentChunks, conversationChunks] = await Promise.all([
      this.#retriever.retrieve(question, { topK, resourceIds }),
      this.#conversationRetriever.retrieve(question, conversationId, { topK: 5 })
    ]);

    const conversation = await this.#conversationStore.getConversation(conversationId);
    const summary = conversation?.summary?.text || null;

    // To fix pronoun resolution (e.g. "it"), the LLM MUST see the immediate preceding turns
    // in exact chronological order. Semantic search alone scrambles the timeline and might
    // even drop the most recent turn if it has low cosine similarity.
    const recentTurns = conversation?.turns?.slice(-3) || [];
    
    // Convert semantic chunks into a comparable format
    const semanticChunks = (conversationChunks || []).map(chunk => ({
        id: chunk.id,
        text: chunk.text,
        timestamp: chunk.metadata?.timestamp || new Date(0).toISOString()
    }));

    // Convert chronological turns into the same format
    const chronoChunks = recentTurns.map(t => ({
        id: t.turnId,
        text: `User: ${t.userMessage}\nAssistant: ${t.assistantResponse}`,
        timestamp: t.timestamp || new Date().toISOString()
    }));

    // Merge and deduplicate by ID
    const mergedMap = new Map();
    [...semanticChunks, ...chronoChunks].forEach(chunk => {
        mergedMap.set(chunk.id, chunk);
    });

    // Sort chronologically (oldest to newest) so the LLM reads it like a real chat log
    const sortedConversationChunks = Array.from(mergedMap.values())
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map(chunk => chunk.text);

    const prompt = this.#promptBuilder.build({
      question,
      documentChunks,
      summary,
      conversationChunks: sortedConversationChunks,
      maxTokens: 2000
    });

    return { prompt, documentChunks };
  }

  async ask({ question, conversationId, topK = 15, resourceIds }) {
    if (!conversationId) throw new Error('conversationId is required');

    const { prompt, documentChunks } = await this.#buildPrompt(question, conversationId, topK, resourceIds);
    const answer = await this.#chatService.generate({ prompt });

    return { answer, retrievedChunks: documentChunks, prompt };
  }

  async *askStream({ question, conversationId, config, resourceIds }) {
    if (!conversationId) throw new Error('conversationId is required');

    const topK = config?.topK || 10;
    const { prompt } = await this.#buildPrompt(question, conversationId, topK, resourceIds);
    
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