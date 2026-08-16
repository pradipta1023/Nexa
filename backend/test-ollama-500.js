import OllamaChatService from "./src/ChatService/OllamaChatService.js";

async function run() {
  const chatService = new OllamaChatService({ baseUrl: "http://127.0.0.1:11435", model: "qwen3:14b" });
  
  const prompt = `You are a helpful AI assistant.

You have been provided with context that may include retrieved knowledge documents, a summary of the conversation, and recent conversation history.

- If the user's question contains a pronoun (like "it", "this", "that"), you MUST first definitively resolve what it refers to by reading the "Recent Conversation Context" and "Conversation Summary".
- Once you determine the active topic from the conversation history, COMPLETELY IGNORE any information in the "Document Context" that is about a different topic.
- Provide a single, direct, confident answer. NEVER use hedging language like "If 'it' refers to X... but if it refers to Y...". Choose the single most logical topic based on the conversation history and answer directly.
- If the required information for the active topic is not in the context, you MUST say so. Do NOT use your internal knowledge under any circumstances.

--- CONTEXT ---
Document Context:
Props can be passed as attributes to the component...
---------------

Question:
what are props in React?

Answer:`;

  const stream = chatService.generateStream({ prompt, model: "qwen3:14b", temperature: 0.1 });
  
  try {
    for await (const chunk of stream) {
      process.stdout.write(chunk);
    }
    console.log("\nDone");
  } catch (e) {
    console.log("Error in stream:", e);
  }
}

run().catch(console.error);
