import { DEFAULT_PROFILE } from '../profiles/constants.js';

export default class QueryController {
    constructor({ queryApiService, profileRegistry }) {
        this.queryApiService = queryApiService;
        this.profileRegistry = profileRegistry;
    }

    ask = async (req, res) => {
        try {
            const { question, profile } = req.body;

            // 1. Validate 'question'
            if (!question || typeof question !== 'string' || question.trim() === '') {
                return res.status(400).json({
                    error: "The 'question' field is required and must be a non-empty string."
                });
            }

            // 2. Validate 'profile'
            const profileName = profile || DEFAULT_PROFILE;
            if (!this.profileRegistry.isValid(profileName)) {
                return res.status(400).json({
                    error: `Invalid profile provided: ${profile}`
                });
            }

            // 3. Call the API service depending on streaming config
            const config = this.profileRegistry.get(profileName);
            
            if (config.streaming) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                const stream = await this.queryApiService.askStream({ question, profileName });
                
                for await (const token of stream) {
                    res.write(`data: ${JSON.stringify({ token })}\n\n`);
                }
                res.write(`data: [DONE]\n\n`);
                return res.end();
            } else {
                const result = await this.queryApiService.ask({ question, profileName });
                return res.status(200).json({ answer: result.answer });
            }

        } catch (error) {
            console.error("Error during query execution:", error);
            return res.status(500).json({
                error: "An unexpected error occurred during the query."
            });
        }
    }
}

