import { jest } from "@jest/globals";
import Retriever from "../../src/Retriever/Retriever";

describe("Retriever", () => {
  let embeddingService;
  let vectorStore;
  let retriever;

  beforeEach(() => {
    embeddingService = {
      embed: jest.fn()
    };

    vectorStore = {
      search: jest.fn()
    };

    retriever = new Retriever({
      embeddingService,
      vectorStore
    });
  });

  test("should throw if question is not a string", async () => {
    await expect(retriever.retrieve(123)).rejects.toThrow(
      "Question must be a string"
    );
  });

  test("should throw if question is empty", async () => {
    await expect(retriever.retrieve("")).rejects.toThrow(
      "Question must be provided for getting answer"
    );
  });

  test("should throw if question contains only whitespaces", async () => {
    await expect(retriever.retrieve("     ")).rejects.toThrow(
      "Question must be provided for getting answer"
    );
  });

  test("should call embeddingService.embed with the provided question", async () => {
    embeddingService.embed.mockResolvedValue([0.1, 0.2]);
    vectorStore.search.mockReturnValue([]);

    await retriever.retrieve("What is React?");

    expect(embeddingService.embed).toHaveBeenCalledWith("What is React?");
    expect(embeddingService.embed).toHaveBeenCalledTimes(1);
  });

  test("should call vectorStore.search with the generated embedding and default topK", async () => {
    const embedding = [0.1, 0.2];

    embeddingService.embed.mockResolvedValue(embedding);
    vectorStore.search.mockReturnValue([]);

    await retriever.retrieve("What is React?");

    expect(vectorStore.search).toHaveBeenCalledWith({
      queryEmbedding: embedding,
      topK: 5
    });
  });

  test("should forward custom topK to vectorStore.search", async () => {
    const embedding = [0.1, 0.2];

    embeddingService.embed.mockResolvedValue(embedding);
    vectorStore.search.mockReturnValue([]);

    await retriever.retrieve("What is React?", {
      topK: 3
    });

    expect(vectorStore.search).toHaveBeenCalledWith({
      queryEmbedding: embedding,
      topK: 3
    });
  });

  test("should return the results from vectorStore.search", async () => {
    const searchResults = [
      { id: 1, text: "React is a JavaScript library.", similarity: 0.98 }
    ];

    embeddingService.embed.mockResolvedValue([0.1, 0.2]);
    vectorStore.search.mockReturnValue(searchResults);

    const result = await retriever.retrieve("What is React?");

    expect(result).toEqual(searchResults);
  });

  test("should propagate errors from embeddingService", async () => {
    embeddingService.embed.mockRejectedValue(new Error("Embedding failed"));

    await expect(retriever.retrieve("What is React?")).rejects.toThrow("Embedding failed");
  });

  test("should propagate errors from vectorStore", async () => {
    embeddingService.embed.mockResolvedValue([0.1, 0.2]);

    vectorStore.search.mockImplementation(() => { throw new Error("Search failed"); });

    await expect(retriever.retrieve("What is React?")).rejects.toThrow("Search failed");
  });
});