import { ChromaClient } from "chromadb";
import chunker from "../chunker.js";
import OllamaEmbeddingService from "../EmbeddingService/OllamaEmbeddingService.js";
import EmbeddingPipeline from "../embeddingPipeline.js";
import InMemoryVectorStore from "../vector-store/InMemoryVectorStore.js";
import Retriever from "../Retriever/Retriever.js";
import PromptBuilder from "../PromptBuilder/PromptBuilder.js";
import OllamaChatService from "../ChatService/OllamaChatService.js";
import RagApplication from "../RagApplication/RagApplication.js";
import ChromaVectorStore from "../vector-store/chormaVectorStore.js";
import LLMJudgeComparator from "../Comparator/LLMJudgeComparator.js";
import Evaluator from "../Evaluator/Evaluator.js";

const createEvaluator = async () => {
  const embeddingService = new OllamaEmbeddingService({
    baseUrl: "http://localhost:11434",
    model: "nomic-embed-text",
  });

  const embeddingPipeline = new EmbeddingPipeline({
    embeddingService,
  });

  const client = new ChromaClient({
    host: "localhost",
    port: 8000,
    ssl: false
  })
  const collection = await client.getOrCreateCollection({ name: "test", embeddingFunction: null })

  const vectorStore = new ChromaVectorStore({ collection });

  const retriever = new Retriever({
    embeddingService,
    vectorStore,
  });

  const promptBuilder = new PromptBuilder();

  const chatService = new OllamaChatService({
    baseUrl: "http://localhost:11434",
    model: "qwen3:14b",
  });

  const ragApplication = new RagApplication({
    chunker,
    embeddingPipeline,
    vectorStore,
    retriever,
    promptBuilder,
    chatService,
    chunkOptions: {
      chunkSize: 20,
      overlap: 8,
    }
  });

  const comparator = new LLMJudgeComparator({
    chatService,
  });

  const evaluator = new Evaluator({
    comparator,
    ragApplication,
  });

  return evaluator;
};

export default createEvaluator;