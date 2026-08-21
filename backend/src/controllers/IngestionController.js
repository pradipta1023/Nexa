export default class IngestionController {
    constructor({ ingestionApiService }) {
        this.ingestionApiService = ingestionApiService;
    }

    ingestText = async (req, res) => {
        try {
            const { knowledgeBaseId, resourceId } = req.params;
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
                metadata,
                knowledgeBaseId,
                resourceId
            });

            // 3. Return the HTTP response
            return res.status(201).json({
                success: true,
                message: 'Text ingested successfully',
                chunksStored: result.chunksStored
            });

        } catch (error) {
            // 4. Handle HTTP-specific errors
            if (error.message.startsWith('Resource not found')) {
                return res.status(404).json({ success: false, error: error.message });
            }
            console.error("Error during text ingestion:", error);
            return res.status(500).json({
                success: false,
                error: error.message || "An unexpected error occurred during text ingestion."
            });
        }
    }

    ingestPdf = async (req, res) => {
        try {
            const { knowledgeBaseId, resourceId } = req.params;

            // 1. Validate HTTP input
            if (!req.file || req.file.mimetype !== 'application/pdf') {
                return res.status(400).json({
                    error: "A valid PDF file is required."
                });
            }

            // Parse metadata if provided
            let parsedMetadata = undefined;
            if (req.body.metadata) {
                try {
                    parsedMetadata = JSON.parse(req.body.metadata);
                } catch (e) {
                    return res.status(400).json({
                        error: "The 'metadata' field must be a valid JSON string."
                    });
                }
            }

            // 2. Call the API service
            const result = await this.ingestionApiService.ingestPdf({ 
                pdfData: req.file.buffer, 
                metadata: parsedMetadata,
                knowledgeBaseId,
                resourceId
            });

            // 3. Return the HTTP response
            return res.status(201).json({
                message: 'PDF ingested successfully.',
                chunksStored: result.chunksStored
            });

        } catch (error) {
            // 4. Handle HTTP-specific errors
            if (error.message.startsWith('Resource not found')) {
                return res.status(404).json({ error: error.message });
            }
            console.error("Error during PDF ingestion:", error);
            return res.status(500).json({
                error: error.message || "An unexpected error occurred during PDF ingestion."
            });
        }
    }
}
