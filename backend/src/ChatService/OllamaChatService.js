class OllamaChatService {
  #baseUrl;

  constructor({ baseUrl = 'http://localhost:11434' } = {}) {
    this.#baseUrl = baseUrl;
  }

  async generate({ prompt, model, thinking_level } = {}) {
    if (typeof prompt !== "string") throw new Error("Prompt must be a string.");
    if (!prompt.trim()) throw new Error("Prompt must be a non-empty string.");

    const requestModel = model || process.env.OLLAMA_CHAT_MODEL || 'llama3';
    
    try {
      const response = await fetch(`${this.#baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: requestModel,
          prompt: prompt,
          stream: false
        })
      });

      if (!response.ok) {
         throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      throw new Error(`Failed to generate result with Ollama: ${error.message}`);
    }
  }

  async *generateStream({ prompt, model, thinking_level } = {}) {
    if (typeof prompt !== "string") throw new Error("Prompt must be a string.");
    if (!prompt.trim()) throw new Error("Prompt must be a non-empty string.");

    const requestModel = model || process.env.OLLAMA_CHAT_MODEL || 'llama3';

    try {
      const response = await fetch(`${this.#baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: requestModel,
          prompt: prompt,
          stream: true
        })
      });

      if (!response.ok) {
         const errorBody = await response.text();
         throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Ollama sends newline-delimited JSON objects
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
            try {
                const data = JSON.parse(line);
                if (data.response) {
                    yield data.response;
                }
            } catch (e) {
                console.warn("[OllamaChatService] Error parsing streaming chunk:", e);
            }
        }
      }
    } catch (error) {
      throw new Error(`Failed to generate stream with Ollama: ${error.message}`);
    }
  }
}

export default OllamaChatService;
