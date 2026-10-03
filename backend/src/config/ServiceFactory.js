import GeminiChatService from '../ChatService/GeminiChatService.js';
import GeminiEmbeddingService from '../EmbeddingService/GeminiEmbeddingService.js';
import OllamaChatService from '../ChatService/OllamaChatService.js';
import OllamaEmbeddingService from '../EmbeddingService/OllamaEmbeddingService.js';

class ServiceFactory {
    static createChatService() {
        const provider = process.env.AI_PROVIDER || 'cloud';
        
        if (provider === 'local') {
            return new OllamaChatService();
        }
        
        return new GeminiChatService();
    }

    static createEmbeddingService() {
        const provider = process.env.AI_PROVIDER || 'cloud';
        
        if (provider === 'local') {
            return new OllamaEmbeddingService();
        }
        
        return new GeminiEmbeddingService({ apiKey: process.env.GEMINI_API_KEY });
    }
}

export default ServiceFactory;
