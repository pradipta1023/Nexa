import AppDatabase from '../../src/database/AppDatabase.js';
import KnowledgeBaseStore from '../../src/KnowledgeBase/KnowledgeBaseStore.js';
import ResourceStore from '../../src/KnowledgeBase/ResourceStore.js';
import CleanupJobStore from '../../src/KnowledgeBase/CleanupJobStore.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

let db, kbStore, resourceStore, cleanupStore;

beforeEach(() => {
  const appDb = new AppDatabase(':memory:');
  db = appDb.db;
  kbStore = new KnowledgeBaseStore(db);
  resourceStore = new ResourceStore(db);
  cleanupStore = new CleanupJobStore(db);
});

const makeKb = (overrides = {}) =>
  kbStore.create({ name: 'Test KB', description: 'A test KB', ...overrides });

const makeResource = (knowledgeBaseId, overrides = {}) =>
  resourceStore.create({ knowledgeBaseId, name: 'Test Resource', type: 'text', ...overrides });

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeBaseStore
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeBaseStore', () => {
  describe('create', () => {
    test('returns a KB with correct fields', () => {
      const kb = makeKb();
      expect(kb.id).toBeDefined();
      expect(kb.name).toBe('Test KB');
      expect(kb.description).toBe('A test KB');
      expect(kb.createdAt).toBeDefined();
      expect(kb.updatedAt).toBeDefined();
    });

    test('description defaults to null when omitted', () => {
      const kb = kbStore.create({ name: 'No Desc' });
      expect(kb.description).toBeNull();
    });

    test('throws if name is empty', () => {
      expect(() => kbStore.create({ name: '' })).toThrow('name must be a non-empty string.');
    });

    test('throws if name is not a string', () => {
      expect(() => kbStore.create({ name: 123 })).toThrow('name must be a non-empty string.');
    });

    test('trims whitespace from name', () => {
      const kb = kbStore.create({ name: '  React Base  ' });
      expect(kb.name).toBe('React Base');
    });
  });

  describe('findById', () => {
    test('returns the KB after creation', () => {
      const created = makeKb();
      const found = kbStore.findById(created.id);
      expect(found).toEqual(created);
    });

    test('returns null for unknown id', () => {
      expect(kbStore.findById('no-such-id')).toBeNull();
    });
  });

  describe('findAll', () => {
    test('returns empty array when no KBs exist', () => {
      expect(kbStore.findAll()).toEqual([]);
    });

    test('returns all KBs', () => {
      makeKb({ name: 'KB 1' });
      makeKb({ name: 'KB 2' });
      expect(kbStore.findAll()).toHaveLength(2);
    });

    test('returns all created KBs', () => {
      const first = makeKb({ name: 'First' });
      const second = makeKb({ name: 'Second' });
      const all = kbStore.findAll();
      const ids = all.map(kb => kb.id);
      expect(ids).toContain(first.id);
      expect(ids).toContain(second.id);
    });
  });

  describe('update', () => {
    test('updates name', () => {
      const kb = makeKb();
      const updated = kbStore.update(kb.id, { name: 'Renamed KB' });
      expect(updated.name).toBe('Renamed KB');
    });

    test('updates description', () => {
      const kb = makeKb();
      const updated = kbStore.update(kb.id, { description: 'New description' });
      expect(updated.description).toBe('New description');
    });

    test('preserves existing field when only the other is updated', () => {
      const kb = makeKb({ name: 'Original', description: 'Original desc' });
      const updated = kbStore.update(kb.id, { name: 'New Name' });
      expect(updated.description).toBe('Original desc');
    });

    test('returns null for unknown id', () => {
      expect(kbStore.update('no-such-id', { name: 'X' })).toBeNull();
    });

    test('throws if new name is empty', () => {
      const kb = makeKb();
      expect(() => kbStore.update(kb.id, { name: '' })).toThrow('name must be a non-empty string.');
    });
  });

  describe('delete', () => {
    test('returns true when KB exists', () => {
      const kb = makeKb();
      expect(kbStore.delete(kb.id)).toBe(true);
    });

    test('returns false for unknown id', () => {
      expect(kbStore.delete('no-such-id')).toBe(false);
    });

    test('KB is gone after deletion', () => {
      const kb = makeKb();
      kbStore.delete(kb.id);
      expect(kbStore.findById(kb.id)).toBeNull();
    });

    test('cascades to resources', () => {
      const kb = makeKb();
      makeResource(kb.id);
      kbStore.delete(kb.id);
      expect(resourceStore.findByKnowledgeBaseId(kb.id)).toHaveLength(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ResourceStore
// ─────────────────────────────────────────────────────────────────────────────

describe('ResourceStore', () => {
  let kb;

  beforeEach(() => {
    kb = makeKb();
  });

  describe('create', () => {
    test('returns a resource with correct fields', () => {
      const r = makeResource(kb.id);
      expect(r.id).toBeDefined();
      expect(r.knowledgeBaseId).toBe(kb.id);
      expect(r.name).toBe('Test Resource');
      expect(r.type).toBe('text');
      expect(r.status).toBe('pending');
      expect(r.ingestionVersion).toBe(0);
      expect(r.source).toBeNull();
    });

    test('accepts all valid types', () => {
      for (const type of ['text', 'pdf', 'link']) {
        const r = resourceStore.create({ knowledgeBaseId: kb.id, name: `${type} resource`, type });
        expect(r.type).toBe(type);
      }
    });

    test('throws for invalid type', () => {
      expect(() => makeResource(kb.id, { type: 'video' }))
        .toThrow('type must be one of: text, pdf, link.');
    });

    test('throws if name is empty', () => {
      expect(() => resourceStore.create({ knowledgeBaseId: kb.id, name: '', type: 'text' }))
        .toThrow('name must be a non-empty string.');
    });

    test('throws if knowledgeBaseId is missing', () => {
      expect(() => resourceStore.create({ knowledgeBaseId: '', name: 'R', type: 'text' }))
        .toThrow('knowledgeBaseId must be a non-empty string.');
    });

    test('stores source when provided', () => {
      const r = resourceStore.create({ knowledgeBaseId: kb.id, name: 'Link', type: 'link', source: 'https://example.com' });
      expect(r.source).toBe('https://example.com');
    });
  });

  describe('findById', () => {
    test('returns resource after creation', () => {
      const r = makeResource(kb.id);
      expect(resourceStore.findById(r.id)).toEqual(r);
    });

    test('returns null for unknown id', () => {
      expect(resourceStore.findById('no-such-id')).toBeNull();
    });
  });

  describe('findByKnowledgeBaseId', () => {
    test('returns all resources for a KB', () => {
      makeResource(kb.id, { name: 'R1' });
      makeResource(kb.id, { name: 'R2' });
      expect(resourceStore.findByKnowledgeBaseId(kb.id)).toHaveLength(2);
    });

    test('does not return resources from other KBs', () => {
      const otherKb = makeKb({ name: 'Other KB' });
      makeResource(kb.id);
      makeResource(otherKb.id);
      expect(resourceStore.findByKnowledgeBaseId(kb.id)).toHaveLength(1);
    });

    test('returns empty array when KB has no resources', () => {
      expect(resourceStore.findByKnowledgeBaseId(kb.id)).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    test('updates to all valid statuses', () => {
      for (const status of ['processing', 'ready', 'failed', 'pending']) {
        const r = makeResource(kb.id, { name: `r-${status}` });
        expect(resourceStore.updateStatus(r.id, status)).toBe(true);
        expect(resourceStore.findById(r.id).status).toBe(status);
      }
    });

    test('throws for invalid status', () => {
      const r = makeResource(kb.id);
      expect(() => resourceStore.updateStatus(r.id, 'unknown')).toThrow();
    });

    test('returns false for unknown id', () => {
      expect(resourceStore.updateStatus('no-such-id', 'ready')).toBe(false);
    });
  });

  describe('updateMetadata', () => {
    test('renames resource without changing ingestionVersion', () => {
      const r = makeResource(kb.id);
      resourceStore.updateMetadata(r.id, { name: 'Renamed' });
      const updated = resourceStore.findById(r.id);
      expect(updated.name).toBe('Renamed');
      expect(updated.ingestionVersion).toBe(0);
    });

    test('returns false for unknown id', () => {
      expect(resourceStore.updateMetadata('no-such-id', { name: 'X' })).toBe(false);
    });

    test('throws if new name is empty', () => {
      const r = makeResource(kb.id);
      expect(() => resourceStore.updateMetadata(r.id, { name: '' })).toThrow('name must be a non-empty string.');
    });
  });

  describe('bumpIngestionVersion', () => {
    test('increments version by 1', () => {
      const r = makeResource(kb.id);
      expect(r.ingestionVersion).toBe(0);
      const newVersion = resourceStore.bumpIngestionVersion(r.id);
      expect(newVersion).toBe(1);
      expect(resourceStore.findById(r.id).ingestionVersion).toBe(1);
    });

    test('can be called multiple times', () => {
      const r = makeResource(kb.id);
      resourceStore.bumpIngestionVersion(r.id);
      resourceStore.bumpIngestionVersion(r.id);
      expect(resourceStore.findById(r.id).ingestionVersion).toBe(2);
    });

    test('returns -1 for unknown id', () => {
      expect(resourceStore.bumpIngestionVersion('no-such-id')).toBe(-1);
    });
  });

  describe('delete', () => {
    test('returns true when resource exists', () => {
      const r = makeResource(kb.id);
      expect(resourceStore.delete(r.id)).toBe(true);
    });

    test('resource is gone after deletion', () => {
      const r = makeResource(kb.id);
      resourceStore.delete(r.id);
      expect(resourceStore.findById(r.id)).toBeNull();
    });

    test('returns false for unknown id', () => {
      expect(resourceStore.delete('no-such-id')).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CleanupJobStore
// ─────────────────────────────────────────────────────────────────────────────

describe('CleanupJobStore', () => {
  describe('enqueue', () => {
    test('creates a pending job with correct fields', () => {
      const job = cleanupStore.enqueue({ type: 'delete_resource_chunks', payload: { resourceId: 'r1' } });
      expect(job.id).toBeDefined();
      expect(job.type).toBe('delete_resource_chunks');
      expect(job.payload).toEqual({ resourceId: 'r1' });
      expect(job.status).toBe('pending');
      expect(job.attempts).toBe(0);
      expect(job.maxAttempts).toBe(5);
      expect(job.lastError).toBeNull();
    });

    test('respects custom maxAttempts', () => {
      const job = cleanupStore.enqueue({ type: 'test', payload: {}, maxAttempts: 3 });
      expect(job.maxAttempts).toBe(3);
    });

    test('throws if type is empty', () => {
      expect(() => cleanupStore.enqueue({ type: '', payload: {} })).toThrow('type must be a non-empty string.');
    });

    test('throws if payload is not an object', () => {
      expect(() => cleanupStore.enqueue({ type: 'test', payload: 'bad' })).toThrow('payload must be an object.');
    });
  });

  describe('findPending', () => {
    test('returns pending jobs oldest first', () => {
      const j1 = cleanupStore.enqueue({ type: 'a', payload: {} });
      const j2 = cleanupStore.enqueue({ type: 'b', payload: {} });
      const pending = cleanupStore.findPending();
      expect(pending[0].id).toBe(j1.id);
      expect(pending[1].id).toBe(j2.id);
    });

    test('does not return permanently failed jobs', () => {
      const job = cleanupStore.enqueue({ type: 'test', payload: {}, maxAttempts: 1 });
      cleanupStore.incrementAttempts(job.id, 'error');
      expect(cleanupStore.findPending()).toHaveLength(0);
    });
  });

  describe('remove', () => {
    test('removes a completed job from db', () => {
      const job = cleanupStore.enqueue({ type: 'test', payload: {} });
      expect(cleanupStore.remove(job.id)).toBe(true);
      expect(cleanupStore.findById(job.id)).toBeNull();
    });

    test('returns false for unknown id', () => {
      expect(cleanupStore.remove('no-such-id')).toBe(false);
    });
  });

  describe('incrementAttempts', () => {
    test('increments the attempt counter', () => {
      const job = cleanupStore.enqueue({ type: 'test', payload: {} });
      const updated = cleanupStore.incrementAttempts(job.id, 'Chroma error');
      expect(updated.attempts).toBe(1);
      expect(updated.lastError).toBe('Chroma error');
      expect(updated.status).toBe('pending');
    });

    test('transitions to failed when max_attempts reached', () => {
      const job = cleanupStore.enqueue({ type: 'test', payload: {}, maxAttempts: 2 });
      cleanupStore.incrementAttempts(job.id, 'err1');
      const final = cleanupStore.incrementAttempts(job.id, 'err2');
      expect(final.status).toBe('failed');
      expect(final.attempts).toBe(2);
    });

    test('returns null for unknown id', () => {
      expect(cleanupStore.incrementAttempts('no-such-id')).toBeNull();
    });
  });

  describe('markFailed', () => {
    test('marks a job as permanently failed', () => {
      const job = cleanupStore.enqueue({ type: 'test', payload: {} });
      cleanupStore.markFailed(job.id, 'fatal error');
      const updated = cleanupStore.findById(job.id);
      expect(updated.status).toBe('failed');
      expect(updated.lastError).toBe('fatal error');
    });

    test('returns false for unknown id', () => {
      expect(cleanupStore.markFailed('no-such-id')).toBe(false);
    });
  });
});
