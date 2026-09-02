import { v4 as uuidv4 } from 'uuid';

/**
 * MongoDB Atlas implementation for background cleanup jobs.
 */
class MongoCleanupJobStore {
  #db;

  constructor(db) {
    if (!db) throw new Error('MongoCleanupJobStore requires a db instance.');
    this.#db = db;
  }

  /**
   * Adds a new cleanup job to the queue.
   * @param {{ type: string, payload: object, maxAttempts?: number }} params
   * @returns {Promise<object>} The created job
   */
  async enqueue({ type, payload, maxAttempts = 5 }) {
    this.#validateEnqueueParams(type, payload);

    const id = uuidv4();
    const job = this.#prepareJob(id, type, payload, maxAttempts);

    await this.#db.cleanupJobs.insertOne(job);
    return this.findById(id);
  }

  /**
   * Returns a job by id, or null if not found.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const row = await this.#db.cleanupJobs.findOne({ _id: id });
    return row ? this.#toEntity(row) : null;
  }

  /**
   * Returns all pending jobs ordered by creation date (oldest first).
   * Only jobs that still have remaining attempts are returned.
   * @returns {Promise<object[]>}
   */
  async findPending() {
    const rows = await this.#db.cleanupJobs
      .find({
        status: 'pending',
        $expr: { $lt: ['$attempts', '$maxAttempts'] }
      })
      .sort({ createdAt: 1 })
      .toArray();
      
    return rows.map(row => this.#toEntity(row));
  }

  /**
   * Removes a successfully completed job from the database.
   * @param {string} id
   * @returns {Promise<boolean>} true if a row was deleted
   */
  async remove(id) {
    const result = await this.#db.cleanupJobs.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  /**
   * Increments the attempt counter and records the last error.
   * Automatically transitions status to 'failed' when max_attempts is reached.
   * @param {string} id
   * @param {string} [error]
   * @returns {Promise<object|null>} Updated job
   */
  async incrementAttempts(id, error = null) {
    const job = await this.findById(id);
    if (!job) return null;

    const newAttempts = job.attempts + 1;
    const newStatus = newAttempts >= job.maxAttempts ? 'failed' : 'pending';

    await this.#db.cleanupJobs.updateOne(
      { _id: id },
      {
        $set: {
          attempts: newAttempts,
          status: newStatus,
          lastError: error ?? null,
          updatedAt: new Date()
        }
      }
    );

    return this.findById(id);
  }

  /**
   * Marks a job as permanently failed (bypasses the attempt counter).
   * @param {string} id
   * @param {string} [error]
   * @returns {Promise<boolean>}
   */
  async markFailed(id, error = null) {
    const result = await this.#db.cleanupJobs.updateOne(
      { _id: id },
      {
        $set: {
          status: 'failed',
          lastError: error ?? null,
          updatedAt: new Date()
        }
      }
    );
    return result.matchedCount > 0;
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  #validateEnqueueParams(type, payload) {
    if (!type || typeof type !== 'string') {
      throw new Error('type must be a non-empty string.');
    }
    if (!payload || typeof payload !== 'object') {
      throw new Error('payload must be an object.');
    }
  }

  #prepareJob(id, type, payload, maxAttempts) {
    const now = new Date();
    return {
      _id: id,
      type,
      payload, // Stored as a native MongoDB object
      status: 'pending',
      attempts: 0,
      maxAttempts,
      lastError: null,
      createdAt: now,
      updatedAt: now
    };
  }

  #toEntity(row) {
    return {
      id: row._id,
      type: row.type,
      payload: row.payload,
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
      lastError: row.lastError,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

export default MongoCleanupJobStore;
