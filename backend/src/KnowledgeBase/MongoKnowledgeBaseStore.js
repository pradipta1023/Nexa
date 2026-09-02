import { v4 as uuidv4 } from 'uuid';

/**
 * MongoDB Atlas implementation of the Knowledge Base store.
 */
class MongoKnowledgeBaseStore {
  #db;

  constructor(db) {
    if (!db) throw new Error('MongoKnowledgeBaseStore requires a db instance.');
    this.#db = db;
  }

  /**
   * Creates a new Knowledge Base.
   * @param {{ name: string, description?: string }} params
   * @returns {Promise<object>} The created Knowledge Base
   */
  async create({ name, description = null }) {
    this.#validateName(name);

    const id = uuidv4();
    const kb = this.#prepareKB(id, name, description);
    
    await this.#db.knowledgeBases.insertOne(kb);
    return this.findById(id);
  }

  /**
   * Returns a Knowledge Base by id, or null if not found.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const row = await this.#db.knowledgeBases.findOne({ _id: id });
    return row ? this.#toEntity(row) : null;
  }

  /**
   * Checks if a Knowledge Base exists.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async exists(id) {
    const row = await this.#db.knowledgeBases.findOne(
      { _id: id },
      { projection: { _id: 1 } }
    );
    return Boolean(row);
  }

  /**
   * Returns all Knowledge Bases ordered by creation date descending.
   * @returns {Promise<object[]>}
   */
  async findAll() {
    const rows = await this.#db.knowledgeBases
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return rows.map(row => this.#toEntity(row));
  }

  /**
   * Updates the name and/or description of a Knowledge Base.
   * @param {string} id
   * @param {{ name?: string, description?: string }} fields
   * @returns {Promise<object|null>} Updated Knowledge Base, or null if not found
   */
  async update(id, { name, description }) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const newName = name !== undefined ? name.trim() : existing.name;
    const newDescription = description !== undefined ? description : existing.description;

    this.#validateName(newName);

    await this.#db.knowledgeBases.updateOne(
      { _id: id },
      {
        $set: {
          name: newName,
          description: newDescription ?? null,
          updatedAt: new Date()
        }
      }
    );

    return this.findById(id);
  }

  /**
   * Deletes a Knowledge Base by id.
   * Explicitly cascades deletion to resources to preserve SQLite FK behavior.
   * @param {string} id
   * @returns {Promise<boolean>} true if a row was deleted, false if not found
   */
  async delete(id) {
    let deletedCount = 0;
    const session = this.#db.client.startSession();
    try {
      await session.withTransaction(async () => {
        // Cascade delete resources
        await this.#db.resources.deleteMany({ knowledgeBaseId: id }, { session });
        
        const result = await this.#db.knowledgeBases.deleteOne({ _id: id }, { session });
        deletedCount = result.deletedCount;
      });
    } finally {
      await session.endSession();
    }
    
    return deletedCount > 0;
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  #validateName(name) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('name must be a non-empty string.');
    }
  }

  #prepareKB(id, name, description) {
    const now = new Date();
    return {
      _id: id,
      name: name.trim(),
      description: description ?? null,
      createdAt: now,
      updatedAt: now
    };
  }

  #toEntity(row) {
    return {
      id: row._id,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

export default MongoKnowledgeBaseStore;
