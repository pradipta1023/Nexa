import express from 'express';
import dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'] });

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
import GeminiChatService from "./src/ChatService/GeminiChatService.js";
import Retriever from "./src/Retriever/Retriever.js";
import PromptBuilder from "./src/PromptBuilder/PromptBuilder.js";
import ContextBuilder from "./src/PromptBuilder/ContextBuilder.js";
import Tokenizer from "./src/Tokenizer/Tokenizer.js";
import AppDatabase from "./src/database/AppDatabase.js";
import SqliteConversationStore from "./src/Conversation/SqliteConversationStore.js";
import ConversationIndexer from "./src/Conversation/ConversationIndexer.js";
import ConversationRetriever from "./src/Conversation/ConversationRetriever.js";
import ConversationSummarizer from "./src/Conversation/ConversationSummarizer.js";
import QueryPipeline from "./src/QueryPipeline/QueryPipeline.js";
import QueryApiService from "./src/api/QueryApiService.js";
import QueryController from "./src/controllers/QueryController.js";
import createQueryRoutes from "./src/routes/queryRoutes.js";
import ProfileRegistry from "./src/profiles/ProfileRegistry.js";
import KnowledgeBaseStore from "./src/KnowledgeBase/KnowledgeBaseStore.js";
import ResourceStore from "./src/KnowledgeBase/ResourceStore.js";
import CleanupJobStore from "./src/KnowledgeBase/CleanupJobStore.js";
import CleanupRunner from "./src/KnowledgeBase/CleanupRunner.js";
import KnowledgeBaseApiService from "./src/api/KnowledgeBaseApiService.js";
import KnowledgeBaseController from "./src/controllers/KnowledgeBaseController.js";
import ResourceApiService from "./src/api/ResourceApiService.js";
import ResourceController from "./src/controllers/ResourceController.js";
import createKnowledgeBaseRoutes from "./src/routes/knowledgeBaseRoutes.js";
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
  // Single shared SQLite connection — all stores receive this instance by injection.
  const appDb = new AppDatabase(path.join(__dirname, 'conversations.sqlite'));
  const conversationStore = new SqliteConversationStore(appDb.db);
  const kbStore = new KnowledgeBaseStore(appDb.db);
  const resourceStore = new ResourceStore(appDb.db);
  const cleanupJobStore = new CleanupJobStore(appDb.db);

  const kbApiService = new KnowledgeBaseApiService({ kbStore, resourceStore, cleanupJobStore });
  const kbController = new KnowledgeBaseController({ kbApiService });

  const resourceApiService = new ResourceApiService({ resourceStore, kbStore, cleanupJobStore });
  const resourceController = new ResourceController({ resourceApiService });

  const embeddingService = new OllamaEmbeddingService({ baseUrl: "http://127.0.0.1:11435", model: "nomic-embed-text" });
  
  const client = new ChromaClient({
    host: "localhost",
    port: 8000,
    ssl: false
  });
  const collection = await client.getOrCreateCollection({ name: "test", embeddingFunction: null });
  const vectorStore = new ChromaVectorStore({ collection });

  const memoryCollection = await client.getOrCreateCollection({ name: "memory", embeddingFunction: null });
  const memoryVectorStore = new ChromaVectorStore({ collection: memoryCollection });
  
  const cleanupRunner = new CleanupRunner({ cleanupJobStore, vectorStore });
  cleanupRunner.start();
  
  const embeddingPipeline = new EmbeddingPipeline({ embeddingService });
  const pdfExtractor = new PdfExtractor();

  const ingestionService = new DocumentIngestionService({
    pdfExtractor,
    chunker,
    embeddingPipeline,
    vectorStore,
    resourceStore
  });

  const ingestionApiService = new IngestionApiService({
      documentIngestionService: ingestionService,
      resourceStore,
      cleanupJobStore
  });
  const ingestionController = new IngestionController({ ingestionApiService });

  const chatService = new GeminiChatService();
  const retriever = new Retriever({ embeddingService, vectorStore });
  
  // -- Memory System --
  const tokenizer = new Tokenizer();
  const contextBuilder = new ContextBuilder({ tokenizer });
  const promptBuilder = new PromptBuilder({ contextBuilder });


  const conversationIndexer = new ConversationIndexer({ embeddingService, conversationMemoryStore: memoryVectorStore });
  const conversationRetriever = new ConversationRetriever({ embeddingService, conversationMemoryStore: memoryVectorStore });
  const conversationSummarizer = new ConversationSummarizer({ 
      conversationStore, 
      conversationIndexer, 
      chatService 
  });
  // ------------------

  const queryPipeline = new QueryPipeline({ 
      retriever, 
      chatService, 
      promptBuilder,
      conversationRetriever,
      conversationStore
  });
  
  const profileRegistry = new ProfileRegistry();
  const queryApiService = new QueryApiService({ 
      queryPipeline, 
      profileRegistry,
      conversationStore,
      conversationIndexer,
      conversationSummarizer,
      tokenizer
  });
  
  const queryController = new QueryController({ 
      queryApiService, 
      profileRegistry
  });

  return { ingestionService, ingestionController, queryController, kbController, resourceController };
};

const startServer = async () => {
    try {
        const dependencies = await initializeDependencies();
        
        // Attach routes
        const ingestionRoutes = createIngestionRoutes({ 
            ingestionController: dependencies.ingestionController 
        });
        app.use('/api/knowledge-bases/:knowledgeBaseId/resources/:resourceId/ingest', ingestionRoutes);

        const queryRoutes = createQueryRoutes({
            queryController: dependencies.queryController
        });
        app.use('/api/query', queryRoutes);

        const kbRoutes = createKnowledgeBaseRoutes({
            kbController: dependencies.kbController,
            resourceController: dependencies.resourceController
        });
        app.use('/api/knowledge-bases', kbRoutes);

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
