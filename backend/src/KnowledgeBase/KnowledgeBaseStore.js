import { v4 as uuidv4 } from 'uuid';

/**
 * Persistent store for Knowledge Base entities.
 *
 * Accepts an injected better-sqlite3 Database instance from AppDatabase.
 * All methods are synchronous in keeping with the project's store conventions.
 */
class KnowledgeBaseStore {
  #db;

  /**
   * @param {import('better-sqlite3').Database} db
   */
  constructor(db) {
    if (!db) throw new Error('KnowledgeBaseStore requires a db instance.');
    this.#db = db;
  }

  /**
   * Creates a new Knowledge Base.
   * @param {{ name: string, description?: string }} params
   * @returns {object} The created Knowledge Base
   */
  create({ name, description = null }) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('name must be a non-empty string.');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    this.#db
      .prepare(
        `INSERT INTO knowledge_bases (id, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, name.trim(), description ?? null, now, now);

    return this.findById(id);
  }

  /**
   * Returns a Knowledge Base by id, or null if not found.
   * @param {string} id
   * @returns {object|null}
   */
  findById(id) {
    const row = this.#db
      .prepare('SELECT * FROM knowledge_bases WHERE id = ?')
      .get(id);
    return row ? this.#toEntity(row) : null;
  }

  /**
   * Checks if a Knowledge Base exists.
   * @param {string} id
   * @returns {boolean}
   */
  exists(id) {
    const row = this.#db
      .prepare('SELECT 1 FROM knowledge_bases WHERE id = ?')
      .get(id);
    return !!row;
  }

  /**
   * Returns all Knowledge Bases ordered by creation date descending.
   * @returns {object[]}
   */
  findAll() {
    return this.#db
      .prepare('SELECT * FROM knowledge_bases ORDER BY created_at DESC')
      .all()
      .map(row => this.#toEntity(row));
  }

  /**
   * Updates the name and/or description of a Knowledge Base.
   * @param {string} id
   * @param {{ name?: string, description?: string }} fields
   * @returns {object|null} Updated Knowledge Base, or null if not found
   */
  update(id, { name, description }) {
    const existing = this.findById(id);
    if (!existing) return null;

    const newName = name !== undefined ? name.trim() : existing.name;
    const newDescription = description !== undefined ? description : existing.description;

    if (!newName) throw new Error('name must be a non-empty string.');

    this.#db
      .prepare(
        `UPDATE knowledge_bases
         SET name = ?, description = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(newName, newDescription ?? null, new Date().toISOString(), id);

    return this.findById(id);
  }

  /**
   * Deletes a Knowledge Base by id.
   * Cascades to resources via the FK constraint.
   * @param {string} id
   * @returns {boolean} true if a row was deleted, false if not found
   */
  delete(id) {
    const result = this.#db
      .prepare('DELETE FROM knowledge_bases WHERE id = ?')
      .run(id);
    return result.changes > 0;
  }

  // ─── private ────────────────────────────────────────────────────────────────

  #toEntity(row) {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default KnowledgeBaseStore;
