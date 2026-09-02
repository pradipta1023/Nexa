import { v4 as uuidv4 } from 'uuid';

const VALID_TYPES = ['text', 'pdf', 'link'];
const VALID_STATUSES = ['pending', 'processing', 'ready', 'failed'];

/**
 * MongoDB Atlas implementation of the Resource store.
 */
class MongoResourceStore {
  #db;

  constructor(db) {
    if (!db) throw new Error('MongoResourceStore requires a db instance.');
    this.#db = db;
  }

  /**
   * Creates a new Resource in the pending state.
   * @param {{ knowledgeBaseId: string, name: string, type: 'text'|'pdf'|'link', source?: string }} params
   * @returns {Promise<object>} The created Resource
   */
  async create({ knowledgeBaseId, name, type, source = null }) {
    this.#validateCreateParams(knowledgeBaseId, name, type);

    const id = uuidv4();
    const resource = this.#prepareResource(id, knowledgeBaseId, name, type, source);

    await this.#db.resources.insertOne(resource);
    return this.findById(id);
  }

  /**
   * Returns a Resource by id, or null if not found.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const row = await this.#db.resources.findOne({ _id: id });
    return row ? this.#toEntity(row) : null;
  }

  /**
   * Returns all Resources belonging to a Knowledge Base.
   * @param {string} knowledgeBaseId
   * @returns {Promise<object[]>}
   */
  async findByKnowledgeBaseId(knowledgeBaseId) {
    const rows = await this.#db.resources
      .find({ knowledgeBaseId })
      .sort({ createdAt: 1 })
      .toArray();
    return rows.map(row => this.#toEntity(row));
  }

  /**
   * Updates the status of a Resource.
   * @param {string} id
   * @param {'pending'|'processing'|'ready'|'failed'} status
   * @returns {Promise<boolean>}
   */
  async updateStatus(id, status) {
    this.#validateStatus(status);

    const result = await this.#db.resources.updateOne(
      { _id: id },
      {
        $set: {
          status,
          updatedAt: new Date()
        }
      }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Updates the name (and optionally source) of a Resource.
   * @param {string} id
   * @param {{ name?: string, source?: string }} fields
   * @returns {Promise<boolean>}
   */
  async updateMetadata(id, { name, source } = {}) {
    const existing = await this.findById(id);
    if (!existing) return false;

    const newName = name !== undefined ? name.trim() : existing.name;
    if (name !== undefined && !newName) throw new Error('name must be a non-empty string.');

    const newSource = source !== undefined ? source : existing.source;

    const result = await this.#db.resources.updateOne(
      { _id: id },
      {
        $set: {
          name: newName,
          source: newSource ?? null,
          updatedAt: new Date()
        }
      }
    );
    
    return result.matchedCount > 0;
  }

  /**
   * Increments the ingestion_version of a Resource by 1.
   * @param {string} id
   * @returns {Promise<number>} The new ingestion_version, or -1 if not found
   */
  async bumpIngestionVersion(id) {
    const existing = await this.findById(id);
    if (!existing) return -1;

    const newVersion = existing.ingestionVersion + 1;
    await this.#db.resources.updateOne(
      { _id: id },
      {
        $set: {
          ingestionVersion: newVersion,
          updatedAt: new Date()
        }
      }
    );

    return newVersion;
  }

  /**
   * Deletes a Resource by id.
   * @param {string} id
   * @returns {Promise<boolean>} true if a row was deleted, false if not found
   */
  async delete(id) {
    const result = await this.#db.resources.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  #validateCreateParams(knowledgeBaseId, name, type) {
    if (!knowledgeBaseId || typeof knowledgeBaseId !== 'string') {
      throw new Error('knowledgeBaseId must be a non-empty string.');
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('name must be a non-empty string.');
    }
    if (!VALID_TYPES.includes(type)) {
      throw new Error(`type must be one of: ${VALID_TYPES.join(', ')}.`);
    }
  }

  #validateStatus(status) {
    if (!VALID_STATUSES.includes(status)) {
      throw new Error(`status must be one of: ${VALID_STATUSES.join(', ')}.`);
    }
  }

  #prepareResource(id, knowledgeBaseId, name, type, source) {
    const now = new Date();
    return {
      _id: id,
      knowledgeBaseId,
      name: name.trim(),
      type,
      status: 'pending',
      source: source ?? null,
      ingestionVersion: 0,
      createdAt: now,
      updatedAt: now
    };
  }

  #toEntity(row) {
    return {
      id: row._id,
      knowledgeBaseId: row.knowledgeBaseId,
      name: row.name,
      type: row.type,
      status: row.status,
      source: row.source,
      ingestionVersion: row.ingestionVersion,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

export default MongoResourceStore;
