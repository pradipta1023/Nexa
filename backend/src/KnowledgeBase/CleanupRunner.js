class CleanupRunner {
    #cleanupJobStore;
    #vectorStore;
    #pollingIntervalMs;
    #intervalId;
    #isRunning;

    constructor({ cleanupJobStore, vectorStore, pollingIntervalMs = 10000 }) {
        this.#cleanupJobStore = cleanupJobStore;
        this.#vectorStore = vectorStore;
        this.#pollingIntervalMs = pollingIntervalMs;
        this.#intervalId = null;
        this.#isRunning = false;
    }

    start() {
        if (this.#isRunning) return;
        this.#isRunning = true;
        this.#poll();
    }

    stop() {
        this.#isRunning = false;
        if (this.#intervalId) {
            clearTimeout(this.#intervalId);
            this.#intervalId = null;
        }
    }

    async #poll() {
        if (!this.#isRunning) return;

        try {
            await this.processNext();
        } catch (error) {
            console.error('[CleanupRunner] Polling error:', error);
        }

        if (this.#isRunning) {
            this.#intervalId = setTimeout(() => this.#poll(), this.#pollingIntervalMs);
        }
    }

    async processNext() {
        const pendingJobs = this.#cleanupJobStore.findPending();
        if (!pendingJobs || pendingJobs.length === 0) {
            return false;
        }

        const job = pendingJobs[0];

        try {
            await this.#processJob(job);
            this.#cleanupJobStore.remove(job.id);
            return true;
        } catch (error) {
            console.error(`[CleanupRunner] Job ${job.id} failed:`, error);
            this.#cleanupJobStore.incrementAttempts(job.id, error.message || String(error));
            return false;
        }
    }

    async #processJob(job) {
        if (job.type === 'delete_resource_chunks') {
            const { resourceId, ingestionVersion } = job.payload;
            if (!resourceId) throw new Error('Missing resourceId in delete_resource_chunks payload');
            
            const where = { resourceId: { $eq: resourceId } };
            if (ingestionVersion !== undefined) {
                where.ingestionVersion = { $eq: ingestionVersion };
            }
            
            await this.#vectorStore.delete({ where });
        } else if (job.type === 'delete_kb_chunks') {
            const { knowledgeBaseId } = job.payload;
            if (!knowledgeBaseId) throw new Error('Missing knowledgeBaseId in delete_kb_chunks payload');

            const where = { knowledgeBaseId: { $eq: knowledgeBaseId } };
            await this.#vectorStore.delete({ where });
        } else {
            throw new Error(`Unknown job type: ${job.type}`);
        }
    }
}

export default CleanupRunner;
