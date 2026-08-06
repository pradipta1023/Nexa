import { Log } from "chromadb";

class DocumentIngestionService {
  #pdfExtractor;
  #chunker;
  #embeddingPipeline
  #vectorStore;
  constructor({
    pdfExtractor,
    chunker,
    embeddingPipeline,
    vectorStore,
  }) {
    this.#pdfExtractor = pdfExtractor;
    this.#chunker = chunker;
    this.#embeddingPipeline = embeddingPipeline;
    this.#vectorStore = vectorStore;
  }

  async #processData(items) {
    const allChunks = [];

    for (const item of items) {
      if (!item.text || item.text.trim() === '') continue;
      const chunks = this.#chunker(item.text);
      for (const chunk of chunks) {
        allChunks.push({
          ...chunk,
          metadata: item.metadata
        });
      }
    }

    const embeddedChunks = await this.#embeddingPipeline.embed(allChunks);
    await this.#vectorStore.add(embeddedChunks);

    return {
      chunksStored: embeddedChunks.length
    };
  }

  async ingestText({ text, metadata }) {
    return await this.#processData([{ text, metadata }]);
  }

  async ingestPdf({ filePath, pdfData, metadata }) {
    const pages = await this.#pdfExtractor.extract({ fileName: filePath, pdfData });

    const items = pages.map(page => ({
      text: page.text,
      metadata: {
        ...metadata,
        page: page.pageNumber
      }
    }));

    return await this.#processData(items);
  }
}

export default DocumentIngestionService;