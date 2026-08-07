import PromptBuilder from "../../src/PromptBuilder/PromptBuilder";

describe("PromptBuilder", () => {
  let builder;

  beforeEach(() => {
    builder = new PromptBuilder();
  });

  test("should throw if no chunks are provided", () => {
    expect(() =>
      builder.build({ question: "What is React?", chunks: [] })
    ).toThrow("Cannot provide answer as there's no context");
  });

  test("should include the question, Context and Answer in the prompt", () => {
    const prompt = builder.build({
      question: "What is React?",
      chunks: [{ id: 1, text: "React is a JavaScript library." }]
    });

    expect(prompt).toContain("Question:");
    expect(prompt).toContain("What is React?");
    expect(prompt).toContain("Answer");
    expect(prompt).toContain("Context");
  });

  test("should include all chunk texts", () => {
    const prompt = builder.build({
      question: "What is React?",
      chunks: [
        { id: 1, text: "React is a JavaScript library." },
        { id: 2, text: "React uses a virtual DOM." }
      ]
    });

    expect(prompt).toContain("React is a JavaScript library.");
    expect(prompt).toContain("React uses a virtual DOM.");
  });

  test("should number each context", () => {
    const prompt = builder.build({
      question: "What is React?",
      chunks: [
        { id: 1, text: "First chunk" },
        { id: 2, text: "Second chunk" }
      ]
    });

    expect(prompt).toContain("[Context 1]");
    expect(prompt).toContain("[Context 2]");
  });

  test("should include instructions to use only the provided context", () => {
    const prompt = builder.build({
      question: "What is React?",
      chunks: [{ id: 1, text: "React is a JavaScript library." }]
    });

    expect(prompt).toContain("Use only the context below to answer the question");
  });

  test("should include instructions for unknown answers", () => {
    const prompt = builder.build({
      question: "What is React?",
      chunks: [{ id: 1, text: "React is a JavaScript library." }]
    });

    expect(prompt).toContain("If the answer cannot be found say so.");
  });

  test("should return a string", () => {
    const prompt = builder.build({
      question: "What is React?",
      chunks: [{ id: 1, text: "React is a JavaScript library." }]
    });

    expect(typeof prompt).toBe("string");
  });
});