import { jest } from '@jest/globals';
import ResourceApiService from '../../src/api/ResourceApiService.js';

describe('ResourceApiService', () => {
  let resourceStore;
  let kbStore;
  let cleanupJobStore;
  let service;

  beforeEach(() => {
    resourceStore = {
      create: jest.fn(),
      findByKnowledgeBaseId: jest.fn(),
      findById: jest.fn(),
      updateMetadata: jest.fn(),
      delete: jest.fn()
    };
    kbStore = {
      exists: jest.fn()
    };
    cleanupJobStore = {
      enqueue: jest.fn()
    };

    service = new ResourceApiService({ resourceStore, kbStore, cleanupJobStore });
  });

  describe('createResource', () => {
    test('throws if KB not found', () => {
      kbStore.exists.mockReturnValue(false);
      expect(() => service.createResource({ knowledgeBaseId: 'missing', name: 'Test', type: 'text' }))
        .toThrow('Knowledge Base not found: missing');
    });

    test('delegates to resourceStore if KB exists', () => {
      kbStore.exists.mockReturnValue(true);
      const mockResource = { id: 'r1' };
      resourceStore.create.mockReturnValue(mockResource);

      const params = { knowledgeBaseId: 'kb1', name: 'Test', type: 'text' };
      const result = service.createResource(params);

      expect(resourceStore.create).toHaveBeenCalledWith(params);
      expect(result).toBe(mockResource);
    });
  });

  describe('listResources', () => {
    test('throws if KB not found', () => {
      kbStore.exists.mockReturnValue(false);
      expect(() => service.listResources('missing'))
        .toThrow('Knowledge Base not found: missing');
    });

    test('delegates to resourceStore if KB exists', () => {
      kbStore.exists.mockReturnValue(true);
      const mockList = [{ id: 'r1' }];
      resourceStore.findByKnowledgeBaseId.mockReturnValue(mockList);

      const result = service.listResources('kb1');

      expect(resourceStore.findByKnowledgeBaseId).toHaveBeenCalledWith('kb1');
      expect(result).toBe(mockList);
    });
  });

  describe('getResource', () => {
    test('returns null if resource not found', () => {
      resourceStore.findById.mockReturnValue(null);
      expect(service.getResource('kb1', 'missing')).toBeNull();
    });

    test('returns null if resource belongs to different KB', () => {
      resourceStore.findById.mockReturnValue({ id: 'r1', knowledgeBaseId: 'kb2' });
      expect(service.getResource('kb1', 'r1')).toBeNull();
    });

    test('returns resource if found and belongs to KB', () => {
      const mockResource = { id: 'r1', knowledgeBaseId: 'kb1' };
      resourceStore.findById.mockReturnValue(mockResource);
      
      const result = service.getResource('kb1', 'r1');
      
      expect(result).toBe(mockResource);
    });
  });

  describe('updateResourceMetadata', () => {
    test('returns null if resource not found or belongs to different KB', () => {
      resourceStore.findById.mockReturnValue(null);
      expect(service.updateResourceMetadata('kb1', 'r1', {})).toBeNull();
    });

    test('delegates to resourceStore and returns updated resource', () => {
      const mockResource = { id: 'r1', knowledgeBaseId: 'kb1' };
      // First call for getResource, second for returning updated
      resourceStore.findById
        .mockReturnValueOnce(mockResource)
        .mockReturnValueOnce({ ...mockResource, name: 'New Name' });
        
      const result = service.updateResourceMetadata('kb1', 'r1', { name: 'New Name' });

      expect(resourceStore.updateMetadata).toHaveBeenCalledWith('r1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
    });
  });

  describe('deleteResource', () => {
    test('returns false if resource not found or belongs to different KB', () => {
      resourceStore.findById.mockReturnValue(null);
      expect(service.deleteResource('kb1', 'r1')).toBe(false);
    });

    test('enqueues cleanup job and deletes resource', () => {
      const mockResource = { id: 'r1', knowledgeBaseId: 'kb1', ingestionVersion: 3 };
      resourceStore.findById.mockReturnValue(mockResource);
      resourceStore.delete.mockReturnValue(true);

      const result = service.deleteResource('kb1', 'r1');

      expect(result).toBe(true);
      expect(cleanupJobStore.enqueue).toHaveBeenCalledWith({
        type: 'delete_resource_chunks',
        payload: { resourceId: 'r1', knowledgeBaseId: 'kb1', ingestionVersion: 3 }
      });
      expect(resourceStore.delete).toHaveBeenCalledWith('r1');
    });
  });
});
