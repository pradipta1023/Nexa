export default class QueryApiService {
    constructor({ 
        queryPipeline, 
        profileRegistry,
        conversationStore,
        conversationIndexer,
        conversationSummarizer,
        tokenizer
    }) {
        this.queryPipeline = queryPipeline;
        this.profileRegistry = profileRegistry;
        this.conversationStore = conversationStore;
        this.conversationIndexer = conversationIndexer;
        this.conversationSummarizer = conversationSummarizer;
        this.tokenizer = tokenizer;
    }

    async ask({ question, profileName, conversationId, resourceIds }) {
        const config = this.profileRegistry.get(profileName);
        if (!config) throw new Error("Invalid profile");

        await this.conversationStore.createConversation(conversationId);

        // Delegate to the underlying QueryPipeline
        const result = await this.queryPipeline.ask({ 
            question, 
            conversationId,
            topK: config.topK, 
            resourceIds,
            config 
        });
        
        this.#doPostProcessing(question, result.answer, conversationId);

        // Strip out retrievedChunks, prompts, and metadata, returning only the answer
        return {
            answer: result.answer
        };
    }

    async *askStream({ question, profileName, conversationId, resourceIds }) {
        const config = this.profileRegistry.get(profileName);
        if (!config) throw new Error("Invalid profile");

        await this.conversationStore.createConversation(conversationId);

        const stream = this.queryPipeline.askStream({ question, conversationId, resourceIds, config });
        
        let fullAnswer = "";
        for await (const chunk of stream) {
            fullAnswer += chunk;
            yield chunk;
        }

        this.#doPostProcessing(question, fullAnswer, conversationId);
    }

    #doPostProcessing(question, answer, conversationId) {
        if (!answer || answer.trim() === '') {
            console.warn(`[QueryApiService] Skipping post-processing for conversation ${conversationId} because answer was empty.`);
            return;
        }

        setImmediate(async () => {
            try {
                const tokenCount = this.tokenizer.countTokens(question + " " + answer);
                
                const turn = await this.conversationStore.addTurn(conversationId, {
                    userMessage: question,
                    assistantResponse: answer,
                    tokenCount
                });

                await this.conversationIndexer.indexTurn({
                    conversationId,
                    turnId: turn.turnId,
                    userMessage: question,
                    assistantResponse: answer,
                    timestamp: turn.timestamp
                });

                await this.conversationSummarizer.summarizeIfNeeded(conversationId);
            } catch (bgError) {
                console.error("[QueryApiService] Background conversation processing failed:", bgError);
            }
        });
    }
}

