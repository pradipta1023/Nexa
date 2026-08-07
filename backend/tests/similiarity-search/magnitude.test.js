import magnitude from "../../src/similiarity-search/magnitude.js";

describe("magnitude", () => {
  test("should throw if vector is not provided", () => {
    expect(() => magnitude()).toThrow("Vector is required.");
  });

  test("should throw if input is not an array", () => {
    expect(() => magnitude("abc")).toThrow(
      "Input must be an array."
    );
  });

  test("should throw if vector is empty", () => {
    expect(() => magnitude([])).toThrow(
      "Vector cannot be empty."
    );
  });

  test("should calculate the magnitude of a two-dimensional vector", () => {
    expect(magnitude([3, 4])).toBe(5);
  });

  test("should calculate the magnitude of a three-dimensional vector", () => {
    expect(magnitude([1, 2, 2])).toBe(3);
  });

  test("should calculate the magnitude of a single-element vector", () => {
    expect(magnitude([5])).toBe(5);
  });

  test("should return 0 for a zero vector", () => {
    expect(magnitude([0, 0, 0])).toBe(0);
  });

  test("should handle negative values", () => {
    expect(magnitude([-3, -4])).toBe(5);
  });

  test("should handle mixed positive and negative values", () => {
    expect(magnitude([-2, 3, -6])).toBe(7);
  });

  test("should return a floating-point magnitude when appropriate", () => {
    expect(magnitude([1, 1])).toBeCloseTo(Math.sqrt(2));
  });
});