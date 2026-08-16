import { jest } from '@jest/globals';
import PromptBuilder from "../../src/PromptBuilder/PromptBuilder";

const makeContextBuilder = (overrides = {}) => ({
  buildContext: jest.fn().mockReturnValue('Mocked Context'),
  ...overrides,
});

describe("PromptBuilder", () => {
  let contextBuilder;
  let builder;

  beforeEach(() => {
    contextBuilder = makeContextBuilder();
    builder = new PromptBuilder({ contextBuilder });
  });

  test("should throw if contextBuilder returns an empty string (no context)", () => {
    contextBuilder.buildContext.mockReturnValue('');
    expect(() =>
      builder.build({ question: "What is React?", documentChunks: [] })
    ).toThrow("Cannot provide answer as there's no context");
  });

  test("should include the question, Context and Answer in the prompt", () => {
    const prompt = builder.build({
      question: "What is React?",
      documentChunks: [{ id: 1, text: "React is a JavaScript library." }]
    });

    expect(prompt).toContain("Question:");
    expect(prompt).toContain("What is React?");
    expect(prompt).toContain("Answer:");
    expect(prompt).toContain("Context:");
  });

  test("should embed the string returned by contextBuilder", () => {
    contextBuilder.buildContext.mockReturnValue('Document Context:\nReact uses a virtual DOM.');
    
    const prompt = builder.build({
      question: "What is React?",
      documentChunks: [{ id: 2, text: "React uses a virtual DOM." }]
    });

    expect(prompt).toContain("React uses a virtual DOM.");
  });

  test("should pass all arguments correctly to contextBuilder", () => {
    const args = {
      question: 'What is RAG?',
      documentChunks: ['Doc 1'],
      summary: 'Sum 1',
      conversationChunks: ['Turn 1'],
      maxTokens: 1500
    };
    
    builder.build(args);
    
    expect(contextBuilder.buildContext).toHaveBeenCalledWith({
      documentChunks: ['Doc 1'],
      summary: 'Sum 1',
      conversationChunks: ['Turn 1'],
      maxTokens: 1500
    });
  });

  test("should include strict instructions to use only the provided context", () => {
    const prompt = builder.build({
      question: "What is React?",
      documentChunks: [{ id: 1, text: "React is a JavaScript library." }]
    });

    expect(prompt).toContain("Use only the context below to answer the question");
  });

  test("should include instructions for unknown answers", () => {
    const prompt = builder.build({
      question: "What is React?",
      documentChunks: [{ id: 1, text: "React is a JavaScript library." }]
    });

    expect(prompt).toContain("If the answer cannot be found say so.");
  });

  test("should return a string", () => {
    const prompt = builder.build({
      question: "What is React?",
      documentChunks: [{ id: 1, text: "React is a JavaScript library." }]
    });

    expect(typeof prompt).toBe("string");
  });
});