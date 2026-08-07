import OllamaEmbeddingService from "../src/EmbeddingService/OllamaEmbeddingService.js";
import { jest } from "@jest/globals";

describe("OllamaEmbeddingService", () => {
  let request;
  let service;

  beforeEach(() => {
    request = jest.fn();

    service = new OllamaEmbeddingService({
      baseUrl: "http://localhost:11434",
      model: "nomic-embed-text",
      request,
    });
  });

  test("should throw an error if text is empty", async () => {
    await expect(service.embed("")).rejects.toThrow(
      "Input text must be a non-empty string."
    );
  });

  test("should call the correct endpoint", async () => {
    request.mockResolvedValue({
      ok: true,
      json: async () => ({
        embeddings: [[1, 2, 3]]
      })
    });

    await service.embed("React");

    expect(request).toHaveBeenCalledWith("http://localhost:11434/api/embed", expect.any(Object));
  });

  test("should send the correct request body", async () => {
    request.mockResolvedValue({
      ok: true,
      json: async () => ({
        embeddings: [[1, 2, 3]]
      })
    });

    await service.embed("React");

    expect(request).toHaveBeenCalledWith("http://localhost:11434/api/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "nomic-embed-text", input: "React" })
    });
  });


  test("should return only the embedding", async () => {
    request.mockResolvedValue({
      ok: true,
      json: async () => ({
        embeddings: [[1, 2, 3]]
      })
    });

    const embedding = await service.embed("React");

    expect(embedding).toEqual([1, 2, 3]);
  });

  test("should throw a descriptive error if the request fails", async () => {
    request.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(service.embed("React")).rejects.toThrow(
      "Failed to generate embedding: Unable to connect to Ollama server. ECONNREFUSED"
    );
  });

  test("should throw if Ollama returns a non-success response", async () => {
    request.mockResolvedValue({ ok: false, status: 500 });

    await expect(service.embed("React")).rejects.toThrow("Failed to generate embedding: Unable to connect to Ollama server. Ollama server returned status 500");
  });

});