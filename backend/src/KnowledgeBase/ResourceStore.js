import { v4 as uuidv4 } from 'uuid';

const VALID_TYPES = ['text', 'pdf', 'link'];
const VALID_STATUSES = ['pending', 'processing', 'ready', 'failed'];

/**
 * Persistent store for Resource entities.
 *
 * A Resource belongs to exactly one Knowledge Base and represents
 * a single ingested document (text snippet, PDF, or URL).
 */
class ResourceStore {
  #db;

  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    if (!db) throw new Error('ResourceStore requires a db instance.');
    this.#db = db;
  }

  /**
   * Creates a new Resource in the pending state.
   * @param {{ knowledgeBaseId: string, name: string, type: 'text'|'pdf'|'link', source?: string }} params
   * @returns {object} The created Resource
   */
  create({ knowledgeBaseId, name, type, source = null }) {
    if (!knowledgeBaseId || typeof knowledgeBaseId !== 'string') {
      throw new Error('knowledgeBaseId must be a non-empty string.');
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('name must be a non-empty string.');
    }
    if (!VALID_TYPES.includes(type)) {
      throw new Error(`type must be one of: ${VALID_TYPES.join(', ')}.`);
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    this.#db
      .prepare(
        `INSERT INTO resources
           (id, knowledge_base_id, name, type, status, source, ingestion_version, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'pending', ?, 0, ?, ?)`
      )
      .run(id, knowledgeBaseId, name.trim(), type, source ?? null, now, now);

    return this.findById(id);
  }

  /**
   * Returns a Resource by id, or null if not found.
   * @param {string} id
   * @returns {object|null}
   */
  findById(id) {
    const row = this.#db
      .prepare('SELECT * FROM resources WHERE id = ?')
      .get(id);
    return row ? this.#toEntity(row) : null;
  }

  /**
   * Returns all Resources belonging to a Knowledge Base.
   * @param {string} knowledgeBaseId
   * @returns {object[]}
   */
  findByKnowledgeBaseId(knowledgeBaseId) {
    return this.#db
      .prepare(
        'SELECT * FROM resources WHERE knowledge_base_id = ? ORDER BY created_at ASC'
      )
      .all(knowledgeBaseId)
      .map(row => this.#toEntity(row));
  }

  /**
   * Updates the status of a Resource.
   * @param {string} id
   * @param {'pending'|'processing'|'ready'|'failed'} status
   * @returns {boolean}
   */
  updateStatus(id, status) {
    if (!VALID_STATUSES.includes(status)) {
      throw new Error(`status must be one of: ${VALID_STATUSES.join(', ')}.`);
    }
    const result = this.#db
      .prepare(
        `UPDATE resources SET status = ?, updated_at = ? WHERE id = ?`
      )
      .run(status, new Date().toISOString(), id);
    return result.changes > 0;
  }

  /**
   * Updates the name (and optionally source) of a Resource.
   * This is a metadata-only update — it does NOT trigger re-indexing.
   * @param {string} id
   * @param {{ name?: string, source?: string }} fields
   * @returns {boolean}
   */
  updateMetadata(id, { name, source } = {}) {
    const existing = this.findById(id);
    if (!existing) return false;

    const newName = name !== undefined ? name.trim() : existing.name;
    if (name !== undefined && !newName) throw new Error('name must be a non-empty string.');

    const newSource = source !== undefined ? source : existing.source;

    this.#db
      .prepare(
        `UPDATE resources SET name = ?, source = ?, updated_at = ? WHERE id = ?`
      )
      .run(newName, newSource ?? null, new Date().toISOString(), id);

    return true;
  }

  /**
   * Increments the ingestion_version of a Resource by 1.
   * Call this just before starting a re-ingestion to stamp new Chroma chunks
   * with the new version while the old version is still active.
   * @param {string} id
   * @returns {number} The new ingestion_version, or -1 if not found
   */
  bumpIngestionVersion(id) {
    const existing = this.findById(id);
    if (!existing) return -1;

    const newVersion = existing.ingestionVersion + 1;
    this.#db
      .prepare(
        `UPDATE resources SET ingestion_version = ?, updated_at = ? WHERE id = ?`
      )
      .run(newVersion, new Date().toISOString(), id);

    return newVersion;
  }

  /**
   * Deletes a Resource by id.
   * @param {string} id
   * @returns {boolean} true if a row was deleted, false if not found
   */
  delete(id) {
    const result = this.#db
      .prepare('DELETE FROM resources WHERE id = ?')
      .run(id);
    return result.changes > 0;
  }

  // ─── private ────────────────────────────────────────────────────────────────

  #toEntity(row) {
    return {
      id: row.id,
      knowledgeBaseId: row.knowledge_base_id,
      name: row.name,
      type: row.type,
      status: row.status,
      source: row.source ?? null,
      ingestionVersion: row.ingestion_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default ResourceStore;
