import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkbox } from '@inquirer/prompts';

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

// Eval components
import Evaluator from "./Evaluator.js";
import metricRunners from "./metricRunners.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const setupDatabases = async () => {
    console.log("🧹 Connecting to databases and wiping old eval data...");
    const mongoDb = new MongoDatabase(process.env.MONGO_URI, "nexa_eval_db");
    await mongoDb.connect();
    await mongoDb.db.dropDatabase(); // Start fresh

    const client = getChromaClient();
    try { await client.deleteCollection({ name: "eval_KnowledgeBases" }); } catch (e) { /* Ignore */ }
    const collection = await client.getOrCreateCollection({ name: "eval_KnowledgeBases", embeddingFunction: null });
    
    try { await client.deleteCollection({ name: "eval_conversationMemory" }); } catch (e) { /* Ignore */ }
    const memoryCollection = await client.getOrCreateCollection({ name: "eval_conversationMemory", embeddingFunction: null });

    return { mongoDb, client, collection, memoryCollection };
};

const setupDependencies = (mongoDb, collection, memoryCollection) => {
    console.log("⚙️ Initializing backend dependencies...");
    const vectorStore = new ChromaVectorStore({ collection });
    const memoryVectorStore = new ChromaVectorStore({ collection: memoryCollection });
    const resourceStore = new MongoResourceStore(mongoDb);
    const conversationStore = new MongoConversationStore(mongoDb);
    
    const embeddingService = ServiceFactory.createEmbeddingService();
    const chatService = ServiceFactory.createChatService(); // llama3
    const embeddingPipeline = new EmbeddingPipeline({ embeddingService });
    
    const ingestionService = new DocumentIngestionService({
        pdfExtractor: new PdfExtractor(), chunker, embeddingPipeline, vectorStore, resourceStore
    });
    
    const retriever = new Retriever({ embeddingService, vectorStore });
    const conversationRetriever = new ConversationRetriever({ embeddingService, conversationMemoryStore: memoryVectorStore });
    
    const contextBuilder = new ContextBuilder({ tokenizer: new Tokenizer() });
    const promptBuilder = new PromptBuilder({ contextBuilder });

    const queryPipeline = new QueryPipeline({ 
        retriever, chatService, promptBuilder, conversationRetriever, conversationStore 
    });

    return { ingestionService, queryPipeline, resourceStore, evaluator: new Evaluator() };
};

const loadDataset = () => {
    const datasetPath = path.join(__dirname, 'dataset.json');
    return JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
};

const ingestScenarioData = async (data, ingestionService, resourceStore) => {
    console.log(`📥 Ingesting resource text...`);
    const kbId = `kb-${data.id}`;
    const resource = await resourceStore.create({
        knowledgeBaseId: kbId,
        name: "dummy.txt",
        type: "text"
    });

    await ingestionService.ingestText({
        text: data.resource_text,
        metadata: {},
        knowledgeBaseId: kbId,
        resourceId: resource.id,
        ingestionVersion: 1
    });

    return resource.id;
};

const evaluateScenario = async (data, resourceId, queryPipeline, evaluator, selectedMetrics) => {
    console.log(`🤖 Generating RAG answer with Llama3...`);
    const { answer, retrievedChunks } = await queryPipeline.ask({
        question: data.question,
        conversationId: `conv-${data.id}`,
        resourceIds: [resourceId],
        topK: 5
    });

    const contextStr = retrievedChunks.map(c => c.text).join('\n\n');
    const rankedChunksStr = retrievedChunks.map((c, i) => `[CHUNK ${i + 1}]:\n${c.text}`).join('\n\n');

    console.log(`⚖️ Grading with Qwen3...`);
    const resultObj = { id: data.id };
    
    const params = {
        evaluator,
        question: data.question,
        expectedAnswer: data.expected_answer,
        contextStr,
        rankedChunksStr,
        answer
    };

    for (const metric of selectedMetrics) {
        if (metricRunners[metric]) {
            resultObj[metric] = await metricRunners[metric](params);
        }
    }

    return resultObj;
};

const printResults = (results, selectedMetrics) => {
    console.log("\n=================================================");
    console.log("📊 EVALUATION RESULTS");
    
    if (results.length > 0) {
        const avgRow = { id: "AVERAGE" };
        for (const metric of selectedMetrics) {
            const total = results.reduce((sum, r) => sum + r[metric], 0);
            avgRow[metric] = parseFloat((total / results.length).toFixed(2));
        }
        results.push(avgRow);
    }

    console.table(results);
};

const teardownDatabases = async (mongoDb, client) => {
    console.log("🧹 Tearing down and cleaning databases...");
    await mongoDb.db.dropDatabase();
    await client.deleteCollection({ name: "eval_KnowledgeBases" });
    await client.deleteCollection({ name: "eval_conversationMemory" });
    await mongoDb.disconnect();
};

const runEvaluations = async () => {
    console.log("🚀 Starting RAG Evaluation Pipeline (Local Mode)");
    console.log("=================================================\n");

    const selectedMetrics = await checkbox({
        message: 'Which metrics do you want to run?',
        choices: [
            { name: 'Context Relevance (Precision)', value: 'ctx_relevance', checked: true },
            { name: 'Context Recall (Completeness)', value: 'ctx_recall', checked: true },
            { name: 'Context Precision (Ranking)', value: 'ctx_precision', checked: true },
            { name: 'Faithfulness (Hallucinations)', value: 'faithfulness', checked: true },
            { name: 'Answer Relevance', value: 'relevance', checked: true },
            { name: 'Answer Correctness', value: 'correctness', checked: true }
        ]
    });

    if (selectedMetrics.length === 0) {
        console.log("⚠️  No metrics selected. Exiting.");
        process.exit(0);
    }

    const { mongoDb, client, collection, memoryCollection } = await setupDatabases();
    const { ingestionService, queryPipeline, resourceStore, evaluator } = setupDependencies(mongoDb, collection, memoryCollection);
    
    const dataset = loadDataset();
    const results = [];

    for (const data of dataset) {
        console.log(`\n\n--- Evaluating: ${data.id} ---`);
        console.log(`Question: ${data.question}`);
        
        const resourceId = await ingestScenarioData(data, ingestionService, resourceStore);
        const scenarioResult = await evaluateScenario(data, resourceId, queryPipeline, evaluator, selectedMetrics);
        
        results.push(scenarioResult);
    }

    printResults(results, selectedMetrics);
    await teardownDatabases(mongoDb, client);
    
    console.log("✅ Done!");
    process.exit(0);
};

runEvaluations().catch(console.error);
