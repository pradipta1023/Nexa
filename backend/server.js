import express from 'express';
import { ChromaClient } from "chromadb";
import ChromaVectorStore from "./src/vector-store/chormaVectorStore.js";
import chunker from "./src/chunker.js";
import OllamaEmbeddingService from "./src/EmbeddingService/OllamaEmbeddingService.js";
import EmbeddingPipeline from "./src/EmbeddingPipeline.js";
import DocumentIngestionService from "./src/IngestionService/DocumentIngestionService.js";
import PdfExtractor from "./src/PdfExractor/PdfExtractor.js";
import IngestionApiService from "./src/api/IngestionApiService.js";
import IngestionController from "./src/controllers/IngestionController.js";
import createIngestionRoutes from "./src/routes/ingestionRoutes.js";
import OllamaChatService from "./src/ChatService/OllamaChatService.js";
import Retriever from "./src/Retriever/Retriever.js";
import PromptBuilder from "./src/PromptBuilder/PromptBuilder.js";
import QueryPipeline from "./src/QueryPipeline/QueryPipeline.js";
import QueryApiService from "./src/api/QueryApiService.js";
import QueryController from "./src/controllers/QueryController.js";
import createQueryRoutes from "./src/routes/queryRoutes.js";
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerDocument = YAML.load(path.join(__dirname, 'docs', 'swagger.yaml'));

const app = express();
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const initializeDependencies = async () => {
  const embeddingService = new OllamaEmbeddingService({ baseUrl: "http://127.0.0.1:11435", model: "nomic-embed-text" });
  
  const client = new ChromaClient({
    host: "localhost",
    port: 8000,
    ssl: false
  });
  const collection = await client.getOrCreateCollection({ name: "test", embeddingFunction: null });
  const vectorStore = new ChromaVectorStore({ collection });
  
  const embeddingPipeline = new EmbeddingPipeline({ embeddingService });
  const pdfExtractor = new PdfExtractor();

  const ingestionService = new DocumentIngestionService({
    pdfExtractor,
    chunker,
    embeddingPipeline,
    vectorStore
  });

  const ingestionApiService = new IngestionApiService({ documentIngestionService: ingestionService });
  const ingestionController = new IngestionController({ ingestionApiService });

  const chatService = new OllamaChatService({ baseUrl: "http://localhost:11435", model: "qwen3:14b" });
  const retriever = new Retriever({ embeddingService, vectorStore });
  const promptBuilder = new PromptBuilder();
  const queryPipeline = new QueryPipeline({ retriever, chatService, promptBuilder });
  
  const queryApiService = new QueryApiService({ queryPipeline });
  const queryController = new QueryController({ queryApiService });

  return { ingestionService, ingestionController, queryController };
};

const startServer = async () => {
    try {
        const dependencies = await initializeDependencies();
        
        // Attach routes
        const ingestionRoutes = createIngestionRoutes({ 
            ingestionController: dependencies.ingestionController 
        });
        app.use('/api/ingest', ingestionRoutes);

        const queryRoutes = createQueryRoutes({
            queryController: dependencies.queryController
        });
        app.use('/api/query', queryRoutes);

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();
