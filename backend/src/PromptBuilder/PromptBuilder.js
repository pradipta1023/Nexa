class PromptBuilder {
  #contextBuilder;

  constructor({ contextBuilder }) {
    this.#contextBuilder = contextBuilder;
  }

  build({ question, documentChunks = [], summary = null, conversationChunks = [], maxTokens = 2000 }) {
    const context = this.#contextBuilder.buildContext({
      documentChunks,
      summary,
      conversationChunks,
      maxTokens,
    });

    if (!context) {
      throw new Error("Cannot provide answer as there's no context");
    }

    return `
You are a helpful AI assistant.

Use only the context below to answer the question

If the answer cannot be found say so.

Context:
${context}

Question:
${question}

Answer:
    `.trim();
  }
}

export default PromptBuilder;