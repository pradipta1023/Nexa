import Tokenizer from '../../src/Tokenizer/Tokenizer.js';

describe('Tokenizer', () => {
  let tokenizer;

  beforeEach(() => {
    tokenizer = new Tokenizer();
  });

  // --- countTokens ---

  describe('countTokens', () => {
    test('should return 0 for an empty string', () => {
      expect(tokenizer.countTokens('')).toBe(0);
    });

    test('should return a positive integer for a non-empty string', () => {
      const count = tokenizer.countTokens('Hello world');
      expect(count).toBeGreaterThan(0);
      expect(Number.isInteger(count)).toBe(true);
    });

    test('should return consistent results for the same input', () => {
      const text = 'Retrieval-Augmented Generation is a powerful AI technique.';
      expect(tokenizer.countTokens(text)).toBe(tokenizer.countTokens(text));
    });

    test('should return more tokens for longer text', () => {
      const short = 'Hello.';
      const long = 'Hello world, this is a longer sentence with many more tokens than the short one.';
      expect(tokenizer.countTokens(long)).toBeGreaterThan(tokenizer.countTokens(short));
    });

    test('should throw if input is not a string', () => {
      expect(() => tokenizer.countTokens(123)).toThrow('Input must be a string.');
    });

    test('should throw if input is null', () => {
      expect(() => tokenizer.countTokens(null)).toThrow('Input must be a string.');
    });

    test('should throw if input is undefined', () => {
      expect(() => tokenizer.countTokens(undefined)).toThrow('Input must be a string.');
    });

    test('should throw if input is an array', () => {
      expect(() => tokenizer.countTokens(['hello'])).toThrow('Input must be a string.');
    });
  });

  // --- countMany ---

  describe('countMany', () => {
    test('should return 0 for an empty array', () => {
      expect(tokenizer.countMany([])).toBe(0);
    });

    test('should sum token counts across all strings', () => {
      const texts = ['Hello', 'world'];
      const expected = tokenizer.countTokens('Hello') + tokenizer.countTokens('world');
      expect(tokenizer.countMany(texts)).toBe(expected);
    });

    test('should handle an array with a single string', () => {
      const text = 'Single entry';
      expect(tokenizer.countMany([text])).toBe(tokenizer.countTokens(text));
    });

    test('should throw if input is not an array', () => {
      expect(() => tokenizer.countMany('hello')).toThrow('Input must be an array of strings.');
    });

    test('should throw if input is null', () => {
      expect(() => tokenizer.countMany(null)).toThrow('Input must be an array of strings.');
    });
  });

  // --- fitsInBudget ---

  describe('fitsInBudget', () => {
    test('should return true when token count is exactly at the budget', () => {
      const text = 'Hello world';
      const count = tokenizer.countTokens(text);
      expect(tokenizer.fitsInBudget(text, count)).toBe(true);
    });

    test('should return true when token count is below the budget', () => {
      expect(tokenizer.fitsInBudget('Hi', 1000)).toBe(true);
    });

    test('should return false when token count exceeds the budget', () => {
      const text = 'This is a sentence with several tokens in it.';
      expect(tokenizer.fitsInBudget(text, 1)).toBe(false);
    });

    test('should throw if budget is zero', () => {
      expect(() => tokenizer.fitsInBudget('hello', 0)).toThrow('Budget must be a positive number.');
    });

    test('should throw if budget is negative', () => {
      expect(() => tokenizer.fitsInBudget('hello', -10)).toThrow('Budget must be a positive number.');
    });

    test('should throw if budget is not a number', () => {
      expect(() => tokenizer.fitsInBudget('hello', '100')).toThrow('Budget must be a positive number.');
    });
  });
});
