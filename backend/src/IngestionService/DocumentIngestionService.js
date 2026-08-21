import { Log } from "chromadb";

class DocumentIngestionService {
  #pdfExtractor;
  #chunker;
  #embeddingPipeline;
  #vectorStore;
  #resourceStore;

  constructor({
    pdfExtractor,
    chunker,
    embeddingPipeline,
    vectorStore,
    resourceStore,
  }) {
    this.#pdfExtractor = pdfExtractor;
    this.#chunker = chunker;
    this.#embeddingPipeline = embeddingPipeline;
    this.#vectorStore = vectorStore;
    this.#resourceStore = resourceStore;
  }

  async #processData(items, { knowledgeBaseId, resourceId, resourceType, ingestionVersion }) {
    const allChunks = [];
    let chunkIndex = 0;

    for (const item of items) {
      if (!item.text || item.text.trim() === '') continue;
      const chunks = this.#chunker(item.text);
      for (const chunk of chunks) {
        allChunks.push({
          ...chunk,
          metadata: {
            ...item.metadata,
            knowledgeBaseId,
            resourceId,
            resourceType,
            ingestionVersion,
            chunkIndex: chunkIndex++
          }
        });
      }
    }

    const embeddedChunks = await this.#embeddingPipeline.embed(allChunks);
    await this.#vectorStore.add(embeddedChunks);

    return {
      chunksStored: embeddedChunks.length
    };
  }

  async ingestText({ text, metadata = {}, knowledgeBaseId, resourceId, ingestionVersion }) {
    try {
      this.#resourceStore.updateStatus(resourceId, 'processing');
      const result = await this.#processData([{ text, metadata }], {
        knowledgeBaseId,
        resourceId,
        resourceType: 'text',
        ingestionVersion
      });
      this.#resourceStore.updateStatus(resourceId, 'ready');
      return result;
    } catch (error) {
      this.#resourceStore.updateStatus(resourceId, 'failed');
      throw error;
    }
  }

  async ingestPdf({ filePath, pdfData, metadata = {}, knowledgeBaseId, resourceId, ingestionVersion }) {
    try {
      this.#resourceStore.updateStatus(resourceId, 'processing');
      
      const pages = await this.#pdfExtractor.extract({ fileName: filePath, pdfData });

      const items = pages.map(page => ({
        text: page.text,
        metadata: {
          ...metadata,
          page: page.pageNumber
        }
      }));

      const result = await this.#processData(items, {
        knowledgeBaseId,
        resourceId,
        resourceType: 'pdf',
        ingestionVersion
      });
      this.#resourceStore.updateStatus(resourceId, 'ready');
      return result;
    } catch (error) {
      this.#resourceStore.updateStatus(resourceId, 'failed');
      throw error;
    }
  }
}

export default DocumentIngestionService;