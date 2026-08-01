import { ChromaClient } from "chromadb";
import ChromaVectorStore from "./src/vector-store/chormaVectorStore.js";
import InMemoryVectorStore from "./src/vector-store/InMemoryVectorStore.js"
import chunker from "./src/chunker.js";
import OllamaEmbeddingService from "./src/EmbeddingService/OllamaEmbeddingService.js";
import EmbeddingPipeline from "./src/EmbeddingPipeline.js";
import OllamaChatService from "./src/ChatService/OllamaChatService.js"
import Retriever from "./src/Retriever/Retriever.js"
import PromptBuilder from "./src/PromptBuilder/PromptBuilder.js"
import RagApplication from "./src/RagApplication/RagApplication.js"
import CLI from "./frontend/CLI/cli.js"
import DocumentIngestionService from "./src/IngestionService/DocumentIngestionService.js";
import PdfExtractor from "./src/PdfExractor/PdfExtractor.js"
import QueryPipeline from "./src/QueryPipeline/QueryPipeline.js"

const main = async () => {
  const embeddingService = new OllamaEmbeddingService({ baseUrl: "http://127.0.0.1:11435", model: "nomic-embed-text", })
  const chatService = new OllamaChatService({ baseUrl: "http://localhost:11435", model: "qwen3:14b" })

  const client = new ChromaClient({
    host: "localhost",
    port: 8000,
    ssl: false
  })
  const collection = await client.getOrCreateCollection({ name: "test", embeddingFunction: null })

  const vectorStore = new ChromaVectorStore({ collection });

  const embeddingPipeline = new EmbeddingPipeline({ embeddingService });
  const retriever = new Retriever({ embeddingService, vectorStore })
  const promptBuilder = new PromptBuilder();

  const pdfExtractor = new PdfExtractor();

  const ingestionService = new DocumentIngestionService({
    pdfExtractor,
    chunker,
    embeddingPipeline,
    vectorStore
  });

  await ingestionService.ingestPdf({ filePath: "./public/pdfs/react-handbook.pdf" })
  console.log("Ingested");
  
  const queryPipeline = new QueryPipeline({ retriever, chatService, promptBuilder })
  const answer = await queryPipeline.ask({ question: "What are hooks in react?", topK: 12 });
  console.log(answer);
}

main();