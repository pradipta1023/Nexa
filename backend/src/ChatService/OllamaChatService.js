class OllamaChatService {
  #baseUrl;
  #model;
  #request;
  constructor({ model, baseUrl, request = fetch }) {
    this.#baseUrl = baseUrl;
    this.#model = model;
    this.#request = request;
  }

  async generate({ prompt } = {}) {
    if (typeof prompt !== "string") throw new Error("Prompt must be a string.");

    if (!prompt.trim()) throw new Error("Prompt must be a non-empty string.");

    try {
      const response = await this.#request(`${this.#baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", },
        body: JSON.stringify({
          model: this.#model,
          messages: [{ role: "user", content: prompt }],
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama server returned status ${response.status}`);
      }

      const data = await response.json();
      return data.message.content;
    } catch (error) {
      throw new Error(`Failed to generate result: Unable to connect to Ollama server. ${error.message}`);
    }

  }
}

export default OllamaChatService;