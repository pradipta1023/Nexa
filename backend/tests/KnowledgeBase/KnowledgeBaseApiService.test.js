import { jest } from '@jest/globals';
import KnowledgeBaseApiService from '../../src/api/KnowledgeBaseApiService.js';

describe('KnowledgeBaseApiService', () => {
  let kbStore;
  let resourceStore;
  let cleanupJobStore;
  let service;

  beforeEach(() => {
    kbStore = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    resourceStore = {
      findByKnowledgeBaseId: jest.fn()
    };
    cleanupJobStore = {
      enqueue: jest.fn()
    };

    service = new KnowledgeBaseApiService({ kbStore, resourceStore, cleanupJobStore });
  });

  describe('createKnowledgeBase', () => {
    test('delegates to kbStore', async () => {
      const mockKb = { id: 'kb1', name: 'Test' };
      kbStore.create.mockResolvedValue(mockKb);

      const result = await service.createKnowledgeBase({ name: 'Test' });

      expect(kbStore.create).toHaveBeenCalledWith({ name: 'Test', description: undefined });
      expect(result).toBe(mockKb);
    });
  });

  describe('listKnowledgeBases', () => {
    test('delegates to kbStore', async () => {
      const mockList = [{ id: 'kb1' }];
      kbStore.findAll.mockResolvedValue(mockList);

      const result = await service.listKnowledgeBases();

      expect(kbStore.findAll).toHaveBeenCalled();
      expect(result).toBe(mockList);
    });
  });

  describe('getKnowledgeBase', () => {
    test('returns null if kb not found', async () => {
      kbStore.findById.mockResolvedValue(null);
      expect(await service.getKnowledgeBase('missing')).toBeNull();
    });

    test('returns kb with resource counts', async () => {
      kbStore.findById.mockResolvedValue({ id: 'kb1', name: 'Test' });
      resourceStore.findByKnowledgeBaseId.mockResolvedValue([
        { type: 'text' }, { type: 'text' }, { type: 'pdf' }
      ]);

      const result = await service.getKnowledgeBase('kb1');

      expect(result).toEqual({
        id: 'kb1',
        name: 'Test',
        resourceCounts: { text: 2, pdf: 1, link: 0 }
      });
    });
  });

  describe('updateKnowledgeBase', () => {
    test('returns null if kb not found', async () => {
      kbStore.findById.mockResolvedValue(null);
      expect(await service.updateKnowledgeBase('missing', {})).toBeNull();
    });

    test('delegates to kbStore if found', async () => {
      kbStore.findById.mockResolvedValue({ id: 'kb1' });
      const mockUpdated = { id: 'kb1', name: 'New' };
      kbStore.update.mockResolvedValue(mockUpdated);

      const result = await service.updateKnowledgeBase('kb1', { name: 'New' });

      expect(kbStore.update).toHaveBeenCalledWith('kb1', { name: 'New', description: undefined });
      expect(result).toBe(mockUpdated);
    });
  });

  describe('deleteKnowledgeBase', () => {
    test('returns false if kb not found', async () => {
      kbStore.findById.mockResolvedValue(null);
      expect(await service.deleteKnowledgeBase('missing')).toBe(false);
    });

    test('enqueues cleanup jobs and deletes kb', async () => {
      kbStore.findById.mockResolvedValue({ id: 'kb1' });
      resourceStore.findByKnowledgeBaseId.mockResolvedValue([
        { id: 'r1', ingestionVersion: 2 },
        { id: 'r2', ingestionVersion: 1 }
      ]);
      kbStore.delete.mockResolvedValue(true);

      const result = await service.deleteKnowledgeBase('kb1');

      expect(result).toBe(true);
      expect(cleanupJobStore.enqueue).toHaveBeenCalledTimes(2);
      expect(cleanupJobStore.enqueue).toHaveBeenCalledWith({
        type: 'delete_resource_chunks',
        payload: { resourceId: 'r1', knowledgeBaseId: 'kb1', ingestionVersion: 2 }
      });
      expect(cleanupJobStore.enqueue).toHaveBeenCalledWith({
        type: 'delete_resource_chunks',
        payload: { resourceId: 'r2', knowledgeBaseId: 'kb1', ingestionVersion: 1 }
      });
      expect(kbStore.delete).toHaveBeenCalledWith('kb1');
    });
  });
});
