export const FAITHFULNESS_PROMPT = (question, context, answer) => `You are an impartial expert evaluator for an AI system.
Your task is to evaluate the FAITHFULNESS of a generated answer based ONLY on the provided context.

QUESTION: ${question}
CONTEXT:
${context}

GENERATED ANSWER: ${answer}

Instructions:
1. Determine if the GENERATED ANSWER contains any claims, facts, or details that are NOT present in the CONTEXT.
2. If it contains outside information (hallucination) or contradicts the context, give it a low score.
3. If all information in the answer is directly supported by the context, give it a high score (max 5).
4. Provide your response as a valid JSON object with exactly two keys: "score" (an integer from 1 to 5) and "reasoning" (a brief string explaining why).

Output strictly valid JSON and nothing else.`;

export const RELEVANCE_PROMPT = (question, answer) => `You are an impartial expert evaluator for an AI system.
Your task is to evaluate the RELEVANCE of a generated answer to the user's question.

QUESTION: ${question}
GENERATED ANSWER: ${answer}

Instructions:
1. Determine how well the GENERATED ANSWER directly addresses the core of the QUESTION.
2. If the answer goes on a tangent, ignores the question, or is unhelpful, give it a low score.
3. If the answer directly and concisely answers the question, give it a high score (max 5).
4. Provide your response as a valid JSON object with exactly two keys: "score" (an integer from 1 to 5) and "reasoning" (a brief string explaining why).

Output strictly valid JSON and nothing else.`;
