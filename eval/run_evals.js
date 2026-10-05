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

const evaluateScenario = async (data, resourceId, queryPipeline, evaluator) => {
    console.log(`🤖 Generating RAG answer with Llama3...`);
    const { answer, retrievedChunks } = await queryPipeline.ask({
        question: data.question,
        conversationId: `conv-${data.id}`,
        resourceIds: [resourceId],
        topK: 5
    });

    const contextStr = retrievedChunks.map(c => c.text).join('\n\n');

    console.log(`⚖️ Grading with Qwen3...`);
    const ctxRelevanceResult = await evaluator.evaluateContextRelevance(data.question, contextStr);
    const ctxRecallResult = await evaluator.evaluateContextRecall(data.question, data.expected_answer, contextStr);
    const faithfulnessResult = await evaluator.evaluateFaithfulness(data.question, contextStr, answer);
    const relevanceResult = await evaluator.evaluateRelevance(data.question, contextStr, answer);
    const correctnessResult = await evaluator.evaluateCorrectness(data.question, data.expected_answer, answer);

    console.log(`↳ Ctx Relevance: ${ctxRelevanceResult.score}/5 (${ctxRelevanceResult.reasoning})`);
    console.log(`↳ Ctx Recall:    ${ctxRecallResult.score}/5 (${ctxRecallResult.reasoning})`);
    console.log(`↳ Faithfulness:  ${faithfulnessResult.score}/5 (${faithfulnessResult.reasoning})`);
    console.log(`↳ Relevance:     ${relevanceResult.score}/5 (${relevanceResult.reasoning})`);
    console.log(`↳ Correctness:   ${correctnessResult.score}/5 (${correctnessResult.reasoning})`);

    return {
        id: data.id,
        ctx_relevance: ctxRelevanceResult.score,
        ctx_recall: ctxRecallResult.score,
        faithfulness: faithfulnessResult.score,
        relevance: relevanceResult.score,
        correctness: correctnessResult.score
    };
};

const printResults = (results) => {
    console.log("\n=================================================");
    console.log("📊 EVALUATION RESULTS");
    
    if (results.length > 0) {
        const totalCtxRel = results.reduce((sum, r) => sum + r.ctx_relevance, 0);
        const totalCtxRec = results.reduce((sum, r) => sum + r.ctx_recall, 0);
        const totalFaithfulness = results.reduce((sum, r) => sum + r.faithfulness, 0);
        const totalRelevance = results.reduce((sum, r) => sum + r.relevance, 0);
        const totalCorrectness = results.reduce((sum, r) => sum + r.correctness, 0);
        
        results.push({
            id: "AVERAGE",
            ctx_relevance: parseFloat((totalCtxRel / results.length).toFixed(2)),
            ctx_recall: parseFloat((totalCtxRec / results.length).toFixed(2)),
            faithfulness: parseFloat((totalFaithfulness / results.length).toFixed(2)),
            relevance: parseFloat((totalRelevance / results.length).toFixed(2)),
            correctness: parseFloat((totalCorrectness / results.length).toFixed(2))
        });
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
    console.log("=================================================");

    const { mongoDb, client, collection, memoryCollection } = await setupDatabases();
    const { ingestionService, queryPipeline, resourceStore, evaluator } = setupDependencies(mongoDb, collection, memoryCollection);
    
    const dataset = loadDataset();
    const results = [];

    for (const data of dataset) {
        console.log(`\n\n--- Evaluating: ${data.id} ---`);
        console.log(`Question: ${data.question}`);
        
        const resourceId = await ingestScenarioData(data, ingestionService, resourceStore);
        const scenarioResult = await evaluateScenario(data, resourceId, queryPipeline, evaluator);
        
        results.push(scenarioResult);
    }

    printResults(results);
    await teardownDatabases(mongoDb, client);
    
    console.log("✅ Done!");
    process.exit(0);
};

runEvaluations().catch(console.error);
