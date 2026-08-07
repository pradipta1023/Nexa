import dotProduct from "../../src/similiarity-search/dotProduct.js";

describe("dotProduct", () => {
  test("should throw if first vector is not provided", () => {
    expect(() => dotProduct()).toThrow("Both inputs must be arrays.");
  });

  test("should throw if first vector is not an array", () => {
    expect(() => dotProduct("abc", [1, 2])).toThrow(
      "Both inputs must be arrays."
    );
  });

  test("should throw if vectors are empty", () => {
    expect(() => dotProduct([], [])).toThrow(
      "Vectors cannot be empty."
    );
  });

  test("should throw if vectors have different lengths", () => {
    expect(() => dotProduct([1, 2], [1])).toThrow(
      "Vectors must be of the same length."
    );
  });

  test("should calculate the dot product of two vectors", () => {
    expect(dotProduct([1, 2], [3, 4])).toBe(11);
  });

  test("should calculate the dot product of three-dimensional vectors", () => {
    expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  test("should return 0 for orthogonal vectors", () => {
    expect(dotProduct([1, 0], [0, 1])).toBe(0);
  });

  test("should handle negative numbers", () => {
    expect(dotProduct([-1, 2], [3, 4])).toBe(5);
  });

  test("should calculate the dot product of single-element vectors", () => {
    expect(dotProduct([5], [6])).toBe(30);
  });

  test("should handle vectors containing both positive and negative values", () => {
    expect(dotProduct([-1, -2], [-3, 4])).toBe(-5);
  });

  test("should return zero when one vector contains only zeros", () => {
    expect(dotProduct([0, 0, 0], [1, 2, 3])).toBe(0);
  });
});