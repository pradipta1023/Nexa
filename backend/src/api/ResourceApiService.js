/**
 * Orchestrates Resource operations.
 *
 * Follows the thin API service pattern.
 */
class ResourceApiService {
  #resourceStore;
  #kbStore;
  #cleanupJobStore;

  /**
   * @param {{ resourceStore: import('../KnowledgeBase/ResourceStore.js').default,
   *           kbStore: import('../KnowledgeBase/KnowledgeBaseStore.js').default,
   *           cleanupJobStore: import('../KnowledgeBase/CleanupJobStore.js').default }} deps
   */
  constructor({ resourceStore, kbStore, cleanupJobStore }) {
    this.#resourceStore = resourceStore;
    this.#kbStore = kbStore;
    this.#cleanupJobStore = cleanupJobStore;
  }

  /**
   * Creates a new Resource.
   * @param {{ knowledgeBaseId: string, name: string, type: 'text'|'pdf'|'link', source?: string }} params
   * @returns {object}
   */
  async createResource(params) {
    if (!(await this.#kbStore.exists(params.knowledgeBaseId))) {
      throw new Error(`Knowledge Base not found: ${params.knowledgeBaseId}`);
    }
    return await this.#resourceStore.create(params);
  }

  /**
   * Lists all resources for a Knowledge Base.
   * @param {string} knowledgeBaseId
   * @returns {object[]}
   */
  async listResources(knowledgeBaseId) {
    if (!(await this.#kbStore.exists(knowledgeBaseId))) {
      throw new Error(`Knowledge Base not found: ${knowledgeBaseId}`);
    }
    return await this.#resourceStore.findByKnowledgeBaseId(knowledgeBaseId);
  }

  /**
   * Gets a specific resource by ID.
   * @param {string} knowledgeBaseId
   * @param {string} resourceId
   * @returns {object|null}
   */
  async getResource(knowledgeBaseId, resourceId) {
    const resource = await this.#resourceStore.findById(resourceId);
    if (!resource || resource.knowledgeBaseId !== knowledgeBaseId) {
      return null;
    }
    return resource;
  }

  /**
   * Updates metadata (name/source) of a resource.
   * @param {string} knowledgeBaseId
   * @param {string} resourceId
   * @param {{ name?: string, source?: string }} fields
   * @returns {object|null}
   */
  async updateResourceMetadata(knowledgeBaseId, resourceId, fields) {
    const resource = await this.getResource(knowledgeBaseId, resourceId);
    if (!resource) return null;

    await this.#resourceStore.updateMetadata(resourceId, fields);
    return await this.#resourceStore.findById(resourceId);
  }

  /**
   * Deletes a Resource and schedules Chroma cleanup.
   * @param {string} knowledgeBaseId
   * @param {string} resourceId
   * @returns {boolean}
   */
  async deleteResource(knowledgeBaseId, resourceId) {
    const resource = await this.getResource(knowledgeBaseId, resourceId);
    if (!resource) return false;

    // Enqueue cleanup job
    await this.#cleanupJobStore.enqueue({
      type: 'delete_resource_chunks',
      payload: {
        resourceId: resource.id,
        knowledgeBaseId: resource.knowledgeBaseId,
        ingestionVersion: resource.ingestionVersion
      }
    });

    return await this.#resourceStore.delete(resourceId);
  }
}

export default ResourceApiService;
