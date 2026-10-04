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

export const RELEVANCE_PROMPT = (question, context, answer) => `You are an impartial expert evaluator for an AI system.
Your task is to evaluate the RELEVANCE of a generated answer to the user's question, strictly within the boundaries of the provided context.

QUESTION: ${question}
CONTEXT:
${context}

GENERATED ANSWER: ${answer}

Instructions:
1. Determine how well the GENERATED ANSWER directly addresses the core of the QUESTION.
2. Judge the relevance based ONLY on the scope of the CONTEXT. Do not use outside knowledge (e.g., if the question asks for requirements, and the context only lists two, do not penalize the answer for missing standard industry requirements).
3. If the answer goes on a tangent, ignores the question, or provides useless information, give it a low score.
4. If the answer directly and concisely answers the question within the scope of the context, give it a high score (max 5).
5. Provide your response as a valid JSON object with exactly two keys: "score" (an integer from 1 to 5) and "reasoning" (a brief string explaining why).

Output strictly valid JSON and nothing else.`;

export const CORRECTNESS_PROMPT = (question, expectedAnswer, generatedAnswer) => `You are an impartial expert evaluator for an AI system.
Your task is to evaluate the CORRECTNESS of a generated answer by comparing it to a known expected answer.

QUESTION: ${question}
EXPECTED ANSWER: ${expectedAnswer}
GENERATED ANSWER: ${generatedAnswer}

Instructions:
1. Compare the GENERATED ANSWER to the EXPECTED ANSWER.
2. Do they convey the same factual information?
3. If the GENERATED ANSWER misses critical facts present in the EXPECTED ANSWER, or contradicts it, give it a low score.
4. If the GENERATED ANSWER contains all the necessary facts and is logically equivalent to the EXPECTED ANSWER, give it a high score (max 5).
5. Provide your response as a valid JSON object with exactly two keys: "score" (an integer from 1 to 5) and "reasoning" (a brief string explaining why).

Output strictly valid JSON and nothing else.`;
