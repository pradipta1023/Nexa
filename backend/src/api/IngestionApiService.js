export default class IngestionApiService {
    constructor({ documentIngestionService }) {
        this.documentIngestionService = documentIngestionService;
    }

    async ingestText({ text, metadata }) {
        // Coordinate the business flow. In this case, we delegate to the existing
        // DocumentIngestionService which handles chunking, embedding, and storing.
        const payload = { text };
        if (metadata && Object.keys(metadata).length > 0) {
            payload.metadata = metadata;
        }
        
        const result = await this.documentIngestionService.ingestText(payload);
        
        return {
            chunksStored: result.chunksStored
        };
    }

    async ingestPdf({ pdfData, metadata }) {
        const payload = { pdfData };
        if (metadata && Object.keys(metadata).length > 0) {
            payload.metadata = metadata;
        }
        
        const result = await this.documentIngestionService.ingestPdf(payload);
        
        return {
            chunksStored: result.chunksStored
        };
    }
}
