import SqliteConversationStore from '../../src/Conversation/SqliteConversationStore.js';

const CONV_ID = 'conv-001';
const VALID_TURN = {
  userMessage: 'What is RAG?',
  assistantResponse: 'RAG stands for Retrieval-Augmented Generation.',
  tokenCount: 42,
};

describe('SqliteConversationStore', () => {
  let store;

  beforeEach(() => {
    store = new SqliteConversationStore(':memory:');
  });

  // --- createConversation ---

  describe('createConversation', () => {
    test('should create and return a new conversation', () => {
      const conv = store.createConversation(CONV_ID);
      expect(conv.conversationId).toBe(CONV_ID);
      expect(conv.turns).toEqual([]);
      expect(conv.summary).toBeNull();
      expect(conv.version).toBe(0);
      expect(conv.totalTokens).toBe(0);
      expect(conv.createdAt).toBeDefined();
      expect(conv.updatedAt).toBeDefined();
    });

    test('should not overwrite an existing conversation', () => {
      store.createConversation(CONV_ID);
      store.addTurn(CONV_ID, VALID_TURN);
      store.createConversation(CONV_ID); // called again

      const conv = store.getConversation(CONV_ID);
      expect(conv.turns).toHaveLength(1); // still has the turn
    });

    test('should throw if conversationId is empty', () => {
      expect(() => store.createConversation('')).toThrow('conversationId must be a non-empty string.');
    });

    test('should throw if conversationId is not a string', () => {
      expect(() => store.createConversation(123)).toThrow('conversationId must be a non-empty string.');
    });

    test('should throw if conversationId is null', () => {
      expect(() => store.createConversation(null)).toThrow('conversationId must be a non-empty string.');
    });
  });

  // --- getConversation ---

  describe('getConversation', () => {
    test('should return null for a non-existent conversation', () => {
      expect(store.getConversation('does-not-exist')).toBeNull();
    });

    test('should return the conversation after it is created', () => {
      store.createConversation(CONV_ID);
      const conv = store.getConversation(CONV_ID);
      expect(conv.conversationId).toBe(CONV_ID);
    });
  });

  // --- exists ---

  describe('exists', () => {
    test('should return false before a conversation is created', () => {
      expect(store.exists(CONV_ID)).toBe(false);
    });

    test('should return true after a conversation is created', () => {
      store.createConversation(CONV_ID);
      expect(store.exists(CONV_ID)).toBe(true);
    });
  });

  // --- addTurn ---

  describe('addTurn', () => {
    beforeEach(() => store.createConversation(CONV_ID));

    test('should append a turn with a unique turnId and timestamp', () => {
      const turn = store.addTurn(CONV_ID, VALID_TURN);
      expect(turn.turnId).toBeDefined();
      expect(turn.timestamp).toBeDefined();
      expect(turn.userMessage).toBe(VALID_TURN.userMessage);
      expect(turn.assistantResponse).toBe(VALID_TURN.assistantResponse);
      expect(turn.tokenCount).toBe(VALID_TURN.tokenCount);
    });

    test('should store the turn inside the conversation', () => {
      store.addTurn(CONV_ID, VALID_TURN);
      const conv = store.getConversation(CONV_ID);
      expect(conv.turns).toHaveLength(1);
    });

    test('should accumulate totalTokens across turns', () => {
      store.addTurn(CONV_ID, { ...VALID_TURN, tokenCount: 10 });
      store.addTurn(CONV_ID, { ...VALID_TURN, tokenCount: 20 });
      const conv = store.getConversation(CONV_ID);
      expect(conv.totalTokens).toBe(30);
    });

    test('should increment version on each addTurn', () => {
      store.addTurn(CONV_ID, VALID_TURN);
      store.addTurn(CONV_ID, VALID_TURN);
      const conv = store.getConversation(CONV_ID);
      expect(conv.version).toBe(2);
    });

    test('should generate unique turnIds for each turn', () => {
      const t1 = store.addTurn(CONV_ID, VALID_TURN);
      const t2 = store.addTurn(CONV_ID, VALID_TURN);
      expect(t1.turnId).not.toBe(t2.turnId);
    });

    test('should throw if conversation does not exist', () => {
      expect(() => store.addTurn('missing-id', VALID_TURN)).toThrow('Conversation not found: missing-id');
    });

    test('should throw if userMessage is empty', () => {
      expect(() => store.addTurn(CONV_ID, { ...VALID_TURN, userMessage: '' }))
        .toThrow('userMessage must be a non-empty string.');
    });

    test('should throw if assistantResponse is empty', () => {
      expect(() => store.addTurn(CONV_ID, { ...VALID_TURN, assistantResponse: '' }))
        .toThrow('assistantResponse must be a non-empty string.');
    });

    test('should throw if tokenCount is negative', () => {
      expect(() => store.addTurn(CONV_ID, { ...VALID_TURN, tokenCount: -1 }))
        .toThrow('tokenCount must be a non-negative number.');
    });

    test('should accept tokenCount of 0', () => {
      expect(() => store.addTurn(CONV_ID, { ...VALID_TURN, tokenCount: 0 })).not.toThrow();
    });
  });

  // --- updateSummary ---

  describe('updateSummary', () => {
    const SUMMARY = { text: 'User asked about RAG.', tokenCount: 10 };
    let turn1, turn2;

    beforeEach(() => {
      store.createConversation(CONV_ID);
      turn1 = store.addTurn(CONV_ID, { ...VALID_TURN, tokenCount: 20 });
      turn2 = store.addTurn(CONV_ID, { ...VALID_TURN, tokenCount: 30 });
    });

    test('should apply the summary and remove the summarized turns', () => {
      const result = store.updateSummary(CONV_ID, SUMMARY, [turn1.turnId, turn2.turnId]);
      expect(result).toBe(true);
      const conv = store.getConversation(CONV_ID);
      expect(conv.summary).toEqual(SUMMARY);
      expect(conv.turns).toHaveLength(0);
    });

    test('should preserve turns that arrived after the summarizer snapshot', () => {
      // Summarizer snapshots turn1 and turn2 only
      const turn3 = store.addTurn(CONV_ID, { ...VALID_TURN, tokenCount: 15 });

      store.updateSummary(CONV_ID, SUMMARY, [turn1.turnId, turn2.turnId]);

      const conv = store.getConversation(CONV_ID);
      expect(conv.turns).toHaveLength(1);
      expect(conv.turns[0].turnId).toBe(turn3.turnId);
    });

    test('should correctly adjust totalTokens after summarization', () => {
      // Removed: 20 + 30 = 50 tokens; added summary: 10 tokens → net 10
      store.updateSummary(CONV_ID, SUMMARY, [turn1.turnId, turn2.turnId]);
      const conv = store.getConversation(CONV_ID);
      expect(conv.totalTokens).toBe(10);
    });

    test('should be idempotent — passing already-removed turnIds does not fail', () => {
      store.updateSummary(CONV_ID, SUMMARY, [turn1.turnId, turn2.turnId]);
      // Second call with same IDs — they are already gone
      expect(() =>
        store.updateSummary(CONV_ID, { text: 'New summary', tokenCount: 5 }, [turn1.turnId])
      ).not.toThrow();
    });

    test('should throw if conversation does not exist', () => {
      expect(() => store.updateSummary('missing', SUMMARY, [turn1.turnId]))
        .toThrow('Conversation not found: missing');
    });

    test('should throw if summarizedTurnIds is not an array', () => {
      expect(() => store.updateSummary(CONV_ID, SUMMARY, 'not-an-array'))
        .toThrow('summarizedTurnIds must be a non-empty array.');
    });

    test('should throw if summarizedTurnIds is an empty array', () => {
      expect(() => store.updateSummary(CONV_ID, SUMMARY, []))
        .toThrow('summarizedTurnIds must be a non-empty array.');
    });

    test('should throw if summary.text is not a string', () => {
      expect(() => store.updateSummary(CONV_ID, { text: 123, tokenCount: 5 }, [turn1.turnId]))
        .toThrow('summary.text must be a string.');
    });

    test('should throw if summary.tokenCount is not a number', () => {
      expect(() => store.updateSummary(CONV_ID, { text: 'ok', tokenCount: 'five' }, [turn1.turnId]))
        .toThrow('summary.tokenCount must be a number.');
    });
  });
});
