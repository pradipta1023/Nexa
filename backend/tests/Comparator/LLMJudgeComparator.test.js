import {jest} from "@jest/globals";
import LLMJudgeComparator from "../../src/Comparator/LLMJudgeComparator.js"

describe("LLMJudgeComparator", () => {
  let chatService;
  let comparator;

  beforeEach(() => {
    chatService = {
      generate: jest.fn(),
    };

    comparator = new LLMJudgeComparator({ chatService });
  });

  const input = {
    question: "When was the Iron Lighthouse built?",
    expectedAnswer: "1886",
    actualAnswer: "The Iron Lighthouse was completed in 1886.",
    retrievedChunks: [
      {
        text: "The Iron Lighthouse was completed in 1886.",
      },
    ],
  };

  test("should call chat service with a generated prompt", async () => {
    chatService.generate.mockResolvedValue(
      JSON.stringify({
        passed: true,
        correct: true,
        faithful: true,
        hallucinated: false,
        complete: true,
        reason: "Looks good",
      })
    );

    await comparator.compare(input);

    expect(chatService.generate).toHaveBeenCalledTimes(1);

    expect(chatService.generate).toHaveBeenCalledWith({
      prompt: expect.stringContaining(input.question),
    });
  });

  test("should include retrieved context in the prompt", async () => {
    chatService.generate.mockResolvedValue(
      JSON.stringify({
        passed: true,
      })
    );

    await comparator.compare(input);

    const prompt = chatService.generate.mock.calls[0][0].prompt;

    expect(prompt).toContain(input.retrievedChunks[0].text);
  });

  test("should include expected answer in the prompt", async () => {
    chatService.generate.mockResolvedValue(
      JSON.stringify({
        passed: true,
      })
    );

    await comparator.compare(input);

    const prompt = chatService.generate.mock.calls[0][0].prompt;

    expect(prompt).toContain(input.expectedAnswer);
  });

  test("should include generated answer in the prompt", async () => {
    chatService.generate.mockResolvedValue(
      JSON.stringify({
        passed: true,
      })
    );

    await comparator.compare(input);

    const prompt = chatService.generate.mock.calls[0][0].prompt;

    expect(prompt).toContain(input.actualAnswer);
  });

  test("should return parsed JSON response", async () => {
    const response = {
      passed: true,
      correct: true,
      faithful: true,
      hallucinated: false,
      complete: true,
      reason: "Looks good",
    };

    chatService.generate.mockResolvedValue(
      JSON.stringify(response)
    );

    await expect(comparator.compare(input)).resolves.toEqual(response);
  });

  test("should throw when chat service returns invalid JSON", async () => {
    chatService.generate.mockResolvedValue("Not JSON");

    await expect(comparator.compare(input)).rejects.toThrow(
      "Got an invalid json from model"
    );
  });

  test("should propagate chat service errors", async () => {
    chatService.generate.mockRejectedValue(
      new Error("Ollama unavailable")
    );

    await expect(comparator.compare(input)).rejects.toThrow(
      "Ollama unavailable"
    );
  });
});