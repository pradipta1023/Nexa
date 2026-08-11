import chunker from '../src/chunker.js';

describe('chunker', () => {
  test('Should throw an error if text is not provided', () => {
    expect(() => chunker()).toThrow('Text is required for chunking.');
  });

  test("Should return chunks of the specified size with the specified overlap", () => {
    const text = "This is a test string to test chunking functionality.";
    const options = { chunkSize: 3, overlap: 2 };

    const expectedChunks = [
      { text: "This is a" },
      { text: "is a test" },
      { text: "a test string" },
      { text: "test string to" },
      { text: "string to test" },
      { text: "to test chunking" },
      { text: "test chunking functionality." },
    ];

    expect(chunker(text, options).map(({ text }) => ({ text }))).toEqual(expectedChunks);
  });

  test("Should return a single chunk for short text when no options are provided (using default chunkSize 70)", () => {
    const text = "This is a test string to test chunking functionality.";

    const expectedChunks = [
      { text: "This is a test string to test chunking functionality." }
    ];

    expect(chunker(text).map(({ text }) => ({ text }))).toEqual(expectedChunks);
  });

  test("Should handle cases where the text is shorter than the chunk size", () => {
    const text = "Short text";
    const options = { chunkSize: 5, overlap: 2 };

    const expectedChunks = [
      { text: "Short text" }
    ];

    expect(chunker(text, options).map(({ text }) => ({ text }))).toEqual(expectedChunks);
  });

  test("Should handle cases where the text is exactly the chunk size", () => {
    const text = "This is a test string";
    const options = { chunkSize: 5, overlap: 2 };

    const expectedChunks = [
      { text: "This is a test string" },
    ];

    expect(chunker(text, options).map(({ text }) => ({ text }))).toEqual(expectedChunks);
  });

  test("Should throw an error if chunkSize is 0", () => {
    expect(() => chunker("Some text", { chunkSize: 0, overlap: 2 })).toThrow();
  });

  test("Should throw an error if overlap is negative", () => {
    expect(() => chunker("Some text", { chunkSize: 5, overlap: -1 })).toThrow();
  });

  test("Should handle cases where overlap is greater than or equal to chunkSize", () => {
    expect(() => chunker("Some text", { chunkSize: 5, overlap: 5 })).toThrow();
  });

  test("Returns the partial chunk when the last chunk is smaller than the specified chunk size", () => {
    const text = "A B C D E F G";
    const options = { chunkSize: 5, overlap: 2 };

    const expectedChunks = [
      { text: "A B C D E" },
      { text: "D E F G" }
    ];
    expect(chunker(text, options).map(({ text }) => ({ text }))).toEqual(expectedChunks);
  });
});