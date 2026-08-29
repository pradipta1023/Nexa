import GeminiChatService from "../../src/ChatService/GeminiChatService.js";

describe("GeminiChatService", () => {
  let service;
  
  beforeEach(() => {
    // We pass a dummy API key so GoogleGenAI doesn't throw a validation error
    service = new GeminiChatService({ apiKey: 'dummy-api-key' });
  });

  it("should throw error if prompt is not a string", async () => {
    await expect(service.generate({ prompt: 123 })).rejects.toThrow("Prompt must be a string");
  });

  it("should throw error if prompt is empty string", async () => {
    await expect(service.generate({ prompt: "   " })).rejects.toThrow("Prompt must be a non-empty string");
  });
});
