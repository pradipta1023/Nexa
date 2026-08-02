export default class IngestionController {
    constructor({ ingestionApiService }) {
        this.ingestionApiService = ingestionApiService;
    }

    ingestText = async (req, res) => {
        try {
            const { text, metadata } = req.body;

            // 1. Validate HTTP input
            if (!text || typeof text !== 'string' || text.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: "The 'text' field is required and must be a non-empty string."
                });
            }

            // 2. Call the API service
            const result = await this.ingestionApiService.ingestText({ 
                text, 
                metadata
            });

            // 3. Return the HTTP response
            return res.status(201).json({
                success: true,
                message: 'Text ingested successfully',
                chunksStored: result.chunksStored
            });

        } catch (error) {
            // 4. Handle HTTP-specific errors
            console.error("Error during text ingestion:", error);
            return res.status(500).json({
                success: false,
                error: error.message || "An unexpected error occurred during text ingestion."
            });
        }
    }
}
