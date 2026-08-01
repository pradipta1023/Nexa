import createEvaluator from "../Evaluator/createEvaluator.js";
import { context } from "./deep-sea/deep-sea-research.js";
import testCases from "./deep-sea/tests.js";

const evaluator = await createEvaluator();

const report = await evaluator.evaluate({
  context: context,
  testCases,
});

console.log(JSON.stringify(report, null, 2));