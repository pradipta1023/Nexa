import { jest } from "@jest/globals";
import RagApplication from "../../src/RagApplication/RagApplication";

describe("RagApplication", () => {
  let chunker;
  let embeddingPipeline;
  let vectorStore;
  let retriever;
  let promptBuilder;
  let chatService;
  let rag;

  beforeEach(() => {
    chunker = jest.fn();

    embeddingPipeline = {
      embed: jest.fn()
    };

    vectorStore = {
      add: jest.fn()
    };

    retriever = {
      retrieve: jest.fn()
    };

    promptBuilder = {
      build: jest.fn()
    };

    chatService = {
      generate: jest.fn()
    };

    rag = new RagApplication({
      chunker,
      embeddingPipeline,
      vectorStore,
      retriever,
      promptBuilder,
      chatService,
      chunkOptions: {
        chunkSize: 5,
        overlap: 2
      }
    });
  });

  test("should chunk the provided context", async () => {
    chunker.mockReturnValue([]);

    embeddingPipeline.embed.mockResolvedValue([]);

    await rag.add("React is awesome.");

    expect(chunker).toHaveBeenCalledWith(
      "React is awesome.",
      { chunkSize: 5, overlap: 2 }
    );
  });

  test("should generate embeddings for all chunks", async () => {
    const chunks = [{ id: 1, text: "Chunk 1" }];

    chunker.mockReturnValue(chunks);

    embeddingPipeline.embed.mockResolvedValue([]);

    await rag.add("React");

    expect(embeddingPipeline.embed).toHaveBeenCalledWith(chunks);
  });

  test("should store generated embeddings", async () => {
    const chunks = [{ id: 1, text: "Chunk 1" }];

    const embeddings = [{ id: 1, text: "Chunk 1", embedding: [1, 2, 3] }];

    chunker.mockReturnValue(chunks);

    embeddingPipeline.embed.mockResolvedValue(embeddings);

    await rag.add("React");

    expect(vectorStore.add).toHaveBeenCalledWith(embeddings);
  });

  test("should retrieve relevant chunks", async () => {
    retriever.retrieve.mockResolvedValue([]);

    promptBuilder.build.mockReturnValue("prompt");

    chatService.generate.mockResolvedValue("answer");

    await rag.ask("What is React?");

    expect(retriever.retrieve).toHaveBeenCalledWith("What is React?");
  });

  test("should build a prompt using the retrieved chunks", async () => {
    const chunks = [{ id: 1, text: "React is a library." }];

    retriever.retrieve.mockResolvedValue(chunks);

    promptBuilder.build.mockReturnValue("prompt");

    chatService.generate.mockResolvedValue("answer");

    await rag.ask("What is React?");

    expect(promptBuilder.build).toHaveBeenCalledWith({ question: "What is React?", chunks });
  });

  test("should generate an answer using the built prompt", async () => {
    retriever.retrieve.mockResolvedValue([]);

    promptBuilder.build.mockReturnValue("prompt");

    chatService.generate.mockResolvedValue("answer");

    await rag.ask("What is React?");

    expect(chatService.generate).toHaveBeenCalledWith({ prompt: "prompt" });
  });

  test("should return the generated answer", async () => {
    retriever.retrieve.mockResolvedValue([]);

    promptBuilder.build.mockReturnValue("prompt");

    chatService.generate.mockResolvedValue("React is a JavaScript library.");

    const answer = await rag.ask("What is React?");

    expect(answer.answer).toBe("React is a JavaScript library.");
  });

  test("should propagate errors from add()", async () => {
    chunker.mockImplementation(() => { throw new Error("Chunking failed"); });

    await expect(rag.add("React")).rejects.toThrow("Chunking failed");
  });

  test("should propagate errors from ask()", async () => {
    retriever.retrieve.mockRejectedValue(new Error("Retrieval failed"));

    await expect(rag.ask("What is React?")).rejects.toThrow("Retrieval failed");
  });
});