import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a new ConversationTurn value object.
 * @param {object} params
 * @param {string} params.userMessage
 * @param {string} params.assistantResponse
 * @param {number} params.tokenCount
 * @returns {ConversationTurn}
 */
const createTurn = ({ userMessage, assistantResponse, tokenCount }) => ({
  turnId: uuidv4(),
  userMessage,
  assistantResponse,
  tokenCount,
  timestamp: new Date().toISOString(),
});

/**
 * Creates a new Conversation value object.
 * @param {string} conversationId
 * @returns {Conversation}
 */
const createConversation = (conversationId) => ({
  conversationId,
  turns: [],
  summary: null,         // { text: string, tokenCount: number } | null
  version: 0,            // incremented on every addTurn; used for safe summarization
  totalTokens: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export { createTurn, createConversation };
