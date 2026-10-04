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
    console.log("Built context:", context);

    if (!context) {
      throw new Error("Cannot provide answer as there's no context");
    }

    return `
You are a helpful AI assistant.

You have been provided with context that may include retrieved knowledge documents, a summary of the conversation, and recent conversation history.

- If the user's question contains a pronoun (like "it", "this", "that"), you MUST first definitively resolve what it refers to by reading the "Recent Conversation Context" and "Conversation Summary".
- Once you determine the active topic from the conversation history, COMPLETELY IGNORE any information in the "Document Context" that is about a different topic.
- Provide a single, direct, confident answer. NEVER use hedging language like "If 'it' refers to X... but if it refers to Y...". Choose the single most logical topic based on the conversation history and answer directly.
- Do not explicitly mention "according to the context", "based on the provided documents", or reveal your internal mechanisms to the user. Answer naturally as if the knowledge is your own.
- If the required information for the active topic is not in the context, you MUST say so. Do NOT use your internal knowledge under any circumstances.

--- CONTEXT ---
${context}
---------------

Question:
${question}

Answer:
    `.trim();
  }
}

export default PromptBuilder;