import { ChromaClient } from "chromadb";
import ChromaVectorStore from "./src/vector-store/chormaVectorStore.js";
import OllamaEmbeddingService from "./src/EmbeddingService/OllamaEmbeddingService.js";
import ConversationRetriever from "./src/Conversation/ConversationRetriever.js";
import Retriever from "./src/Retriever/Retriever.js";
import OllamaChatService from "./src/ChatService/OllamaChatService.js";
import PromptBuilder from "./src/PromptBuilder/PromptBuilder.js";
import ContextBuilder from "./src/PromptBuilder/ContextBuilder.js";
import Tokenizer from "./src/Tokenizer/Tokenizer.js";
import InMemoryConversationStore from "./src/Conversation/InMemoryConversationStore.js";
import QueryPipeline from "./src/QueryPipeline/QueryPipeline.js";

async function run() {
  const embeddingService = new OllamaEmbeddingService({ baseUrl: "http://127.0.0.1:11435", model: "nomic-embed-text" });
  const client = new ChromaClient({ host: "localhost", port: 8000, ssl: false });
  const memoryCollection = await client.getOrCreateCollection({ name: "memory", embeddingFunction: null });
  const memoryVectorStore = new ChromaVectorStore({ collection: memoryCollection });

  const testCollection = await client.getOrCreateCollection({ name: "test", embeddingFunction: null });
  const vectorStore = new ChromaVectorStore({ collection: testCollection });

  const retriever = new Retriever({ embeddingService, vectorStore });
  const conversationRetriever = new ConversationRetriever({ embeddingService, conversationMemoryStore: memoryVectorStore });
  
  const chatService = new OllamaChatService({ baseUrl: "http://127.0.0.1:11435", model: "qwen3:14b" });
  const tokenizer = new Tokenizer();
  const contextBuilder = new ContextBuilder({ tokenizer });
  const promptBuilder = new PromptBuilder({ contextBuilder });
  const conversationStore = new InMemoryConversationStore();

  const queryPipeline = new QueryPipeline({ 
      retriever, 
      chatService, 
      promptBuilder,
      conversationRetriever,
      conversationStore
  });

  const question = "what are props in React?";
  const conversationId = "test-conv-no-answer";
  conversationStore.createConversation(conversationId);

  const stream = queryPipeline.askStream({ 
      question, 
      conversationId, 
      config: { model: "qwen3:14b", temperature: 0.1 } 
  });

  console.log("Starting stream...");
  try {
    for await (const chunk of stream) {
      process.stdout.write(chunk);
    }
    console.log("\nDone");
  } catch (e) {
    console.log("Error in stream:", e);
  }
}

run().catch(console.error);
