import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Force environment variables for safe local eval
process.env.AI_PROVIDER = 'local';
process.env.OLLAMA_CHAT_MODEL = 'llama3';
process.env.CHROMA_ENV = 'local';
process.env.MONGO_URI = 'mongodb://localhost:27017/nexa_eval_db';

// We import what we need from the backend
import { getChromaClient } from "../backend/src/config/chromaConfig.js";
import ChromaVectorStore from "../backend/src/vector-store/chormaVectorStore.js";
import chunker from "../backend/src/chunker.js";
import ServiceFactory from "../backend/src/config/ServiceFactory.js";
import EmbeddingPipeline from "../backend/src/EmbeddingPipeline.js";
import DocumentIngestionService from "../backend/src/IngestionService/DocumentIngestionService.js";
import PdfExtractor from "../backend/src/PdfExractor/PdfExtractor.js";
import Retriever from "../backend/src/Retriever/Retriever.js";
import PromptBuilder from "../backend/src/PromptBuilder/PromptBuilder.js";
import ContextBuilder from "../backend/src/PromptBuilder/ContextBuilder.js";
import Tokenizer from "../backend/src/Tokenizer/Tokenizer.js";
import MongoDatabase from "../backend/src/database/MongoDatabase.js";
import MongoConversationStore from "../backend/src/Conversation/MongoConversationStore.js";
import ConversationRetriever from "../backend/src/Conversation/ConversationRetriever.js";
import QueryPipeline from "../backend/src/QueryPipeline/QueryPipeline.js";
import MongoResourceStore from "../backend/src/KnowledgeBase/MongoResourceStore.js";
import Evaluator from "./Evaluator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runEvaluations() {
    console.log("🚀 Starting RAG Evaluation Pipeline (Local Mode)");
    console.log("=================================================");

    // 1. Connect and clean up databases
    console.log("🧹 Connecting to databases and wiping old eval data...");
    const mongoDb = new MongoDatabase(process.env.MONGO_URI, "nexa_eval_db");
    await mongoDb.connect();
    await mongoDb.db.dropDatabase(); // Start fresh

    const client = getChromaClient();
    try {
        await client.deleteCollection({ name: "eval_KnowledgeBases" });
    } catch (e) { /* Ignore if it doesn't exist */ }
    const collection = await client.getOrCreateCollection({ name: "eval_KnowledgeBases", embeddingFunction: null });
    
    // Memory store (needed for pipeline)
    try {
        await client.deleteCollection({ name: "eval_conversationMemory" });
    } catch (e) { /* Ignore */ }
    const memoryCollection = await client.getOrCreateCollection({ name: "eval_conversationMemory", embeddingFunction: null });

    // 2. Initialize Backend Dependencies
    console.log("⚙️ Initializing backend dependencies...");
    const vectorStore = new ChromaVectorStore({ collection });
    const memoryVectorStore = new ChromaVectorStore({ collection: memoryCollection });
    const resourceStore = new MongoResourceStore(mongoDb);
    const conversationStore = new MongoConversationStore(mongoDb);
    
    const embeddingService = ServiceFactory.createEmbeddingService();
    const chatService = ServiceFactory.createChatService(); // llama3
    
    const embeddingPipeline = new EmbeddingPipeline({ embeddingService });
    const pdfExtractor = new PdfExtractor();
    
    const ingestionService = new DocumentIngestionService({
        pdfExtractor, chunker, embeddingPipeline, vectorStore, resourceStore
    });
    
    const retriever = new Retriever({ embeddingService, vectorStore });
    const conversationRetriever = new ConversationRetriever({ embeddingService, conversationMemoryStore: memoryVectorStore });
    
    const tokenizer = new Tokenizer();
    const contextBuilder = new ContextBuilder({ tokenizer });
    const promptBuilder = new PromptBuilder({ contextBuilder });

    const queryPipeline = new QueryPipeline({ 
        retriever, 
        chatService, 
        promptBuilder,
        conversationRetriever,
        conversationStore
    });

    const evaluator = new Evaluator(); // qwen3:14b

    // 3. Load Dataset
    const datasetPath = path.join(__dirname, 'dataset.json');
    const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

    const results = [];

    // 4. Run Evals
    for (const data of dataset) {
        console.log(`\n\n--- Evaluating: ${data.id} ---`);
        console.log(`Question: ${data.question}`);
        
        // Setup dummy resource in DB
        const kbId = `kb-${data.id}`;
        const resource = await resourceStore.create({
            knowledgeBaseId: kbId,
            name: "dummy.txt",
            type: "text"
        });
        const resourceId = resource.id;

        // Ingest the text
        console.log(`📥 Ingesting resource text...`);
        await ingestionService.ingestText({
            text: data.resource_text,
            metadata: {},
            knowledgeBaseId: kbId,
            resourceId,
            ingestionVersion: 1
        });

        // Run the query pipeline
        console.log(`🤖 Generating RAG answer with Llama3...`);
        const { answer, retrievedChunks } = await queryPipeline.ask({
            question: data.question,
            conversationId: `conv-${data.id}`,
            resourceIds: [resourceId],
            topK: 5
        });

        console.log(`Answer: ${answer}`);
        
        const contextStr = retrievedChunks.map(c => c.text).join('\n\n');

        // Evaluate using Qwen3
        console.log(`⚖️ Grading with Qwen3...`);
        const faithfulnessResult = await evaluator.evaluateFaithfulness(data.question, contextStr, answer);
        const relevanceResult = await evaluator.evaluateRelevance(data.question, contextStr, answer);
        const correctnessResult = await evaluator.evaluateCorrectness(data.question, data.expected_answer, answer);

        console.log(`↳ Faithfulness: ${faithfulnessResult.score}/5 (${faithfulnessResult.reasoning})`);
        console.log(`↳ Relevance:    ${relevanceResult.score}/5 (${relevanceResult.reasoning})`);
        console.log(`↳ Correctness:  ${correctnessResult.score}/5 (${correctnessResult.reasoning})`);

        results.push({
            id: data.id,
            faithfulness: faithfulnessResult.score,
            relevance: relevanceResult.score,
            correctness: correctnessResult.score
        });
    }

    // 5. Output Summary and Teardown
    console.log("\n=================================================");
    console.log("📊 EVALUATION RESULTS");
    
    if (results.length > 0) {
        const totalFaithfulness = results.reduce((sum, r) => sum + r.faithfulness, 0);
        const totalRelevance = results.reduce((sum, r) => sum + r.relevance, 0);
        const totalCorrectness = results.reduce((sum, r) => sum + r.correctness, 0);
        
        results.push({
            id: "AVERAGE",
            faithfulness: parseFloat((totalFaithfulness / (results.length)).toFixed(2)),
            relevance: parseFloat((totalRelevance / (results.length)).toFixed(2)),
            correctness: parseFloat((totalCorrectness / (results.length)).toFixed(2))
        });
    }

    console.table(results);

    console.log("🧹 Tearing down and cleaning databases...");
    await mongoDb.db.dropDatabase();
    await client.deleteCollection({ name: "eval_KnowledgeBases" });
    await client.deleteCollection({ name: "eval_conversationMemory" });
    
    console.log("✅ Done!");
    process.exit(0);
}

runEvaluations().catch(console.error);
