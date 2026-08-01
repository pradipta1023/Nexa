class OllamaEmbeddingService {
  #model;
  #baseUrl;
  #request;

  constructor({ model, baseUrl, request = fetch }) {
    this.#model = model;
    this.#baseUrl = baseUrl;
    this.#request = request;
  }

  async embed(text) {
    if (!text) throw new Error("Input text must be a non-empty string.");
    try {
      const response = await this.#request(`${this.#baseUrl}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json", },
        body: JSON.stringify({ model: this.#model, input: text, })
      });

      if (!response.ok) {
        throw new Error(`Ollama server returned status ${response.status}`);
      }

      const data = await response.json();
      return data.embeddings[0];
    } catch (error) {
      console.log(error);

      throw new Error(`Failed to generate embedding: Unable to connect to Ollama server. ${error.message}`);
    }
  }

  async embedMany(chunks) {
    if (!Array.isArray(chunks) && chunks.length !== 0)
      throw new Error("Input text must be a non-empty array.");

    try {
      const response = await this.#request(`${this.#baseUrl}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json", },
        body: JSON.stringify({ model: this.#model, input: chunks, })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Ollama server returned status ${response.status} errorBody: ${errorBody}`);
      }

      const data = await response.json();
      return data.embeddings;
    } catch (error) {
      console.log(error);

      throw new Error(`Failed to generate embedding: Unable to connect to Ollama server. ${error.message}`);
    }
  }
}

export default OllamaEmbeddingService;