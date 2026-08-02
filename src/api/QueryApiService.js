export default class QueryApiService {
    constructor({ queryPipeline }) {
        this.queryPipeline = queryPipeline;
    }

    async ask({ question, topK }) {
        // Delegate to the underlying QueryPipeline
        const result = await this.queryPipeline.ask({ question, topK });
        
        // Strip out retrievedChunks, prompts, and metadata, returning only the answer
        return {
            answer: result.answer
        };
    }
}
