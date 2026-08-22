import { DEFAULT_PROFILE } from '../profiles/constants.js';

export default class QueryController {
    constructor({ queryApiService, profileRegistry }) {
        this.queryApiService = queryApiService;
        this.profileRegistry = profileRegistry;
    }

    ask = async (req, res) => {
        try {
            const { question, profile, conversationId, resourceIds } = req.body;

            // 1. Validate 'question'
            if (!question || typeof question !== 'string' || question.trim() === '') {
                return res.status(400).json({
                    error: "The 'question' field is required and must be a non-empty string."
                });
            }

            // 2. Validate 'conversationId'
            if (!conversationId || typeof conversationId !== 'string' || conversationId.trim() === '') {
                return res.status(400).json({
                    error: "The 'conversationId' field is required and must be a non-empty string."
                });
            }

            // 3. Validate 'profile'
            const profileName = profile || DEFAULT_PROFILE;
            if (!this.profileRegistry.isValid(profileName)) {
                return res.status(400).json({
                    error: `Invalid profile provided: ${profile}`
                });
            }

            // 4. Call the API service depending on streaming config
            const config = this.profileRegistry.get(profileName);
            
            if (config.streaming) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                const stream = await this.queryApiService.askStream({ question, profileName, conversationId, resourceIds });
                
                for await (const token of stream) {
                    res.write(`data: ${JSON.stringify({ token })}\n\n`);
                }
                res.write(`data: [DONE]\n\n`);
                return res.end();
            } else {
                const result = await this.queryApiService.ask({ question, profileName, conversationId, resourceIds });
                return res.status(200).json({ answer: result.answer });
            }

        } catch (error) {
            console.error("Error during query execution:", error);
            if (res.headersSent) {
                // If headers are already sent, we are in the middle of an SSE stream.
                // We cannot send a 500 status code, so we inject the error into the stream.
                res.write(`data: ${JSON.stringify({ token: `\n\n**System Error:** ${error.message}` })}\n\n`);
                res.write(`data: [DONE]\n\n`);
                return res.end();
            } else {
                return res.status(500).json({
                    error: error.message || "An unexpected error occurred during the query."
                });
            }
        }
    }
}

