class Evaluator {
  #comparator;
  #ragApplication;
  constructor({ comparator, ragApplication }) {
    this.#comparator = comparator;
    this.#ragApplication = ragApplication;
  }

  async evaluate({ testCases, context }) {
    const result = { testResults: [] };
    await this.#ragApplication.add(context);
    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
      const { question, expectedAnswer, id } = testCase;
      const { answer, retrievedChunks } = await this.#ragApplication.ask(question);

      const judgement = await this.#comparator.compare(
        {
          question,
          expectedAnswer,
          actualAnswer: answer,
          retrievedChunks
        }
      );

      judgement.passed ? passed++ : failed++;
      result.testResults.push({ ...judgement, question, expectedAnswer, actualAnswer: answer, id });
    }

    const summary = this.#getSummary(passed, failed);

    return { ...result, summary };
  }

  #getSummary(passed, failed) {
    const total = passed + failed;

    return {
      total,
      passed,
      failed,
      accuracy: !total ? 0 : `${((passed / total) * 100).toFixed(2)}%`
    }
  }
}

export default Evaluator;