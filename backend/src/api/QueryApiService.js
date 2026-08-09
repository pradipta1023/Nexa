export default class QueryApiService {
    constructor({ queryPipeline, profileRegistry }) {
        this.queryPipeline = queryPipeline;
        this.profileRegistry = profileRegistry;
    }

    async ask({ question, profileName }) {
        const config = this.profileRegistry.get(profileName);
        if (!config) throw new Error("Invalid profile");

        // Delegate to the underlying QueryPipeline
        const result = await this.queryPipeline.ask({ 
            question, 
            topK: config.topK, 
            config 
        });
        
        // Strip out retrievedChunks, prompts, and metadata, returning only the answer
        return {
            answer: result.answer
        };
    }

    async askStream({ question, profileName }) {
        const config = this.profileRegistry.get(profileName);
        if (!config) throw new Error("Invalid profile");

        return this.queryPipeline.askStream({ question, config });
    }
}

