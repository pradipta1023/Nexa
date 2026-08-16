import { jest } from '@jest/globals';
import ConversationSummarizer from '../../src/Conversation/ConversationSummarizer.js';

describe('ConversationSummarizer', () => {
  let conversationStore;
  let conversationIndexer;
  let chatService;
  let summarizer;

  const CONV_ID = 'conv-123';

  beforeEach(() => {
    conversationStore = {
      getConversation: jest.fn(),
      updateSummary: jest.fn(),
    };

    conversationIndexer = {
      indexSummary: jest.fn().mockResolvedValue(undefined),
    };

    chatService = {
      generate: jest.fn().mockResolvedValue('A newly generated summary'),
    };

    summarizer = new ConversationSummarizer({
      conversationStore,
      conversationIndexer,
      chatService,
    });
    
    // Suppress console.error in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    console.error.mockRestore();
  });

  describe('summarizeIfNeeded', () => {
    test('should do nothing if conversation is not found', async () => {
      conversationStore.getConversation.mockReturnValue(null);

      await summarizer.summarizeIfNeeded(CONV_ID);

      expect(chatService.generate).not.toHaveBeenCalled();
    });

    test('should do nothing if token count is at or below threshold', async () => {
      conversationStore.getConversation.mockReturnValue({
        totalTokens: 1000,
        turns: [],
      });

      await summarizer.summarizeIfNeeded(CONV_ID, 1000);

      expect(chatService.generate).not.toHaveBeenCalled();
    });

    test('should do nothing if there are no turns to summarize', async () => {
      conversationStore.getConversation.mockReturnValue({
        totalTokens: 1500, // Above threshold
        turns: [], // But somehow no turns
      });

      await summarizer.summarizeIfNeeded(CONV_ID, 1000);

      expect(chatService.generate).not.toHaveBeenCalled();
    });

    test('should generate, index, and update summary when over threshold', async () => {
      const turns = [
        { turnId: 't1', userMessage: 'Hi', assistantResponse: 'Hello' },
        { turnId: 't2', userMessage: 'What?', assistantResponse: 'Nothing' },
      ];

      conversationStore.getConversation.mockReturnValue({
        totalTokens: 1500,
        turns,
        summary: null,
      });

      await summarizer.summarizeIfNeeded(CONV_ID, 1000);

      // 1. Should call chat service to generate summary
      expect(chatService.generate).toHaveBeenCalledTimes(1);
      const promptArg = chatService.generate.mock.calls[0][0].prompt;
      expect(promptArg).toContain('Hi');
      expect(promptArg).toContain('Nothing');
      expect(promptArg).not.toContain('Previous Summary:');

      // 2. Should index the summary
      expect(conversationIndexer.indexSummary).toHaveBeenCalledWith({
        conversationId: CONV_ID,
        text: 'A newly generated summary',
      });

      // 3. Should update the store
      expect(conversationStore.updateSummary).toHaveBeenCalledWith(
        CONV_ID,
        expect.objectContaining({ text: 'A newly generated summary' }),
        ['t1', 't2']
      );
    });

    test('should include previous summary in the prompt if it exists', async () => {
      conversationStore.getConversation.mockReturnValue({
        totalTokens: 1500,
        turns: [{ turnId: 't1', userMessage: 'Hi', assistantResponse: 'Hello' }],
        summary: { text: 'Old summary text' },
      });

      await summarizer.summarizeIfNeeded(CONV_ID, 1000);

      const promptArg = chatService.generate.mock.calls[0][0].prompt;
      expect(promptArg).toContain('Previous Summary:\nOld summary text');
    });

    test('should handle and swallow errors during generation (background job safety)', async () => {
      conversationStore.getConversation.mockReturnValue({
        totalTokens: 1500,
        turns: [{ turnId: 't1', userMessage: 'Hi', assistantResponse: 'Hello' }],
      });

      chatService.generate.mockRejectedValue(new Error('LLM Error'));

      await expect(summarizer.summarizeIfNeeded(CONV_ID, 1000)).resolves.toBeUndefined();
      
      expect(console.error).toHaveBeenCalled();
      expect(conversationIndexer.indexSummary).not.toHaveBeenCalled();
      expect(conversationStore.updateSummary).not.toHaveBeenCalled();
    });
    
    test('should handle and swallow errors during indexing', async () => {
      conversationStore.getConversation.mockReturnValue({
        totalTokens: 1500,
        turns: [{ turnId: 't1', userMessage: 'Hi', assistantResponse: 'Hello' }],
      });

      conversationIndexer.indexSummary.mockRejectedValue(new Error('DB Error'));

      await expect(summarizer.summarizeIfNeeded(CONV_ID, 1000)).resolves.toBeUndefined();
      
      expect(console.error).toHaveBeenCalled();
      expect(conversationStore.updateSummary).not.toHaveBeenCalled();
    });
  });
});
