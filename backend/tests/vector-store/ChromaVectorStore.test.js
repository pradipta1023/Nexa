import { jest } from '@jest/globals';
import ChromaVectorStore from '../../src/vector-store/chormaVectorStore.js';

const makeCollection = (overrides = {}) => ({
  add: jest.fn().mockResolvedValue(undefined),
  query: jest.fn().mockResolvedValue({
    ids: [[]],
    documents: [[]],
    metadatas: [[]],
  }),
  ...overrides,
});

describe('ChromaVectorStore', () => {
  let collection;
  let store;

  beforeEach(() => {
    collection = makeCollection();
    store = new ChromaVectorStore({ collection });
  });

  // --- search (existing behaviour) ---

  describe('search — existing behaviour (no where filter)', () => {
    test('should throw if queryEmbedding is not provided', async () => {
      await expect(store.search({ topK: 5 })).rejects.toThrow(
        'Embedding must be provided for searching'
      );
    });

    test('should call collection.query with queryEmbeddings, nResults and include', async () => {
      const embedding = [0.1, 0.2, 0.3];

      await store.search({ queryEmbedding: embedding, topK: 3 });

      expect(collection.query).toHaveBeenCalledWith(
        expect.objectContaining({
          queryEmbeddings: [embedding],
          nResults: 3,
          include: ['documents', 'metadatas'],
        })
      );
    });

    test('should NOT include a where clause when none is provided', async () => {
      await store.search({ queryEmbedding: [0.1], topK: 5 });

      const callArgs = collection.query.mock.calls[0][0];
      expect(callArgs.where).toBeUndefined();
    });

    test('should return mapped results with id, text and metadata', async () => {
      collection.query.mockResolvedValue({
        ids: [['id-1', 'id-2']],
        documents: [['Hello', 'World']],
        metadatas: [[{ source: 'wiki' }, { source: 'book' }]],
      });

      const results = await store.search({ queryEmbedding: [0.1], topK: 5 });

      expect(results).toEqual([
        { id: 'id-1', text: 'Hello', metadata: { source: 'wiki' } },
        { id: 'id-2', text: 'World', metadata: { source: 'book' } },
      ]);
    });

    test('should return empty array when collection returns no results', async () => {
      const results = await store.search({ queryEmbedding: [0.1], topK: 5 });
      expect(results).toEqual([]);
    });

    test('should handle missing metadatas gracefully', async () => {
      collection.query.mockResolvedValue({
        ids: [['id-1']],
        documents: [['Hello']],
        metadatas: [null],
      });

      const results = await store.search({ queryEmbedding: [0.1], topK: 5 });
      expect(results[0].metadata).toBeUndefined();
    });
  });

  // --- search with where filter (new behaviour) ---

  describe('search — with where filter', () => {
    test('should forward the where clause to collection.query when provided', async () => {
      const where = { conversationId: { $eq: 'conv-abc' } };

      await store.search({ queryEmbedding: [0.1], topK: 5, where });

      expect(collection.query).toHaveBeenCalledWith(
        expect.objectContaining({ where })
      );
    });

    test('should return results that match the where filter', async () => {
      collection.query.mockResolvedValue({
        ids: [['turn-1']],
        documents: [['What is RAG?']],
        metadatas: [[{ conversationId: 'conv-abc', type: 'turn' }]],
      });

      const results = await store.search({
        queryEmbedding: [0.1],
        topK: 5,
        where: { conversationId: { $eq: 'conv-abc' } },
      });

      expect(results).toHaveLength(1);
      expect(results[0].metadata.conversationId).toBe('conv-abc');
    });

    test('should not include where clause when where is undefined', async () => {
      await store.search({ queryEmbedding: [0.1], topK: 5, where: undefined });

      const callArgs = collection.query.mock.calls[0][0];
      expect(callArgs.where).toBeUndefined();
    });

    test('should not include where clause when where is null', async () => {
      await store.search({ queryEmbedding: [0.1], topK: 5, where: null });

      const callArgs = collection.query.mock.calls[0][0];
      expect(callArgs.where).toBeUndefined();
    });
  });

  // --- add ---

  describe('add', () => {
    test('should throw if vectors are not provided', async () => {
      await expect(store.add()).rejects.toThrow('Input must be provided to store');
    });

    test('should throw if vectors is not an array', async () => {
      await expect(store.add({})).rejects.toThrow('Input must be an array');
    });

    test('should call collection.add with ids, embeddings and documents', async () => {
      const vectors = [
        { id: 'a', text: 'Hello', embedding: [0.1, 0.2], metadata: {} },
      ];

      await store.add(vectors);

      expect(collection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ids: ['a'],
          embeddings: [[0.1, 0.2]],
          documents: ['Hello'],
        })
      );
    });

    test('should include metadatas when metadata is non-empty', async () => {
      const vectors = [
        { id: 'a', text: 'Hello', embedding: [0.1], metadata: { source: 'wiki' } },
      ];

      await store.add(vectors);

      expect(collection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          metadatas: [{ source: 'wiki' }],
        })
      );
    });
  });
});
