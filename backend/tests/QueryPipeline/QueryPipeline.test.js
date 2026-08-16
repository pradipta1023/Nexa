import { jest } from '@jest/globals';
import QueryPipeline from '../../src/QueryPipeline/QueryPipeline.js';

describe('QueryPipeline', () => {
  let retriever;
  let chatService;
  let promptBuilder;
  let conversationRetriever;
  let conversationStore;
  let pipeline;

  const CONV_ID = 'conv-123';
  const QUESTION = 'What is React?';

  beforeEach(() => {
    retriever = {
      retrieve: jest.fn().mockResolvedValue(['Doc1', 'Doc2'])
    };
    
    chatService = {
      generate: jest.fn().mockResolvedValue('React is a library'),
      generateStream: jest.fn().mockReturnValue(
        (async function* () { yield 'React '; yield 'is a '; yield 'library'; })()
      )
    };
    
    promptBuilder = {
      build: jest.fn().mockReturnValue('Mocked Prompt')
    };
    
    conversationRetriever = {
      retrieve: jest.fn().mockResolvedValue(['Turn1'])
    };
    
    conversationStore = {
      getConversation: jest.fn().mockReturnValue({ summary: { text: 'Mocked Summary' } })
    };

    pipeline = new QueryPipeline({
      retriever,
      chatService,
      promptBuilder,
      conversationRetriever,
      conversationStore
    });
  });

  describe('ask', () => {
    test('should throw if conversationId is not provided', async () => {
      await expect(pipeline.ask({ question: QUESTION })).rejects.toThrow('conversationId is required');
    });

    test('should fetch document chunks and conversation chunks concurrently', async () => {
      await pipeline.ask({ question: QUESTION, conversationId: CONV_ID, topK: 10 });
      
      expect(retriever.retrieve).toHaveBeenCalledWith(QUESTION, { topK: 10 });
      expect(conversationRetriever.retrieve).toHaveBeenCalledWith(QUESTION, CONV_ID, { topK: 5 });
    });

    test('should fetch summary from conversationStore', async () => {
      await pipeline.ask({ question: QUESTION, conversationId: CONV_ID });
      
      expect(conversationStore.getConversation).toHaveBeenCalledWith(CONV_ID);
    });

    test('should build prompt with all context pieces', async () => {
      await pipeline.ask({ question: QUESTION, conversationId: CONV_ID });
      
      expect(promptBuilder.build).toHaveBeenCalledWith({
        question: QUESTION,
        documentChunks: ['Doc1', 'Doc2'],
        summary: 'Mocked Summary',
        conversationChunks: ['Turn1'],
        maxTokens: 2000
      });
    });

    test('should handle null conversation or missing summary gracefully', async () => {
      conversationStore.getConversation.mockReturnValue(null);
      
      await pipeline.ask({ question: QUESTION, conversationId: CONV_ID });
      
      expect(promptBuilder.build).toHaveBeenCalledWith(expect.objectContaining({
        summary: null
      }));
    });

    test('should generate answer and return response object', async () => {
      const result = await pipeline.ask({ question: QUESTION, conversationId: CONV_ID });
      
      expect(chatService.generate).toHaveBeenCalledWith({ prompt: 'Mocked Prompt' });
      expect(result).toEqual({
        answer: 'React is a library',
        retrievedChunks: ['Doc1', 'Doc2'],
        prompt: 'Mocked Prompt'
      });
    });
  });

  describe('askStream', () => {
    test('should throw if conversationId is not provided', async () => {
      const stream = pipeline.askStream({ question: QUESTION });
      await expect(stream.next()).rejects.toThrow('conversationId is required');
    });

    test('should fetch chunks concurrently and build prompt', async () => {
      const config = { topK: 5, model: 'gpt-3', maxTokens: 100, temperature: 0.5 };
      const stream = pipeline.askStream({ question: QUESTION, conversationId: CONV_ID, config });
      
      await stream.next(); // Trigger first yield
      
      expect(retriever.retrieve).toHaveBeenCalledWith(QUESTION, { topK: 5 });
      expect(conversationRetriever.retrieve).toHaveBeenCalledWith(QUESTION, CONV_ID, { topK: 5 });
      
      expect(promptBuilder.build).toHaveBeenCalledWith(expect.objectContaining({
        documentChunks: ['Doc1', 'Doc2'],
        conversationChunks: ['Turn1'],
        summary: 'Mocked Summary',
        maxTokens: 2000
      }));
    });

    test('should call generateStream with config and yield chunks', async () => {
      const config = { model: 'test-model' };
      const stream = pipeline.askStream({ question: QUESTION, conversationId: CONV_ID, config });
      
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      expect(chatService.generateStream).toHaveBeenCalledWith({
        prompt: 'Mocked Prompt',
        model: 'test-model',
        maxTokens: undefined,
        temperature: undefined
      });
      
      expect(chunks).toEqual(['React ', 'is a ', 'library']);
    });
  });
});
