import { jest } from '@jest/globals';
import ContextBuilder from '../../src/PromptBuilder/ContextBuilder.js';

describe('ContextBuilder', () => {
  let tokenizer;
  let contextBuilder;

  beforeEach(() => {
    // A mock tokenizer that counts 1 token per character for simplicity in tests
    tokenizer = {
      countTokens: jest.fn((text) => text.length),
    };
    contextBuilder = new ContextBuilder({ tokenizer });
  });

  describe('buildContext', () => {
    test('should return empty string if no inputs provided', () => {
      const result = contextBuilder.buildContext({ maxTokens: 100 });
      expect(result).toBe('');
    });

    test('should format document chunks correctly', () => {
      const result = contextBuilder.buildContext({
        documentChunks: ['Doc 1', { text: 'Doc 2' }],
        maxTokens: 1000
      });
      
      expect(result).toBe('Document Context:\nDoc 1\n\nDoc 2');
    });

    test('should format summary correctly', () => {
      const result = contextBuilder.buildContext({
        summary: 'This is a summary',
        maxTokens: 1000
      });
      
      expect(result).toBe('Conversation Summary:\nThis is a summary');
    });

    test('should format conversation chunks correctly', () => {
      const result = contextBuilder.buildContext({
        conversationChunks: ['User: Hi', 'Assistant: Hello'],
        maxTokens: 1000
      });
      
      expect(result).toBe('Recent Conversation Context:\nUser: Hi\n\nAssistant: Hello');
    });

    test('should combine all sections correctly', () => {
      const result = contextBuilder.buildContext({
        documentChunks: ['Doc 1'],
        summary: 'Sum 1',
        conversationChunks: ['Conv 1'],
        maxTokens: 1000
      });
      
      const expected = 'Document Context:\nDoc 1\n\nConversation Summary:\nSum 1\n\nRecent Conversation Context:\nConv 1';
      expect(result).toBe(expected);
    });

    test('should throw if maxTokens is not a positive number', () => {
      expect(() => contextBuilder.buildContext({ maxTokens: 0 })).toThrow('maxTokens must be a positive number');
      expect(() => contextBuilder.buildContext({ maxTokens: -5 })).toThrow('maxTokens must be a positive number');
      expect(() => contextBuilder.buildContext({ maxTokens: null })).toThrow('maxTokens must be a positive number');
      expect(() => contextBuilder.buildContext({})).toThrow('maxTokens must be a positive number');
    });

    test('should respect the token budget and truncate sections in precedence order', () => {
      // Precedence: Documents > Summary > Conversation
      // Let's set maxTokens such that Documents and Summary fit, but Conversation doesn't
      const doc = 'DocText'; // 7 chars + formatting
      const sum = 'SumText'; // 7 chars + formatting
      const conv = 'ConvText'; // 8 chars + formatting
      
      // Formatting adds lengths:
      // "Document Context:\n" = 18
      // "Conversation Summary:\n" = 22
      // "Recent Conversation Context:\n" = 29
      
      // Doc block: 18 + 7 = 25
      // + Sum block: + 2 + 22 + 7 = 31 (Total 56)
      // + Conv block: + 2 + 29 + 8 = 39 (Total 95)
      
      // If we set maxTokens to 60, Conv should be dropped
      const result = contextBuilder.buildContext({
        documentChunks: [doc],
        summary: sum,
        conversationChunks: [conv],
        maxTokens: 60
      });
      
      const expected = 'Document Context:\nDocText\n\nConversation Summary:\nSumText';
      expect(result).toBe(expected);
    });

    test('should drop later items within a section if they exceed budget', () => {
      // 18 (header) + 4 (Doc1) = 22
      // + 2 (newline) + 4 (Doc2) = 28
      // + 2 (newline) + 4 (Doc3) = 34
      
      // If maxTokens is 30, Doc3 should be dropped
      const result = contextBuilder.buildContext({
        documentChunks: ['Doc1', 'Doc2', 'Doc3'],
        maxTokens: 30
      });
      
      expect(result).toBe('Document Context:\nDoc1\n\nDoc2');
    });

    test('should completely drop a section if its header + first item exceeds budget', () => {
      // Doc block: 18 + 4 = 22
      // If maxTokens is 20, the whole document section should be skipped.
      const result = contextBuilder.buildContext({
        documentChunks: ['Doc1'],
        maxTokens: 20
      });
      
      expect(result).toBe('');
    });
    
    test('should skip empty string items gracefully without taking budget', () => {
      const result = contextBuilder.buildContext({
        documentChunks: ['Doc 1', '', '   ', 'Doc 2'],
        maxTokens: 1000
      });
      
      expect(result).toBe('Document Context:\nDoc 1\n\nDoc 2');
    });
  });
});
