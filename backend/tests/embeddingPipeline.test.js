import { jest } from "@jest/globals";
import EmbeddingPipeline from "../src/EmbeddingPipeline.js";


describe("Embedding Pipeline", () => {
  let embeddingService;
  let pipeline;

  beforeEach(() => {
    embeddingService = { embed: jest.fn() };

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

  test("should call embeddingService once for each chunk", async () => {
    embeddingService.embed
      .mockResolvedValueOnce([1, 2, 3])
      .mockResolvedValueOnce([4, 5, 6]);

    const chunks = [{ id: 1, text: "A" }, { id: 2, text: "B" },];

    await pipeline.embed(chunks);

    expect(embeddingService.embed).toHaveBeenCalledTimes(2);
    expect(embeddingService.embed).toHaveBeenNthCalledWith(1, "A");
    expect(embeddingService.embed).toHaveBeenNthCalledWith(2, "B");
  });

  test("should return chunks with embeddings", async () => {
    embeddingService.embed
      .mockResolvedValueOnce([1, 2, 3])
      .mockResolvedValueOnce([4, 5, 6]);

    const chunks = [{ id: 1, text: "A" }, { id: 2, text: "B" },];

    const result = await pipeline.embed(chunks);

    expect(result).toEqual([
      { id: 1, text: "A", embedding: [1, 2, 3], },
      { id: 2, text: "B", embedding: [4, 5, 6], }
    ]);
  });

  test("should not mutate the original chunks", async () => {
    embeddingService.embed.mockResolvedValue([1, 2, 3]);

    const chunks = [{ id: 1, text: "A" },];

    const original = structuredClone(chunks);

    await pipeline.embed(chunks);

    expect(chunks).toEqual(original);
  });

  test("should propagate errors from embeddingService", async () => {
    embeddingService.embed.mockRejectedValue(new Error("Embedding failed"));

    const chunks = [{ id: 1, text: "A" },];

    await expect(pipeline.embed(chunks)).rejects.toThrow("Embedding failed");
  });
})