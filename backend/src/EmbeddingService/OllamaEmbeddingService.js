class OllamaEmbeddingService {
  #baseUrl;
  #model;
  #maxRetries;

  constructor({ baseUrl = 'http://localhost:11434', model = 'nomic-embed-text', maxRetries = 5 } = {}) {
    this.#baseUrl = baseUrl;
    this.#model = model;
    this.#maxRetries = maxRetries;
  }

  async #executeWithRetry(operationFn) {
    let attempts = 0;
    let delay = 1000;

    while (true) {
      try {
        return await operationFn();
      } catch (error) {
        attempts++;
        
        if (attempts > this.#maxRetries) {
          throw new Error(`Failed after ${this.#maxRetries} retries: ${error.message}`);
        }

        console.warn(`[OllamaEmbeddingService] Transient error (attempt ${attempts}/${this.#maxRetries}). Retrying in ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; 
      }
    }
  }

  #validateDimensions(embedding) {
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Invalid embedding format returned from Ollama.");
    }
    // nomic-embed-text provides 768 dimensions, exactly matching Gemini's output
    if (embedding.length !== 768) {
      throw new Error(`Dimension mismatch! Expected 768, got ${embedding.length}`);
    }
    return embedding;
  }

  async #fetchSingleEmbedding(text) {
    const response = await fetch(`${this.#baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.#model,
        prompt: text
      })
    });

    if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.#validateDimensions(data.embedding);
  }

  async embed(text) {
    if (!text || text.trim() === '') {
      throw new Error("Input text must be a non-empty string.");
    }
    return this.#executeWithRetry(() => this.#fetchSingleEmbedding(text));
  }

  async embedMany(chunks) {
    if (!Array.isArray(chunks)) {
      throw new Error("Input must be an array of chunks.");
    }

    const validChunks = chunks.filter(chunk => typeof chunk === 'string' && chunk.trim() !== '');
    
    if (validChunks.length === 0) {
      return [];
    }

    // Ollama's /api/embeddings endpoint only accepts a single prompt.
    // For batching, we process them sequentially or concurrently. 
    // We'll use Promise.all for concurrency to speed things up.
    return this.#executeWithRetry(async () => {
        const promises = validChunks.map(chunk => this.#fetchSingleEmbedding(chunk));
        return Promise.all(promises);
    });
  }
}

export default OllamaEmbeddingService;
