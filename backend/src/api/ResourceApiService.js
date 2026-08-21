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
  createResource(params) {
    if (!this.#kbStore.exists(params.knowledgeBaseId)) {
      throw new Error(`Knowledge Base not found: ${params.knowledgeBaseId}`);
    }
    return this.#resourceStore.create(params);
  }

  /**
   * Lists all resources for a Knowledge Base.
   * @param {string} knowledgeBaseId
   * @returns {object[]}
   */
  listResources(knowledgeBaseId) {
    if (!this.#kbStore.exists(knowledgeBaseId)) {
      throw new Error(`Knowledge Base not found: ${knowledgeBaseId}`);
    }
    return this.#resourceStore.findByKnowledgeBaseId(knowledgeBaseId);
  }

  /**
   * Gets a specific resource by ID.
   * @param {string} knowledgeBaseId
   * @param {string} resourceId
   * @returns {object|null}
   */
  getResource(knowledgeBaseId, resourceId) {
    const resource = this.#resourceStore.findById(resourceId);
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
  updateResourceMetadata(knowledgeBaseId, resourceId, fields) {
    const resource = this.getResource(knowledgeBaseId, resourceId);
    if (!resource) return null;

    this.#resourceStore.updateMetadata(resourceId, fields);
    return this.#resourceStore.findById(resourceId);
  }

  /**
   * Deletes a Resource and schedules Chroma cleanup.
   * @param {string} knowledgeBaseId
   * @param {string} resourceId
   * @returns {boolean}
   */
  deleteResource(knowledgeBaseId, resourceId) {
    const resource = this.getResource(knowledgeBaseId, resourceId);
    if (!resource) return false;

    // Enqueue cleanup job
    this.#cleanupJobStore.enqueue({
      type: 'delete_resource_chunks',
      payload: {
        resourceId: resource.id,
        knowledgeBaseId: resource.knowledgeBaseId,
        ingestionVersion: resource.ingestionVersion
      }
    });

    return this.#resourceStore.delete(resourceId);
  }
}

export default ResourceApiService;
