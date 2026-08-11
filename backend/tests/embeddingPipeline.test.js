import { jest } from "@jest/globals";
import EmbeddingPipeline from "../src/EmbeddingPipeline.js";


describe("Embedding Pipeline", () => {
  let embeddingService;
  let pipeline;

  beforeEach(() => {
    embeddingService = { embedMany: jest.fn() };

    pipeline = new EmbeddingPipeline({ embeddingService });
  });

  test("should throw if chunks are not provided", async () => {
    await expect(pipeline.embed()).rejects.toThrow("Chunks are required to embed");
  });

  test("should throw if chunks is not an array", async () => {
    await expect(pipeline.embed("not an array")).rejects.toThrow("Chunks must be an array.");
  });

  test("should return an empty array when chunks are empty", async () => {
    const result = await pipeline.embed([]);

    expect(result).toEqual([]);
  });

  test("should call embeddingService with batched chunks", async () => {
    embeddingService.embedMany.mockResolvedValueOnce([[1, 2, 3], [4, 5, 6]]);

    const chunks = [{ id: 1, text: "A" }, { id: 2, text: "B" }];

    await pipeline.embed(chunks);

    expect(embeddingService.embedMany).toHaveBeenCalledTimes(1);
    expect(embeddingService.embedMany).toHaveBeenCalledWith(["A", "B"]);
  });

  test("should return chunks with embeddings", async () => {
    embeddingService.embedMany.mockResolvedValueOnce([[1, 2, 3], [4, 5, 6]]);

    const chunks = [{ id: 1, text: "A" }, { id: 2, text: "B" }];

    const result = await pipeline.embed(chunks);

    expect(result).toEqual([
      { id: 1, text: "A", embedding: [1, 2, 3] },
      { id: 2, text: "B", embedding: [4, 5, 6] }
    ]);
  });

  test("should not mutate the original chunks", async () => {
    embeddingService.embedMany.mockResolvedValueOnce([[1, 2, 3]]);

    const chunks = [{ id: 1, text: "A" }];

    const original = structuredClone(chunks);

    await pipeline.embed(chunks);

    expect(chunks).toEqual(original);
  });

  test("should propagate errors from embeddingService", async () => {
    embeddingService.embedMany.mockRejectedValue(new Error("Embedding failed"));

    const chunks = [{ id: 1, text: "A" }];

    await expect(pipeline.embed(chunks)).rejects.toThrow("Embedding failed");
  });
});