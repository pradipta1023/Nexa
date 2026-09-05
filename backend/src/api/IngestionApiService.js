export default class IngestionApiService {
    #documentIngestionService;
    #resourceStore;
    #cleanupJobStore;

    constructor({ documentIngestionService, resourceStore, cleanupJobStore }) {
        this.#documentIngestionService = documentIngestionService;
        this.#resourceStore = resourceStore;
        this.#cleanupJobStore = cleanupJobStore;
    }

    async ingestText({ text, metadata = {}, knowledgeBaseId, resourceId }) {
        const resource = await this.#resourceStore.findById(resourceId);
        if (!resource || resource.knowledgeBaseId !== knowledgeBaseId) {
            throw new Error(`Resource not found: ${resourceId} in Knowledge Base: ${knowledgeBaseId}`);
        }

        const oldVersion = resource.ingestionVersion;
        const newVersion = await this.#resourceStore.bumpIngestionVersion(resourceId);

        // Schedule cleanup of old chunks
        if (oldVersion > 0) {
            await this.#cleanupJobStore.enqueue({
                type: 'delete_resource_chunks',
                payload: {
                    resourceId,
                    knowledgeBaseId,
                    ingestionVersion: oldVersion
                }
            });
        }
        
        const payload = { text, metadata, knowledgeBaseId, resourceId, ingestionVersion: newVersion };
        const result = await this.#documentIngestionService.ingestText(payload);
        
        return { chunksStored: result.chunksStored };
    }

    async ingestPdf({ pdfData, metadata = {}, knowledgeBaseId, resourceId }) {
        const resource = await this.#resourceStore.findById(resourceId);
        if (!resource || resource.knowledgeBaseId !== knowledgeBaseId) {
            throw new Error(`Resource not found: ${resourceId} in Knowledge Base: ${knowledgeBaseId}`);
        }

        const oldVersion = resource.ingestionVersion;
        const newVersion = await this.#resourceStore.bumpIngestionVersion(resourceId);

        // Schedule cleanup of old chunks
        if (oldVersion > 0) {
            await this.#cleanupJobStore.enqueue({
                type: 'delete_resource_chunks',
                payload: {
                    resourceId,
                    knowledgeBaseId,
                    ingestionVersion: oldVersion
                }
            });
        }
        
        const payload = { pdfData, metadata, knowledgeBaseId, resourceId, ingestionVersion: newVersion };
        const result = await this.#documentIngestionService.ingestPdf(payload);
        
        return { chunksStored: result.chunksStored };
    }
}
