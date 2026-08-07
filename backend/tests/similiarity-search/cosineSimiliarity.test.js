import cosineSimilarity from "../../src/similiarity-search/cosineSimiliarity.js";

describe("cosineSimilarity", () => {
  test("should throw if first vector is not provided", () => {
    expect(() => cosineSimilarity()).toThrow(
      "Both the vectors must be provided"
    );
  });

  test("should throw if second vector is not provided", () => {
    expect(() => cosineSimilarity([1, 2])).toThrow(
      "Both the vectors must be provided"
    );
  });

  test("should throw if first input is not an array", () => {
    expect(() => cosineSimilarity("abc", [1, 2])).toThrow(
      "Both the input vectors must be array"
    );
  });

  test("should throw if second input is not an array", () => {
    expect(() => cosineSimilarity([1, 2], "abc")).toThrow(
      "Both the input vectors must be array"
    );
  });

  test("should throw when one of the vectors has zero magnitude", () => {
    expect(() => cosineSimilarity([0, 0], [1, 2])).toThrow(
      "Cosine similarity is undefined for zero vectors."
    );
  });

  test("should return 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 2], [1, 2])).toBeCloseTo(1);
  });

  test("should return 1 for vectors in the same direction", () => {
    expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1);
  });

  test("should return -1 for vectors in opposite directions", () => {
    expect(cosineSimilarity([1, 2], [-1, -2])).toBeCloseTo(-1);
  });

  test("should return 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  test("should calculate cosine similarity for a general case", () => {
    expect(cosineSimilarity([1, 2], [2, 1])).toBeCloseTo(0.8);
  });

  test("should handle vectors with negative values", () => {
    expect(cosineSimilarity([-1, -2], [-2, -4])).toBeCloseTo(1);
  });

  test("should handle mixed positive and negative values", () => {
    expect(cosineSimilarity([-1, 2], [1, 2])).toBeCloseTo(0.6);
  });
});