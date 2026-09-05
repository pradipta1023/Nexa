/**
 * Orchestrates Knowledge Base operations.
 *
 * Follows the thin API service pattern: coordinates domain stores but
 * contains no HTTP-specific logic. Controllers call this; stores do the persistence.
 */
class KnowledgeBaseApiService {
  #kbStore;
  #resourceStore;
  #cleanupJobStore;

  /**
   * @param {{ kbStore: import('../KnowledgeBase/KnowledgeBaseStore.js').default,
   *           resourceStore: import('../KnowledgeBase/ResourceStore.js').default,
   *           cleanupJobStore: import('../KnowledgeBase/CleanupJobStore.js').default }} deps
   */
  constructor({ kbStore, resourceStore, cleanupJobStore }) {
    this.#kbStore = kbStore;
    this.#resourceStore = resourceStore;
    this.#cleanupJobStore = cleanupJobStore;
  }

  /**
   * Creates a new Knowledge Base.
   * @param {{ name: string, description?: string }} params
   * @returns {object} The created KB
   */
  async createKnowledgeBase({ name, description }) {
    return await this.#kbStore.create({ name, description });
  }

  /**
   * Returns all Knowledge Bases.
   * @returns {object[]}
   */
  async listKnowledgeBases() {
    return await this.#kbStore.findAll();
  }

  /**
   * Returns a single Knowledge Base with resource counts grouped by type.
   * @param {string} id
   * @returns {object|null}
   */
  async getKnowledgeBase(id) {
    const kb = await this.#kbStore.findById(id);
    if (!kb) return null;

    const resources = await this.#resourceStore.findByKnowledgeBaseId(id);
    const resourceCounts = { text: 0, pdf: 0, link: 0 };
    for (const r of resources) {
      resourceCounts[r.type] = (resourceCounts[r.type] ?? 0) + 1;
    }

    return { ...kb, resourceCounts };
  }

  /**
   * Updates the name and/or description of a Knowledge Base.
   * @param {string} id
   * @param {{ name?: string, description?: string }} fields
   * @returns {object|null}
   */
  async updateKnowledgeBase(id, { name, description }) {
    const kb = await this.#kbStore.findById(id);
    if (!kb) return null;

    return await this.#kbStore.update(id, { name, description });
  }

  /**
   * Deletes a Knowledge Base and schedules background Chroma cleanup.
   *
   * Flow:
   * 1. Enqueue one cleanup job per resource (so Chroma chunks are cleaned up).
   * 2. Delete the KB from SQLite (resources cascade via FK).
   * 3. Return immediately — Chroma cleanup runs in the background.
   *
   * @param {string} id
   * @returns {boolean} false if KB not found
   */
  async deleteKnowledgeBase(id) {
    const kb = await this.#kbStore.findById(id);
    if (!kb) return false;

    // Snapshot resources before cascade-delete removes them.
    const resources = await this.#resourceStore.findByKnowledgeBaseId(id);

    // Enqueue one cleanup job per resource to delete its Chroma chunks.
    // Jobs execute sequentially in the order they are enqueued (BE-9).
    for (const resource of resources) {
      await this.#cleanupJobStore.enqueue({
        type: 'delete_resource_chunks',
        payload: {
          resourceId: resource.id,
          knowledgeBaseId: id,
          ingestionVersion: resource.ingestionVersion,
        },
      });
    }

    await this.#kbStore.delete(id);
    return true;
  }
}

export default KnowledgeBaseApiService;
