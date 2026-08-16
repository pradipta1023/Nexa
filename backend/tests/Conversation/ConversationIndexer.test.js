import { jest } from '@jest/globals';
import ConversationIndexer from '../../src/Conversation/ConversationIndexer.js';

const CONV_ID = 'conv-001';
const TURN_ID = 'turn-uuid-001';
const EMBEDDING = [0.1, 0.2, 0.3];

const makeEmbeddingService = () => ({
  embed: jest.fn().mockResolvedValue(EMBEDDING),
});

const makeConversationMemoryStore = () => ({
  add: jest.fn().mockResolvedValue(undefined),
});

describe('ConversationIndexer', () => {
  let embeddingService;
  let conversationMemoryStore;
  let indexer;

  beforeEach(() => {
    embeddingService = makeEmbeddingService();
    conversationMemoryStore = makeConversationMemoryStore();
    indexer = new ConversationIndexer({ embeddingService, conversationMemoryStore });
  });

  // --- indexTurn ---

  describe('indexTurn', () => {
    const VALID_TURN = {
      conversationId: CONV_ID,
      turnId: TURN_ID,
      userMessage: 'What is RAG?',
      assistantResponse: 'RAG stands for Retrieval-Augmented Generation.',
      timestamp: '2024-01-01T00:00:00.000Z',
    };

    test('should embed the combined user and assistant text', async () => {
      await indexer.indexTurn(VALID_TURN);

      const expectedText = `User: ${VALID_TURN.userMessage}\nAssistant: ${VALID_TURN.assistantResponse}`;
      expect(embeddingService.embed).toHaveBeenCalledWith(expectedText);
    });

    test('should store the turn in conversationMemoryStore with correct shape', async () => {
      await indexer.indexTurn(VALID_TURN);

      expect(conversationMemoryStore.add).toHaveBeenCalledWith([
        expect.objectContaining({
          id: TURN_ID,
          embedding: EMBEDDING,
          metadata: expect.objectContaining({
            conversationId: CONV_ID,
            turnId: TURN_ID,
            type: 'turn',
            timestamp: VALID_TURN.timestamp,
          }),
        }),
      ]);
    });

    test('should use current time as timestamp when not provided', async () => {
      const before = new Date().toISOString();
      await indexer.indexTurn({ ...VALID_TURN, timestamp: undefined });
      const after = new Date().toISOString();

      const storedMetadata = conversationMemoryStore.add.mock.calls[0][0][0].metadata;
      expect(storedMetadata.timestamp >= before).toBe(true);
      expect(storedMetadata.timestamp <= after).toBe(true);
    });

    test('should throw if conversationId is missing', async () => {
      await expect(
        indexer.indexTurn({ ...VALID_TURN, conversationId: undefined })
      ).rejects.toThrow('conversationId is required.');
    });

    test('should throw if turnId is missing', async () => {
      await expect(
        indexer.indexTurn({ ...VALID_TURN, turnId: undefined })
      ).rejects.toThrow('turnId is required.');
    });

    test('should throw if userMessage is missing', async () => {
      await expect(
        indexer.indexTurn({ ...VALID_TURN, userMessage: undefined })
      ).rejects.toThrow('userMessage is required.');
    });

    test('should throw if assistantResponse is missing', async () => {
      await expect(
        indexer.indexTurn({ ...VALID_TURN, assistantResponse: undefined })
      ).rejects.toThrow('assistantResponse is required.');
    });

    test('should propagate errors from embeddingService', async () => {
      embeddingService.embed.mockRejectedValue(new Error('Embedding failed'));

      await expect(indexer.indexTurn(VALID_TURN)).rejects.toThrow('Embedding failed');
    });

    test('should propagate errors from conversationMemoryStore.add', async () => {
      conversationMemoryStore.add.mockRejectedValue(new Error('Storage failed'));

      await expect(indexer.indexTurn(VALID_TURN)).rejects.toThrow('Storage failed');
    });

    test('should embed once and store once per indexTurn call', async () => {
      await indexer.indexTurn(VALID_TURN);

      expect(embeddingService.embed).toHaveBeenCalledTimes(1);
      expect(conversationMemoryStore.add).toHaveBeenCalledTimes(1);
    });
  });

  // --- indexSummary ---

  describe('indexSummary', () => {
    const VALID_SUMMARY = {
      conversationId: CONV_ID,
      text: 'User asked about RAG and embeddings.',
      timestamp: '2024-01-01T01:00:00.000Z',
    };

    test('should embed the summary text', async () => {
      await indexer.indexSummary(VALID_SUMMARY);

      expect(embeddingService.embed).toHaveBeenCalledWith(VALID_SUMMARY.text);
    });

    test('should store the summary with correct metadata', async () => {
      await indexer.indexSummary(VALID_SUMMARY);

      const stored = conversationMemoryStore.add.mock.calls[0][0][0];
      expect(stored.metadata).toMatchObject({
        conversationId: CONV_ID,
        type: 'summary',
        timestamp: VALID_SUMMARY.timestamp,
      });
    });

    test('should use conversationId as part of the summary entry id', async () => {
      await indexer.indexSummary(VALID_SUMMARY);

      const storedId = conversationMemoryStore.add.mock.calls[0][0][0].id;
      expect(storedId).toMatch(new RegExp(`^${CONV_ID}-summary-`));
    });

    test('should generate a unique id for each summary', async () => {
      await indexer.indexSummary(VALID_SUMMARY);
      await indexer.indexSummary(VALID_SUMMARY);

      const id1 = conversationMemoryStore.add.mock.calls[0][0][0].id;
      const id2 = conversationMemoryStore.add.mock.calls[1][0][0].id;
      expect(id1).not.toBe(id2);
    });

    test('should use current time as timestamp when not provided', async () => {
      const before = new Date().toISOString();
      await indexer.indexSummary({ ...VALID_SUMMARY, timestamp: undefined });
      const after = new Date().toISOString();

      const storedMetadata = conversationMemoryStore.add.mock.calls[0][0][0].metadata;
      expect(storedMetadata.timestamp >= before).toBe(true);
      expect(storedMetadata.timestamp <= after).toBe(true);
    });

    test('should throw if conversationId is missing', async () => {
      await expect(
        indexer.indexSummary({ ...VALID_SUMMARY, conversationId: undefined })
      ).rejects.toThrow('conversationId is required.');
    });

    test('should throw if text is missing', async () => {
      await expect(
        indexer.indexSummary({ ...VALID_SUMMARY, text: undefined })
      ).rejects.toThrow('summary text is required.');
    });

    test('should throw if text is empty string', async () => {
      await expect(
        indexer.indexSummary({ ...VALID_SUMMARY, text: '   ' })
      ).rejects.toThrow('summary text is required.');
    });

    test('should propagate errors from embeddingService', async () => {
      embeddingService.embed.mockRejectedValue(new Error('Embedding failed'));

      await expect(indexer.indexSummary(VALID_SUMMARY)).rejects.toThrow('Embedding failed');
    });

    test('should propagate errors from conversationMemoryStore.add', async () => {
      conversationMemoryStore.add.mockRejectedValue(new Error('Storage failed'));

      await expect(indexer.indexSummary(VALID_SUMMARY)).rejects.toThrow('Storage failed');
    });
  });
});
