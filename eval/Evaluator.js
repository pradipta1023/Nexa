import { 
    FAITHFULNESS_PROMPT, 
    RELEVANCE_PROMPT, 
    CORRECTNESS_PROMPT,
    CONTEXT_RELEVANCE_PROMPT,
    CONTEXT_RECALL_PROMPT
} from './prompts.js';
import OllamaChatService from '../backend/src/ChatService/OllamaChatService.js';

export default class Evaluator {
    constructor() {
        // Hardcode the Judge to use qwen3:14b on local Ollama
        this.judgeModel = 'qwen3:14b';
        // Connect to local Ollama (assumes default port 11434)
        this.chatService = new OllamaChatService({ baseUrl: 'http://localhost:11434' });
    }

    evaluateFaithfulness = async (question, context, answer) => {
        const prompt = FAITHFULNESS_PROMPT(question, context, answer);
        return this.#grade(prompt);
    };

    evaluateRelevance = async (question, context, answer) => {
        const prompt = RELEVANCE_PROMPT(question, context, answer);
        return this.#grade(prompt);
    };

    evaluateCorrectness = async (question, expectedAnswer, answer) => {
        const prompt = CORRECTNESS_PROMPT(question, expectedAnswer, answer);
        return this.#grade(prompt);
    };

    evaluateContextRelevance = async (question, context) => {
        const prompt = CONTEXT_RELEVANCE_PROMPT(question, context);
        return this.#grade(prompt);
    };

    evaluateContextRecall = async (question, expectedAnswer, context) => {
        const prompt = CONTEXT_RECALL_PROMPT(question, expectedAnswer, context);
        return this.#grade(prompt);
    };

    #grade = async (prompt) => {
        try {
            const responseText = await this.chatService.generate({
                prompt: prompt,
                model: this.judgeModel
            });
            
            return this.#parseJsonResponse(responseText);
        } catch (error) {
            console.error("[Evaluator] Failed to grade:", error.message);
            return { score: 0, reasoning: "Evaluation failed." };
        }
    };

    #parseJsonResponse = (text) => {
        try {
            // Qwen3 might wrap JSON in markdown block ```json ... ```
            // This safely strips the formatting before parsing
            let cleaned = text.trim();
            if (cleaned.startsWith('```json')) {
                cleaned = cleaned.replace('```json', '');
            }
            if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace('```', '');
            }
            if (cleaned.endsWith('```')) {
                cleaned = cleaned.slice(0, -3);
            }
            
            return JSON.parse(cleaned.trim());
        } catch (error) {
            console.error("[Evaluator] Failed to parse JSON from LLM. Raw output:", text);
            return { score: 0, reasoning: "Failed to parse judge output." };
        }
    };
}
