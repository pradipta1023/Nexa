class PromptBuilder {
  build({ question, chunks }) {
    if (chunks.length === 0)
      throw new Error("Cannot provide answer as there's no context");

    const context = chunks
      .map((chunk, idx) => `[Context ${idx + 1}]\n${chunk.text}`)
      .join("\n\n");

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