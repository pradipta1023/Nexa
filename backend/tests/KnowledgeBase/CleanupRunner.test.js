import { jest } from '@jest/globals';
import CleanupRunner from '../../src/KnowledgeBase/CleanupRunner.js';

describe('CleanupRunner', () => {
    let cleanupJobStore;
    let vectorStore;
    let runner;

    beforeEach(() => {
        cleanupJobStore = {
            findPending: jest.fn(),
            remove: jest.fn(),
            incrementAttempts: jest.fn()
        };
        vectorStore = {
            delete: jest.fn().mockResolvedValue()
        };
        runner = new CleanupRunner({ cleanupJobStore, vectorStore, pollingIntervalMs: 10 });
    });

    afterEach(() => {
        runner.stop();
        jest.clearAllMocks();
    });

    test('should do nothing if no pending jobs', async () => {
        cleanupJobStore.findPending.mockReturnValue([]);
        const result = await runner.processNext();
        expect(result).toBe(false);
        expect(vectorStore.delete).not.toHaveBeenCalled();
    });

    test('should process delete_resource_chunks job successfully', async () => {
        const job = {
            id: 'job-1',
            type: 'delete_resource_chunks',
            payload: { resourceId: 'res-1', ingestionVersion: 1 }
        };
        cleanupJobStore.findPending.mockReturnValue([job]);

        const result = await runner.processNext();

        expect(result).toBe(true);
        expect(vectorStore.delete).toHaveBeenCalledWith({
            where: {
                resourceId: { $eq: 'res-1' },
                ingestionVersion: { $eq: 1 }
            }
        });
        expect(cleanupJobStore.remove).toHaveBeenCalledWith('job-1');
        expect(cleanupJobStore.incrementAttempts).not.toHaveBeenCalled();
    });

    test('should process delete_kb_chunks job successfully', async () => {
        const job = {
            id: 'job-2',
            type: 'delete_kb_chunks',
            payload: { knowledgeBaseId: 'kb-1' }
        };
        cleanupJobStore.findPending.mockReturnValue([job]);

        const result = await runner.processNext();

        expect(result).toBe(true);
        expect(vectorStore.delete).toHaveBeenCalledWith({
            where: {
                knowledgeBaseId: { $eq: 'kb-1' }
            }
        });
        expect(cleanupJobStore.remove).toHaveBeenCalledWith('job-2');
    });

    test('should increment attempts if job processing fails', async () => {
        const job = {
            id: 'job-3',
            type: 'delete_kb_chunks',
            payload: { knowledgeBaseId: 'kb-2' }
        };
        cleanupJobStore.findPending.mockReturnValue([job]);
        vectorStore.delete.mockRejectedValue(new Error('Chroma DB is down'));

        const result = await runner.processNext();

        expect(result).toBe(false);
        expect(vectorStore.delete).toHaveBeenCalled();
        expect(cleanupJobStore.remove).not.toHaveBeenCalled();
        expect(cleanupJobStore.incrementAttempts).toHaveBeenCalledWith('job-3', 'Chroma DB is down');
    });

    test('should throw error on unknown job type and increment attempts', async () => {
        const job = {
            id: 'job-4',
            type: 'unknown_type',
            payload: {}
        };
        cleanupJobStore.findPending.mockReturnValue([job]);

        const result = await runner.processNext();

        expect(result).toBe(false);
        expect(cleanupJobStore.incrementAttempts).toHaveBeenCalledWith('job-4', 'Unknown job type: unknown_type');
    });
});
