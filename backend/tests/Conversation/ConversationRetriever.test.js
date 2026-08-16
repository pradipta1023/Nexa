import { jest } from '@jest/globals';
import ConversationRetriever from '../../src/Conversation/ConversationRetriever.js';

const makeEmbeddingService = (overrides = {}) => ({
  embed: jest.fn().mockResolvedValue([0.1, 0.2]),
  ...overrides,
});

const makeConversationMemoryStore = (overrides = {}) => ({
  search: jest.fn().mockResolvedValue([]),
  ...overrides,
});

describe('ConversationRetriever', () => {
  let embeddingService;
  let conversationMemoryStore;
  let retriever;

  const CONV_ID = 'conv-123';
  const QUESTION = 'What did you say earlier?';

  beforeEach(() => {
    embeddingService = makeEmbeddingService();
    conversationMemoryStore = makeConversationMemoryStore();
    retriever = new ConversationRetriever({ embeddingService, conversationMemoryStore });
  });

  describe('retrieve', () => {
    test('should throw if question is not a string', async () => {
      await expect(retriever.retrieve(123, CONV_ID)).rejects.toThrow('Question must be a string');
    });

    test('should throw if question is empty', async () => {
      await expect(retriever.retrieve('', CONV_ID)).rejects.toThrow('Question must be provided for getting answer');
    });

    test('should throw if question contains only whitespaces', async () => {
      await expect(retriever.retrieve('     ', CONV_ID)).rejects.toThrow('Question must be provided for getting answer');
    });

    test('should throw if conversationId is missing', async () => {
      await expect(retriever.retrieve(QUESTION)).rejects.toThrow('conversationId must be a non-empty string');
    });

    test('should throw if conversationId is not a string', async () => {
      await expect(retriever.retrieve(QUESTION, 456)).rejects.toThrow('conversationId must be a non-empty string');
    });

    test('should call embeddingService.embed with the question', async () => {
      await retriever.retrieve(QUESTION, CONV_ID);

      expect(embeddingService.embed).toHaveBeenCalledWith(QUESTION);
      expect(embeddingService.embed).toHaveBeenCalledTimes(1);
    });

    test('should call conversationMemoryStore.search with embedding, default topK, and conversationId', async () => {
      const embedding = [0.1, 0.2];
      embeddingService.embed.mockResolvedValue(embedding);

      await retriever.retrieve(QUESTION, CONV_ID);

      expect(conversationMemoryStore.search).toHaveBeenCalledWith({
        queryEmbedding: embedding,
        topK: 5, // Default
        conversationId: CONV_ID
      });
    });

    test('should forward custom topK to conversationMemoryStore.search', async () => {
      const embedding = [0.1, 0.2];
      embeddingService.embed.mockResolvedValue(embedding);

      await retriever.retrieve(QUESTION, CONV_ID, { topK: 3 });

      expect(conversationMemoryStore.search).toHaveBeenCalledWith({
        queryEmbedding: embedding,
        topK: 3,
        conversationId: CONV_ID
      });
    });

    test('should return the results from conversationMemoryStore.search', async () => {
      const searchResults = [
        { id: 'turn-1', text: 'User: Hi\nAssistant: Hello', metadata: { type: 'turn' } }
      ];
      conversationMemoryStore.search.mockResolvedValue(searchResults);

      const result = await retriever.retrieve(QUESTION, CONV_ID);

      expect(result).toEqual(searchResults);
    });

    test('should propagate errors from embeddingService', async () => {
      embeddingService.embed.mockRejectedValue(new Error('Embedding failed'));

      await expect(retriever.retrieve(QUESTION, CONV_ID)).rejects.toThrow('Embedding failed');
    });

    test('should propagate errors from conversationMemoryStore', async () => {
      conversationMemoryStore.search.mockRejectedValue(new Error('Search failed'));

      await expect(retriever.retrieve(QUESTION, CONV_ID)).rejects.toThrow('Search failed');
    });
  });
});
