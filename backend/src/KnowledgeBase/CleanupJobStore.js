import { v4 as uuidv4 } from 'uuid';

/**
 * Persistent store for background cleanup jobs.
 *
 * Jobs survive server restarts because they are persisted in SQLite.
 * Completed jobs are removed from the table. Only pending and permanently
 * failed jobs remain, keeping the table small.
 */
class CleanupJobStore {
  #db;

  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    if (!db) throw new Error('CleanupJobStore requires a db instance.');
    this.#db = db;
  }

  /**
   * Adds a new cleanup job to the queue.
   * @param {{ type: string, payload: object, maxAttempts?: number }} params
   * @returns {object} The created job
   */
  enqueue({ type, payload, maxAttempts = 5 }) {
    if (!type || typeof type !== 'string') {
      throw new Error('type must be a non-empty string.');
    }
    if (!payload || typeof payload !== 'object') {
      throw new Error('payload must be an object.');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    this.#db
      .prepare(
        `INSERT INTO cleanup_jobs
           (id, type, payload, status, attempts, max_attempts, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', 0, ?, ?, ?)`
      )
      .run(id, type, JSON.stringify(payload), maxAttempts, now, now);

    return this.findById(id);
  }

  /**
   * Returns a job by id, or null if not found.
   * @param {string} id
   * @returns {object|null}
   */
  findById(id) {
    const row = this.#db
      .prepare('SELECT * FROM cleanup_jobs WHERE id = ?')
      .get(id);
    return row ? this.#toEntity(row) : null;
  }

  /**
   * Returns all pending jobs ordered by creation date (oldest first).
   * Only jobs that still have remaining attempts are returned.
   * @returns {object[]}
   */
  findPending() {
    return this.#db
      .prepare(
        `SELECT * FROM cleanup_jobs
         WHERE status = 'pending' AND attempts < max_attempts
         ORDER BY created_at ASC`
      )
      .all()
      .map(row => this.#toEntity(row));
  }

  /**
   * Removes a successfully completed job from the database.
   * @param {string} id
   * @returns {boolean} true if a row was deleted
   */
  remove(id) {
    const result = this.#db
      .prepare('DELETE FROM cleanup_jobs WHERE id = ?')
      .run(id);
    return result.changes > 0;
  }

  /**
   * Increments the attempt counter and records the last error.
   * Automatically transitions status to 'failed' when max_attempts is reached.
   * @param {string} id
   * @param {string} [error]
   * @returns {object|null} Updated job
   */
  incrementAttempts(id, error = null) {
    const job = this.findById(id);
    if (!job) return null;

    const newAttempts = job.attempts + 1;
    const newStatus = newAttempts >= job.maxAttempts ? 'failed' : 'pending';

    this.#db
      .prepare(
        `UPDATE cleanup_jobs
         SET attempts = ?, status = ?, last_error = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(newAttempts, newStatus, error ?? null, new Date().toISOString(), id);

    return this.findById(id);
  }

  /**
   * Marks a job as permanently failed (bypasses the attempt counter).
   * @param {string} id
   * @param {string} [error]
   * @returns {boolean}
   */
  markFailed(id, error = null) {
    const result = this.#db
      .prepare(
        `UPDATE cleanup_jobs SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ?`
      )
      .run(error ?? null, new Date().toISOString(), id);
    return result.changes > 0;
  }

  // ─── private ────────────────────────────────────────────────────────────────

  #toEntity(row) {
    return {
      id: row.id,
      type: row.type,
      payload: JSON.parse(row.payload),
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      lastError: row.last_error ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default CleanupJobStore;
