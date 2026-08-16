import { encode } from 'gpt-tokenizer';

class Tokenizer {
  /**
   * Counts the number of tokens in the given text.
   * @param {string} text
   * @returns {number}
   */
  countTokens(text) {
    if (typeof text !== 'string') throw new Error('Input must be a string.');
    return encode(text).length;
  }

  /**
   * Counts the total tokens across an array of strings.
   * @param {string[]} texts
   * @returns {number}
   */
  countMany(texts) {
    if (!Array.isArray(texts)) throw new Error('Input must be an array of strings.');
    return texts.reduce((total, text) => total + this.countTokens(text), 0);
  }

  /**
   * Returns true if the text fits within the given token budget.
   * @param {string} text
   * @param {number} budget
   * @returns {boolean}
   */
  fitsInBudget(text, budget) {
    if (typeof budget !== 'number' || budget <= 0) throw new Error('Budget must be a positive number.');
    return this.countTokens(text) <= budget;
  }
}

export default Tokenizer;
