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
    test('delegates to kbStore', () => {
      const mockKb = { id: 'kb1', name: 'Test' };
      kbStore.create.mockReturnValue(mockKb);

      const result = service.createKnowledgeBase({ name: 'Test' });

      expect(kbStore.create).toHaveBeenCalledWith({ name: 'Test', description: undefined });
      expect(result).toBe(mockKb);
    });
  });

  describe('listKnowledgeBases', () => {
    test('delegates to kbStore', () => {
      const mockList = [{ id: 'kb1' }];
      kbStore.findAll.mockReturnValue(mockList);

      const result = service.listKnowledgeBases();

      expect(kbStore.findAll).toHaveBeenCalled();
      expect(result).toBe(mockList);
    });
  });

  describe('getKnowledgeBase', () => {
    test('returns null if kb not found', () => {
      kbStore.findById.mockReturnValue(null);
      expect(service.getKnowledgeBase('missing')).toBeNull();
    });

    test('returns kb with resource counts', () => {
      kbStore.findById.mockReturnValue({ id: 'kb1', name: 'Test' });
      resourceStore.findByKnowledgeBaseId.mockReturnValue([
        { type: 'text' }, { type: 'text' }, { type: 'pdf' }
      ]);

      const result = service.getKnowledgeBase('kb1');

      expect(result).toEqual({
        id: 'kb1',
        name: 'Test',
        resourceCounts: { text: 2, pdf: 1, link: 0 }
      });
    });
  });

  describe('updateKnowledgeBase', () => {
    test('returns null if kb not found', () => {
      kbStore.findById.mockReturnValue(null);
      expect(service.updateKnowledgeBase('missing', {})).toBeNull();
    });

    test('delegates to kbStore if found', () => {
      kbStore.findById.mockReturnValue({ id: 'kb1' });
      const mockUpdated = { id: 'kb1', name: 'New' };
      kbStore.update.mockReturnValue(mockUpdated);

      const result = service.updateKnowledgeBase('kb1', { name: 'New' });

      expect(kbStore.update).toHaveBeenCalledWith('kb1', { name: 'New', description: undefined });
      expect(result).toBe(mockUpdated);
    });
  });

  describe('deleteKnowledgeBase', () => {
    test('returns false if kb not found', () => {
      kbStore.findById.mockReturnValue(null);
      expect(service.deleteKnowledgeBase('missing')).toBe(false);
    });

    test('enqueues cleanup jobs and deletes kb', () => {
      kbStore.findById.mockReturnValue({ id: 'kb1' });
      resourceStore.findByKnowledgeBaseId.mockReturnValue([
        { id: 'r1', ingestionVersion: 2 },
        { id: 'r2', ingestionVersion: 1 }
      ]);
      kbStore.delete.mockReturnValue(true);

      const result = service.deleteKnowledgeBase('kb1');

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
