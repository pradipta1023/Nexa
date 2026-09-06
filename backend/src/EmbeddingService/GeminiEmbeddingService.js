import { GoogleGenAI } from '@google/genai';

class GeminiEmbeddingService {
  #ai;
  #model;
  #maxRetries;

  constructor({ apiKey, model = 'gemini-embedding-2', maxRetries = 5 }) {
    if (!apiKey) throw new Error("API key is required for GeminiEmbeddingService.");
    this.#ai = new GoogleGenAI({ apiKey });
    this.#model = model;
    this.#maxRetries = maxRetries;
  }

  /**
   * Helper to execute a function with exponential backoff.
   * Retries on 429 and 5xx errors up to maxRetries.
   * Immediately throws on permanent errors (400, 401, 403).
   */
  async #executeWithRetry(operationFn) {
    let attempts = 0;
    let delay = 1000;

    while (true) {
      try {
        return await operationFn();
      } catch (error) {
        attempts++;
        
        // Extract status if available (GoogleGenAI throws specific errors)
        const status = error?.status || error?.response?.status;
        
        // Do not retry permanent errors
        if (status === 400 || status === 401 || status === 403) {
          throw new Error(`Permanent error from Gemini API (${status}): ${error.message}`);
        }

        if (attempts > this.#maxRetries) {
          throw new Error(`Failed after ${this.#maxRetries} retries: ${error.message}`);
        }

        console.warn(`[GeminiEmbeddingService] Transient error (attempt ${attempts}/${this.#maxRetries}). Retrying in ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  /**
   * Validates that the embedding returned by Gemini is exactly 768 dimensions.
   */
  #validateDimensions(embedding) {
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Invalid embedding format returned from Gemini.");
    }
    if (embedding.length !== 768) {
      throw new Error(`Dimension mismatch! Expected 768, got ${embedding.length}`);
    }
    return embedding;
  }

  /**
   * Directly fetches a single embedding from the Gemini API.
   */
  async #fetchSingleEmbedding(text) {
    const response = await this.#ai.models.embedContent({
      model: this.#model,
      contents: text,
      config: { outputDimensionality: 768 }
    });

    const embeddingValues = response.embeddings?.[0]?.values;
    return this.#validateDimensions(embeddingValues);
  }

  /**
   * Directly fetches a batch of embeddings from the Gemini API.
   */
  async #fetchBatchEmbeddings(validChunks) {
    // The @google/genai SDK doesn't natively expose batchEmbedContents in this version.
    // To avoid hitting rate limits (e.g., 100 requests/minute), we bypass the SDK and hit the REST API directly.
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.#model}:batchEmbedContents?key=${apiKey}`;
    
    const requests = validChunks.map(chunk => ({
      model: `models/${this.#model}`,
      content: { parts: [{ text: chunk }] },
      outputDimensionality: 768
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    });

    if (!response.ok) {
      const err = await response.text();
      const errorObj = new Error(err);
      errorObj.status = response.status;
      throw errorObj;
    }

    const data = await response.json();
    
    if (!data.embeddings || data.embeddings.length !== validChunks.length) {
      throw new Error("Mismatch in number of embeddings returned from Gemini.");
    }

    return data.embeddings.map(e => this.#validateDimensions(e.values));
  }

  /**
   * Embed a single chunk of text with retry logic.
   */
  async embed(text) {
    if (!text || text.trim() === '') {
      throw new Error("Input text must be a non-empty string.");
    }

    return this.#executeWithRetry(() => this.#fetchSingleEmbedding(text));
  }

  /**
   * Embed multiple chunks of text in a single batch request with retry logic.
   */
  async embedMany(chunks) {
    if (!Array.isArray(chunks)) {
      throw new Error("Input must be an array of chunks.");
    }

    // Filter out completely empty chunks as Gemini will throw a 400 Bad Request
    const validChunks = chunks.filter(chunk => typeof chunk === 'string' && chunk.trim() !== '');
    
    if (validChunks.length === 0) {
      return [];
    }

    return this.#executeWithRetry(() => this.#fetchBatchEmbeddings(validChunks));
  }
}

export default GeminiEmbeddingService;
