export default class QueryController {
    constructor({ queryApiService }) {
        this.queryApiService = queryApiService;
    }

    ask = async (req, res) => {
        try {
            const { question, topK } = req.body;

            // 1. Validate 'question'
            if (!question || typeof question !== 'string' || question.trim() === '') {
                return res.status(400).json({
                    error: "The 'question' field is required and must be a non-empty string."
                });
            }

            // 2. Validate 'topK' (Optional, defaults to 10)
            let validTopK = 10;
            if (topK !== undefined) {
                if (typeof topK !== 'number' || !Number.isInteger(topK) || topK <= 0) {
                    return res.status(400).json({
                        error: "The 'topK' field must be a positive integer."
                    });
                }
                validTopK = topK;
            }

            // 3. Call the API service
            const result = await this.queryApiService.ask({ 
                question, 
                topK: validTopK 
            });

            // 4. Return the HTTP response (Answer only)
            return res.status(200).json({
                answer: result.answer
            });

        } catch (error) {
            console.error("Error during query execution:", error);
            return res.status(500).json({
                error: "An unexpected error occurred during the query."
            });
        }
    }
}
