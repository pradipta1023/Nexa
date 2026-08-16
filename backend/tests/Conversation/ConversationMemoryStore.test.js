import { jest } from '@jest/globals';
import ConversationMemoryStore from '../../src/Conversation/ConversationMemoryStore.js';

const makeVectorStore = (overrides = {}) => ({
  add: jest.fn().mockResolvedValue(undefined),
  search: jest.fn().mockResolvedValue([]),
  ...overrides,
});

describe('ConversationMemoryStore', () => {
  let vectorStore;
  let store;

  beforeEach(() => {
    vectorStore = makeVectorStore();
    store = new ConversationMemoryStore({ vectorStore });
  });

  // --- add ---

  describe('add', () => {
    test('should delegate add() to the underlying vectorStore', async () => {
      const vectors = [
        {
          id: 'turn-1',
          text: 'What is RAG?',
          embedding: [0.1, 0.2],
          metadata: { conversationId: 'conv-abc', type: 'turn' },
        },
      ];

      await store.add(vectors);

      expect(vectorStore.add).toHaveBeenCalledWith(vectors);
      expect(vectorStore.add).toHaveBeenCalledTimes(1);
    });

    test('should propagate errors from the underlying vectorStore.add', async () => {
      vectorStore.add.mockRejectedValue(new Error('Storage failed'));

      await expect(
        store.add([{ id: 'x', text: 'y', embedding: [0.1], metadata: {} }])
      ).rejects.toThrow('Storage failed');
    });
  });

  // --- search ---

  describe('search', () => {
    const EMBEDDING = [0.1, 0.2, 0.3];
    const CONV_ID = 'conv-abc';

    test('should always pass conversationId as a where filter to vectorStore.search', async () => {
      await store.search({ queryEmbedding: EMBEDDING, topK: 5, conversationId: CONV_ID });

      expect(vectorStore.search).toHaveBeenCalledWith({
        queryEmbedding: EMBEDDING,
        topK: 5,
        where: { conversationId: { $eq: CONV_ID } },
      });
    });

    test('should return results from the underlying vectorStore', async () => {
      const fakeResults = [
        { id: 'turn-1', text: 'What is RAG?', metadata: { conversationId: CONV_ID } },
      ];
      vectorStore.search.mockResolvedValue(fakeResults);

      const results = await store.search({ queryEmbedding: EMBEDDING, topK: 5, conversationId: CONV_ID });

      expect(results).toEqual(fakeResults);
    });

    test('should throw if conversationId is not provided', async () => {
      await expect(
        store.search({ queryEmbedding: EMBEDDING, topK: 5 })
      ).rejects.toThrow('conversationId is required for conversation memory search.');
    });

    test('should throw if conversationId is null', async () => {
      await expect(
        store.search({ queryEmbedding: EMBEDDING, topK: 5, conversationId: null })
      ).rejects.toThrow('conversationId is required for conversation memory search.');
    });

    test('should throw if conversationId is an empty string', async () => {
      await expect(
        store.search({ queryEmbedding: EMBEDDING, topK: 5, conversationId: '' })
      ).rejects.toThrow('conversationId is required for conversation memory search.');
    });

    test('should throw if conversationId is not a string', async () => {
      await expect(
        store.search({ queryEmbedding: EMBEDDING, topK: 5, conversationId: 123 })
      ).rejects.toThrow('conversationId is required for conversation memory search.');
    });

    test('should forward topK to the underlying vectorStore', async () => {
      await store.search({ queryEmbedding: EMBEDDING, topK: 3, conversationId: CONV_ID });

      expect(vectorStore.search).toHaveBeenCalledWith(
        expect.objectContaining({ topK: 3 })
      );
    });

    test('should never call vectorStore.search without a where filter', async () => {
      await store.search({ queryEmbedding: EMBEDDING, topK: 5, conversationId: CONV_ID });

      const callArgs = vectorStore.search.mock.calls[0][0];
      expect(callArgs.where).toBeDefined();
      expect(callArgs.where).toEqual({ conversationId: { $eq: CONV_ID } });
    });

    test('should propagate errors from the underlying vectorStore.search', async () => {
      vectorStore.search.mockRejectedValue(new Error('Search failed'));

      await expect(
        store.search({ queryEmbedding: EMBEDDING, topK: 5, conversationId: CONV_ID })
      ).rejects.toThrow('Search failed');
    });

    test('should return empty array when no relevant turns are found', async () => {
      vectorStore.search.mockResolvedValue([]);

      const results = await store.search({ queryEmbedding: EMBEDDING, topK: 5, conversationId: CONV_ID });

      expect(results).toEqual([]);
    });

    test('different conversationIds produce different where filters', async () => {
      await store.search({ queryEmbedding: EMBEDDING, topK: 5, conversationId: 'conv-1' });
      await store.search({ queryEmbedding: EMBEDDING, topK: 5, conversationId: 'conv-2' });

      expect(vectorStore.search.mock.calls[0][0].where).toEqual({ conversationId: { $eq: 'conv-1' } });
      expect(vectorStore.search.mock.calls[1][0].where).toEqual({ conversationId: { $eq: 'conv-2' } });
    });
  });
});
