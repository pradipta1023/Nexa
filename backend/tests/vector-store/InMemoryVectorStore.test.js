import InMemoryVectorStore from "../../src/vector-store/InMemoryVectorStore.js";

describe("InMemoryVectorStore - add", () => {
  let store;
  let storage;

  beforeEach(() => {
    storage = [];
    store = new InMemoryVectorStore(storage);
  });

  test("should throw if input is not provided", () => {
    expect(() => store.add()).toThrow(
      "Input must be provided to store"
    );
  });

  test("should throw if input is not an array", () => {
    expect(() => store.add({})).toThrow(
      "Input must be an array"
    );
  });

  test("should throw if input array is empty", () => {
    expect(() => store.add([])).toThrow(
      "Length of the vector can't be zero"
    );
  });

  test("should throw if duplicate ids are present in the same input", () => {
    const vectors = [
      { id: 1, text: "A", embedding: [1, 2] },
      { id: 1, text: "B", embedding: [3, 4] }
    ];

    expect(() => store.add(vectors)).toThrow(
      "Id's must be unique for each embeddings"
    );
  });

  test("should throw if a document is missing id", () => {
    const vectors = [
      { text: "A", embedding: [1, 2] }
    ];

    expect(() => store.add(vectors)).toThrow(
      "All fields [ id, text, embedding ] must be provided for each chunk."
    );
  });

  test("should throw if a document is missing text", () => {
    const vectors = [
      { id: 1, embedding: [1, 2] }
    ];

    expect(() => store.add(vectors)).toThrow(
      "All fields [ id, text, embedding ] must be provided for each chunk."
    );
  });

  test("should throw if a document is missing embedding", () => {
    const vectors = [
      { id: 1, text: "A" }
    ];

    expect(() => store.add(vectors)).toThrow(
      "All fields [ id, text, embedding ] must be provided for each chunk."
    );
  });

  test("should append vectors to the existing store", () => {
    const vectors = [
      { id: 1, text: "A", embedding: [1, 2] },
      { id: 2, text: "B", embedding: [3, 4] }
    ];

    store.add(vectors);

    expect(storage).toEqual(vectors);
  });

  test("should append new vectors without replacing existing ones", () => {
    const firstBatch = [
      { id: 1, text: "A", embedding: [1, 2] }
    ];

    const secondBatch = [
      { id: 2, text: "B", embedding: [3, 4] }
    ];

    store.add(firstBatch);
    store.add(secondBatch);

    expect(storage).toEqual([
      ...firstBatch,
      ...secondBatch
    ]);
  });

  test("should throw if id already exists in the store", () => {
    store.add([
      { id: 1, text: "A", embedding: [1, 2] }
    ]);

    expect(() =>
      store.add([
        { id: 1, text: "Another", embedding: [3, 4] }
      ])
    ).toThrow("Provided id is already present");
  });
});

describe("InMemoryVectorStore - search", () => {
  let store;

  beforeEach(() => {
    store = new InMemoryVectorStore();
  });

  test("should throw if embedding is not provided", () => {
    expect(() => store.search({})).toThrow(
      "Embedding must be provided for searching"
    );
  });

  test("should return an empty array when the store is empty", () => {
    expect(
      store.search({
        queryEmbedding: [1, 2]
      })
    ).toEqual([]);
  });

  test("should return the most similar document first", () => {
    store.add([
      { id: 1, text: "React", embedding: [1, 2] },
      { id: 2, text: "Angular", embedding: [2, 4] }
    ]);

    const results = store.search({ queryEmbedding: [1, 2] });

    expect(results[0].id).toBe(1);
  });

  test("should return results sorted by similarity in descending order", () => {
    store.add([
      { id: 1, text: "A", embedding: [1, 0] },
      { id: 2, text: "B", embedding: [0, 1] }
    ]);

    const results = store.search({ queryEmbedding: [1, 0] });

    expect(results[0].similarity)
      .toBeGreaterThanOrEqual(results[1].similarity);
  });

  test("should return only topK results", () => {
    store.add([
      { id: 1, text: "A", embedding: [1, 0] },
      { id: 2, text: "B", embedding: [0, 1] },
      { id: 3, text: "C", embedding: [1, 1] }
    ]);

    const results = store.search({ queryEmbedding: [1, 0], topK: 2 });

    expect(results).toHaveLength(2);
  });

  test("should return all results when topK exceeds the number of stored vectors", () => {
    store.add([
      { id: 1, text: "A", embedding: [1, 0] },
      { id: 2, text: "B", embedding: [0, 1] }
    ]);

    const results = store.search({ queryEmbedding: [1, 0], topK: 10 });

    expect(results).toHaveLength(2);
  });

  test("should use default topK when not provided", () => {
    store.add([
      { id: 1, text: "A", embedding: [1, 0] },
      { id: 2, text: "B", embedding: [0, 1] }
    ]);

    const results = store.search({ queryEmbedding: [1, 0] });

    expect(results).toHaveLength(2);
  });

  test("should return only id, text and similarity", () => {
    store.add([{ id: 1, text: "React", embedding: [1, 2] }]);

    const result = store.search({ queryEmbedding: [1, 2] })[0];

    expect(result).toEqual({ id: 1, text: "React", similarity: expect.any(Number) });

    expect(result.embedding).toBeUndefined();
  });

  test("should not modify the stored vectors during search", () => {
    const vector = { id: 1, text: "React", embedding: [1, 2] };

    store.add([vector]);

    store.search({ queryEmbedding: [1, 2] });

    expect(vector).toEqual({ id: 1, text: "React", embedding: [1, 2] });
  });
});