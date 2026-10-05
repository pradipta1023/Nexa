const evaluateCtxRelevance = async ({ evaluator, question, contextStr }) => {
    const res = await evaluator.evaluateContextRelevance(question, contextStr);
    console.log(`↳ Ctx Relevance: ${res.score}/5 (${res.reasoning})`);
    return res.score;
};

const evaluateCtxRecall = async ({ evaluator, question, expectedAnswer, contextStr }) => {
    const res = await evaluator.evaluateContextRecall(question, expectedAnswer, contextStr);
    console.log(`↳ Ctx Recall:    ${res.score}/5 (${res.reasoning})`);
    return res.score;
};

const evaluateCtxPrecision = async ({ evaluator, question, rankedChunksStr }) => {
    const res = await evaluator.evaluateContextPrecision(question, rankedChunksStr);
    console.log(`↳ Ctx Precision: ${res.score}/5 (${res.reasoning})`);
    return res.score;
};

const evaluateFaithfulness = async ({ evaluator, question, contextStr, answer }) => {
    const res = await evaluator.evaluateFaithfulness(question, contextStr, answer);
    console.log(`↳ Faithfulness:  ${res.score}/5 (${res.reasoning})`);
    return res.score;
};

const evaluateRelevance = async ({ evaluator, question, contextStr, answer }) => {
    const res = await evaluator.evaluateRelevance(question, contextStr, answer);
    console.log(`↳ Relevance:     ${res.score}/5 (${res.reasoning})`);
    return res.score;
};

const evaluateCorrectness = async ({ evaluator, question, expectedAnswer, answer }) => {
    const res = await evaluator.evaluateCorrectness(question, expectedAnswer, answer);
    console.log(`↳ Correctness:   ${res.score}/5 (${res.reasoning})`);
    return res.score;
};

const metricRunners = {
    ctx_relevance: evaluateCtxRelevance,
    ctx_recall: evaluateCtxRecall,
    ctx_precision: evaluateCtxPrecision,
    faithfulness: evaluateFaithfulness,
    relevance: evaluateRelevance,
    correctness: evaluateCorrectness
};

export default metricRunners;
