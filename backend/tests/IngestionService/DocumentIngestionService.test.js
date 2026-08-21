import { jest } from "@jest/globals";
import DocumentIngestionService from "../../src/IngestionService/DocumentIngestionService.js";

describe("DocumentIngestionService", () => {
  let pdfExtractor;
  let chunker;
  let embeddingPipeline;
  let vectorStore;
  let resourceStore;
  let documentIngestionService;

  beforeEach(() => {
    pdfExtractor = {
      extract: jest.fn(),
    };
    chunker = jest.fn();
    embeddingPipeline = {
      embed: jest.fn(),
    };
    vectorStore = {
      add: jest.fn(),
    };
    resourceStore = {
      updateStatus: jest.fn(),
    };

    documentIngestionService = new DocumentIngestionService({
      pdfExtractor,
      chunker,
      embeddingPipeline,
      vectorStore,
      resourceStore,
    });

    jest.clearAllMocks();
  });

  test("should ingest text", async () => {
    chunker.mockReturnValue([
      { id: "1", text: "React Hooks" },
      { id: "2", text: "useEffect" },
    ]);

    embeddingPipeline.embed.mockResolvedValue([
      { id: "1", text: "React Hooks", embedding: [1, 2], metadata: { source: "manual", knowledgeBaseId: 'kb1', resourceId: 'r1', resourceType: 'text', ingestionVersion: 1, chunkIndex: 0 } },
      { id: "2", text: "useEffect", embedding: [3, 4], metadata: { source: "manual", knowledgeBaseId: 'kb1', resourceId: 'r1', resourceType: 'text', ingestionVersion: 1, chunkIndex: 1 } },
    ]);

    vectorStore.add.mockResolvedValue();

    const result = await documentIngestionService.ingestText({
      text: "React Hooks useEffect",
      metadata: { source: "manual" },
      knowledgeBaseId: 'kb1',
      resourceId: 'r1',
      ingestionVersion: 1
    });

    expect(resourceStore.updateStatus).toHaveBeenCalledWith('r1', 'processing');
    expect(resourceStore.updateStatus).toHaveBeenCalledWith('r1', 'ready');

    expect(chunker).toHaveBeenCalledTimes(1);
    expect(chunker).toHaveBeenCalledWith("React Hooks useEffect");

    expect(embeddingPipeline.embed).toHaveBeenCalledWith([
      { id: "1", text: "React Hooks", metadata: { source: "manual", knowledgeBaseId: 'kb1', resourceId: 'r1', resourceType: 'text', ingestionVersion: 1, chunkIndex: 0 } },
      { id: "2", text: "useEffect", metadata: { source: "manual", knowledgeBaseId: 'kb1', resourceId: 'r1', resourceType: 'text', ingestionVersion: 1, chunkIndex: 1 } },
    ]);

    expect(vectorStore.add).toHaveBeenCalledWith([
      { id: "1", text: "React Hooks", embedding: [1, 2], metadata: { source: "manual", knowledgeBaseId: 'kb1', resourceId: 'r1', resourceType: 'text', ingestionVersion: 1, chunkIndex: 0 } },
      { id: "2", text: "useEffect", embedding: [3, 4], metadata: { source: "manual", knowledgeBaseId: 'kb1', resourceId: 'r1', resourceType: 'text', ingestionVersion: 1, chunkIndex: 1 } },
    ]);

    expect(result).toEqual({ chunksStored: 2 });
  });

  test("should ingest pdf", async () => {
    pdfExtractor.extract.mockResolvedValue([
      { pageNumber: 1, text: "Page One" },
      { pageNumber: 2, text: "Page Two" },
    ]);

    chunker
      .mockReturnValueOnce([{ id: "1", text: "Chunk One" }])
      .mockReturnValueOnce([{ id: "2", text: "Chunk Two" }]);

    embeddingPipeline.embed.mockResolvedValue([
      { id: "1", text: "Chunk One", embedding: [1], metadata: { source: "react.pdf", author: "Dan", page: 1, knowledgeBaseId: 'kb1', resourceId: 'r1', resourceType: 'pdf', ingestionVersion: 2, chunkIndex: 0 } },
      { id: "2", text: "Chunk Two", embedding: [2], metadata: { source: "react.pdf", author: "Dan", page: 2, knowledgeBaseId: 'kb1', resourceId: 'r1', resourceType: 'pdf', ingestionVersion: 2, chunkIndex: 1 } },
    ]);

    vectorStore.add.mockResolvedValue();

    const result = await documentIngestionService.ingestPdf({
      filePath: "./react.pdf",
      metadata: { source: "react.pdf", author: "Dan" },
      knowledgeBaseId: 'kb1',
      resourceId: 'r1',
      ingestionVersion: 2
    });

    expect(resourceStore.updateStatus).toHaveBeenCalledWith('r1', 'processing');
    expect(resourceStore.updateStatus).toHaveBeenCalledWith('r1', 'ready');
    expect(pdfExtractor.extract).toHaveBeenCalledWith({ fileName: "./react.pdf" });
    expect(chunker).toHaveBeenCalledTimes(2);

    expect(embeddingPipeline.embed).toHaveBeenCalledWith([
      { id: "1", text: "Chunk One", metadata: { source: "react.pdf", author: "Dan", page: 1, knowledgeBaseId: 'kb1', resourceId: 'r1', resourceType: 'pdf', ingestionVersion: 2, chunkIndex: 0 } },
      { id: "2", text: "Chunk Two", metadata: { source: "react.pdf", author: "Dan", page: 2, knowledgeBaseId: 'kb1', resourceId: 'r1', resourceType: 'pdf', ingestionVersion: 2, chunkIndex: 1 } },
    ]);

    expect(result).toEqual({ chunksStored: 2 });
  });

  test("should propagate pdf extractor errors and mark failed", async () => {
    pdfExtractor.extract.mockRejectedValue(new Error("Failed to extract PDF"));

    await expect(
      documentIngestionService.ingestPdf({
        filePath: "./missing.pdf",
        metadata: {},
        knowledgeBaseId: 'kb1',
        resourceId: 'r1',
        ingestionVersion: 1
      })
    ).rejects.toThrow("Failed to extract PDF");

    expect(resourceStore.updateStatus).toHaveBeenCalledWith('r1', 'processing');
    expect(resourceStore.updateStatus).toHaveBeenCalledWith('r1', 'failed');
  });

  test("should propagate embedding pipeline errors and mark failed", async () => {
    chunker.mockReturnValue([{ id: "1", text: "Chunk" }]);
    embeddingPipeline.embed.mockRejectedValue(new Error("Embedding failed"));

    await expect(
      documentIngestionService.ingestText({
        text: "Hello",
        metadata: {},
        knowledgeBaseId: 'kb1',
        resourceId: 'r1',
        ingestionVersion: 1
      })
    ).rejects.toThrow("Embedding failed");
    
    expect(resourceStore.updateStatus).toHaveBeenCalledWith('r1', 'processing');
    expect(resourceStore.updateStatus).toHaveBeenCalledWith('r1', 'failed');
  });

  test("should propagate vector store errors and mark failed", async () => {
    chunker.mockReturnValue([{ id: "1", text: "Chunk" }]);
    embeddingPipeline.embed.mockResolvedValue([{ id: "1", text: "Chunk", embedding: [1], metadata: {} }]);
    vectorStore.add.mockRejectedValue(new Error("Database unavailable"));

    await expect(
      documentIngestionService.ingestText({
        text: "Hello",
        metadata: {},
        knowledgeBaseId: 'kb1',
        resourceId: 'r1',
        ingestionVersion: 1
      })
    ).rejects.toThrow("Database unavailable");
    
    expect(resourceStore.updateStatus).toHaveBeenCalledWith('r1', 'processing');
    expect(resourceStore.updateStatus).toHaveBeenCalledWith('r1', 'failed');
  });
});