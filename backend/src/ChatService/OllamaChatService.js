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

  async *generateStream({ prompt, model, temperature, maxTokens } = {}) {
    if (typeof prompt !== "string") throw new Error("Prompt must be a string.");
    if (!prompt.trim()) throw new Error("Prompt must be a non-empty string.");

    const requestModel = model || this.#model;
    const options = {};
    if (temperature !== undefined) options.temperature = temperature;
    if (maxTokens !== undefined) options.num_predict = maxTokens;

    try {
      const response = await this.#request(`${this.#baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: requestModel,
          messages: [{ role: "user", content: prompt }],
          stream: true,
          options: Object.keys(options).length > 0 ? options : undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama server returned status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.message && parsed.message.content) {
              yield parsed.message.content;
            }
          } catch (e) {
            console.warn("Skipping unparseable JSON line from Ollama stream", e.message);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to generate stream: Unable to connect to Ollama server. ${error.message}`);
    }
  }
}

export default OllamaChatService;