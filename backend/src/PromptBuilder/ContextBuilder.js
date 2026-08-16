/**
 * ContextBuilder
 *
 * Responsible for formatting retrieved chunks and summaries into a single
 * context string for the LLM.
 *
 * It enforces a strict token budget using Tokenizer.
 * Order of precedence (what gets included first if space is tight):
 * 1. Document chunks (factual knowledge is most important)
 * 2. Conversation summary (broad context)
 * 3. Recent conversation chunks (specific recent context)
 */
class ContextBuilder {
  #tokenizer;

  constructor({ tokenizer }) {
    this.#tokenizer = tokenizer;
  }

  /**
   * Builds the formatted context string within the token budget.
   *
   * @param {object} params
   * @param {Array<string|object>} [params.documentChunks=[]]
   * @param {string} [params.summary=null]
   * @param {Array<string|object>} [params.conversationChunks=[]]
   * @param {number} params.maxTokens
   * @returns {string} The formatted context
   */
  buildContext({ documentChunks = [], summary = null, conversationChunks = [], maxTokens }) {
    if (typeof maxTokens !== 'number' || maxTokens <= 0) {
      throw new Error('maxTokens must be a positive number');
    }

    let finalContext = '';
    
    const appendSection = (header, items) => {
      if (!items || items.length === 0) return;
      
      let tempContext = finalContext;
      let isFirstItem = true;

      for (const item of items) {
        const text = typeof item === 'string' ? item : item.text;
        if (!text || !text.trim()) continue;
        
        let candidateChunk = '';
        if (isFirstItem) {
          candidateChunk = tempContext.length > 0 ? `\n\n${header}:\n${text}` : `${header}:\n${text}`;
        } else {
          candidateChunk = `\n\n${text}`;
        }

        const candidateTotal = tempContext + candidateChunk;
        
        if (this.#tokenizer.countTokens(candidateTotal) <= maxTokens) {
          tempContext = candidateTotal;
          isFirstItem = false;
        }
      }
      
      finalContext = tempContext;
    };

    appendSection('Document Context', documentChunks);
    
    if (summary) {
      appendSection('Conversation Summary', [summary]);
    }
    
    appendSection('Recent Conversation Context', conversationChunks);

    return finalContext.trim();
  }
}

export default ContextBuilder;
