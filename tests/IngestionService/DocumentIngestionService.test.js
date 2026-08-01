import { jest } from "@jest/globals";
import DocumentIngestionService from "../../src/IngestionService/DocumentIngestionService.js";

describe("DocumentIngestionService", () => {
  let pdfExtractor;
  let chunker;
  let embeddingPipeline;
  let vectorStore;
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

    documentIngestionService = new DocumentIngestionService({
      pdfExtractor,
      chunker,
      embeddingPipeline,
      vectorStore,
    });

    jest.clearAllMocks();
  });

  test("should ingest text", async () => {
    chunker.mockReturnValue([
      {
        id: "1",
        text: "React Hooks",
      },
      {
        id: "2",
        text: "useEffect",
      },
    ]);

    embeddingPipeline.embed.mockResolvedValue([
      {
        id: "1",
        text: "React Hooks",
        embedding: [1, 2],
        metadata: {
          source: "manual",
        },
      },
      {
        id: "2",
        text: "useEffect",
        embedding: [3, 4],
        metadata: {
          source: "manual",
        },
      },
    ]);

    vectorStore.add.mockResolvedValue();

    const result = await documentIngestionService.ingestText({
      text: "React Hooks useEffect",
      metadata: { source: "manual", },
    });

    expect(chunker).toHaveBeenCalledTimes(1);
    expect(chunker).toHaveBeenCalledWith("React Hooks useEffect");

    expect(embeddingPipeline.embed).toHaveBeenCalledWith([
      {
        id: "1",
        text: "React Hooks",
        metadata: {
          source: "manual",
        },
      },
      {
        id: "2",
        text: "useEffect",
        metadata: {
          source: "manual",
        },
      },
    ]);

    expect(vectorStore.add).toHaveBeenCalledWith([
      {
        id: "1",
        text: "React Hooks",
        embedding: [1, 2],
        metadata: {
          source: "manual",
        },
      },
      {
        id: "2",
        text: "useEffect",
        embedding: [3, 4],
        metadata: {
          source: "manual",
        },
      },
    ]);

    expect(result).toEqual({
      chunksStored: 2,
    });
  });

  test("should ingest pdf", async () => {
    pdfExtractor.extract.mockResolvedValue([
      {
        pageNumber: 1,
        text: "Page One",
      },
      {
        pageNumber: 2,
        text: "Page Two",
      },
    ]);

    chunker
      .mockReturnValueOnce([
        {
          id: "1",
          text: "Chunk One",
        },
      ])
      .mockReturnValueOnce([
        {
          id: "2",
          text: "Chunk Two",
        },
      ]);

    embeddingPipeline.embed.mockResolvedValue([
      {
        id: "1",
        text: "Chunk One",
        embedding: [1],
        metadata: {
          source: "react.pdf",
          author: "Dan",
          page: 1,
        },
      },
      {
        id: "2",
        text: "Chunk Two",
        embedding: [2],
        metadata: {
          source: "react.pdf",
          author: "Dan",
          page: 2,
        },
      },
    ]);

    vectorStore.add.mockResolvedValue();

    const result = await documentIngestionService.ingestPdf({
      filePath: "./react.pdf",
      metadata: {
        source: "react.pdf",
        author: "Dan",
      },
    });

    expect(pdfExtractor.extract).toHaveBeenCalledWith({
      fileName: "./react.pdf",
    });

    expect(chunker).toHaveBeenCalledTimes(2);
    expect(chunker).toHaveBeenNthCalledWith(1, "Page One");
    expect(chunker).toHaveBeenNthCalledWith(2, "Page Two");

    expect(embeddingPipeline.embed).toHaveBeenCalledWith([
      {
        id: "1",
        text: "Chunk One",
        metadata: {
          source: "react.pdf",
          author: "Dan",
          page: 1,
        },
      },
      {
        id: "2",
        text: "Chunk Two",
        metadata: {
          source: "react.pdf",
          author: "Dan",
          page: 2,
        },
      },
    ]);

    expect(vectorStore.add).toHaveBeenCalledWith([
      {
        id: "1",
        text: "Chunk One",
        embedding: [1],
        metadata: {
          source: "react.pdf",
          author: "Dan",
          page: 1,
        },
      },
      {
        id: "2",
        text: "Chunk Two",
        embedding: [2],
        metadata: {
          source: "react.pdf",
          author: "Dan",
          page: 2,
        },
      },
    ]);

    expect(result).toEqual({
      chunksStored: 2,
    });
  });

  test("should propagate pdf extractor errors", async () => {
    pdfExtractor.extract.mockRejectedValue(
      new Error("Failed to extract PDF")
    );

    await expect(
      documentIngestionService.ingestPdf({
        filePath: "./missing.pdf",
        metadata: {},
      })
    ).rejects.toThrow("Failed to extract PDF");
  });

  test("should propagate embedding pipeline errors", async () => {
    chunker.mockReturnValue([
      {
        id: "1",
        text: "Chunk",
      },
    ]);

    embeddingPipeline.embed.mockRejectedValue(
      new Error("Embedding failed")
    );

    await expect(
      documentIngestionService.ingestText({
        text: "Hello",
        metadata: {},
      })
    ).rejects.toThrow("Embedding failed");
  });

  test("should propagate vector store errors", async () => {
    chunker.mockReturnValue([
      {
        id: "1",
        text: "Chunk",
      },
    ]);

    embeddingPipeline.embed.mockResolvedValue([
      {
        id: "1",
        text: "Chunk",
        embedding: [1],
        metadata: {},
      },
    ]);

    vectorStore.add.mockRejectedValue(
      new Error("Database unavailable")
    );

    await expect(
      documentIngestionService.ingestText({
        text: "Hello",
        metadata: {},
      })
    ).rejects.toThrow("Database unavailable");
  });
});