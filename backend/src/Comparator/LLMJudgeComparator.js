class LLMJudgeComparator {
  #chatService;
  constructor({ chatService }) {
    this.#chatService = chatService;
  }

  async compare({ question, expectedAnswer, actualAnswer, retrievedChunks }) {
    const prompt = this.#buildPrompt({ question, expectedAnswer, actualAnswer, retrievedChunks });

    const data = await this.#chatService.generate({ prompt });
    try {
      return JSON.parse(data);
    } catch (e) {
      throw new Error("Got an invalid json from model");
    }
  }

  #buildPrompt({ question, expectedAnswer, actualAnswer, retrievedChunks }) {
    return `
You are evaluating a Retrieval-Augmented Generation (RAG) system.

Use the retrieved context to determine whether the generated answer is supported.

Use the expected answer as the reference for correctness.

Evaluation Criteria:

1. Correctness
2. Faithfulness
3. Hallucination
4. Completeness

If any field cannot be determined, choose the most reasonable boolean value.

Your response MUST be valid JSON and nothing else.

Do not include markdown.
Do not include explanations outside the JSON.
Do not wrap the JSON inside code fences.

EXPECTED JSON FORMAT:
{
  "passed": true,
  "correct": true,
  "faithful": true,
  "hallucinated": false,
  "complete": true,
  "reason": "..."
}

Question:
${question}

Retrieved Context:
${retrievedChunks.map(chunks => chunks.text).join("\n\n")}

Expected Answer:
${expectedAnswer}

Generated Answer:
${actualAnswer}
`
  }
}

export default LLMJudgeComparator;