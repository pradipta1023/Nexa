/**
 * ConversationSummarizer
 *
 * Runs in the background when the token budget for a conversation exceeds
 * a defined threshold. It compresses past turns into a concise summary using
 * the LLM, indexes that summary for semantic search, and updates the store.
 */
class ConversationSummarizer {
  #conversationStore;
  #conversationIndexer;
  #chatService;
  #locks;

  constructor({ conversationStore, conversationIndexer, chatService }) {
    this.#conversationStore = conversationStore;
    this.#conversationIndexer = conversationIndexer;
    this.#chatService = chatService;
    this.#locks = new Set();
  }

  /**
   * Evaluates whether a conversation needs summarization and executes it
   * if the token threshold is exceeded.
   *
   * @param {string} conversationId
   * @param {number} [thresholdTokens=1000] - Triggers summarization if exceeded
   */
  async summarizeIfNeeded(conversationId, thresholdTokens = 1000) {
    if (this.#locks.has(conversationId)) {
      return; // Job already running for this conversation
    }

    const conversation = this.#conversationStore.getConversation(conversationId);
    if (!conversation) return;

    if (conversation.totalTokens <= thresholdTokens) {
      return; // Under budget, no action needed
    }

    // Acquire lock
    this.#locks.add(conversationId);

    // Capture the exact turns we are about to summarize
    const turnsToSummarize = [...conversation.turns];
    if (turnsToSummarize.length === 0) return;

    const turnIds = turnsToSummarize.map(t => t.turnId);

    // Build the prompt for the LLM
    const transcript = turnsToSummarize
      .map(t => `User: ${t.userMessage}\nAssistant: ${t.assistantResponse}`)
      .join('\n\n');

    let prompt = 'Summarize the following conversation concisely. Focus on key facts, preferences, and the overarching topic. Do not include pleasantries.\n\n';
    
    // If there is an existing summary, ask the LLM to incorporate it
    if (conversation.summary) {
      prompt += `Previous Summary:\n${conversation.summary.text}\n\n`;
    }
    
    prompt += `Recent Conversation:\n${transcript}\n\nSummary:`;

    try {
      // 1. Generate the summary via LLM
      const summaryText = await this.#chatService.generate({ prompt });

      // 2. Index the summary for semantic retrieval
      await this.#conversationIndexer.indexSummary({
        conversationId,
        text: summaryText
      });

      // 3. Update the store (which removes the summarized turns)
      // Token count of the summary itself is an approximation for now, or 
      // we'd need tokenizer injected here. Let's assume average 4 chars per token.
      const estimatedTokens = Math.ceil(summaryText.length / 4);

      this.#conversationStore.updateSummary(
        conversationId,
        { text: summaryText, tokenCount: estimatedTokens },
        turnIds
      );

    } catch (error) {
      console.error(`[ConversationSummarizer] Failed to summarize ${conversationId}:`, error);
      // Fail silently to the user, background job
    } finally {
      // Release lock
      this.#locks.delete(conversationId);
    }
  }
}

export default ConversationSummarizer;
