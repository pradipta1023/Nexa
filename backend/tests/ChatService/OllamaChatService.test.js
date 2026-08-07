import { jest } from "@jest/globals";
import OllamaChatService from "../../src/ChatService/OllamaChatService";

describe("OllamaChatService", () => {
  let request;
  let service;

  beforeEach(() => {
    request = jest.fn();

    service = new OllamaChatService({ model: "qwen3:14b", baseUrl: "http://localhost:11434", request });
  });

  test("should throw if prompt is not provided", async () => {
    await expect(service.generate()).rejects.toThrow("Prompt must be a string.");
  });

  test("should throw if prompt is not a string", async () => {
    await expect(service.generate({ prompt: 123 })).rejects.toThrow("Prompt must be a string.");
  });

  test("should throw if prompt is an empty string", async () => {
    await expect(service.generate({ prompt: "" })).rejects.toThrow("Prompt must be a non-empty string.");
  });

  test("should throw if prompt contains only whitespaces", async () => {
    await expect(service.generate({ prompt: "     " })).rejects.toThrow("Prompt must be a non-empty string.");
  });

  test("should send a POST request to the correct endpoint", async () => {
    request.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "React" } })
    });

    await service.generate({ prompt: "What is React?" });

    expect(request).toHaveBeenCalledWith("http://localhost:11434/api/chat",
      expect.objectContaining({ method: "POST" }));
  });

  test("should send the correct headers", async () => {
    request.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "React" } })
    });

    await service.generate({ prompt: "Hello" });

    expect(request).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: { "Content-Type": "application/json" } })
    );
  });

  test("should send the correct request body", async () => {
    request.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "React is a library." } })
    });

    await service.generate({ prompt: "What is React?" });

    expect(request).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          model: "qwen3:14b",
          messages: [{ role: "user", content: "What is React?" }],
          stream: false
        })
      })
    );
  });

  test("should return the generated response", async () => {
    request.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "React is a JavaScript library." } })
    });

    const result = await service.generate({ prompt: "What is React?" });

    expect(result).toBe("React is a JavaScript library.");
  });

  test("should throw if the server returns a non-success status", async () => {
    request.mockResolvedValue({ ok: false, status: 500 });

    await expect(service.generate({ prompt: "Hello" })).rejects.toThrow(
      "Failed to generate result: Unable to connect to Ollama server. Ollama server returned status 500"
    );
  });

  test("should wrap network errors", async () => {
    request.mockRejectedValue(new Error("Network Error"));

    await expect(service.generate({ prompt: "Hello" })).rejects.toThrow(
      "Failed to generate result: Unable to connect to Ollama server. Network Error"
    );
  });
});