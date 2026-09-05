/**
 * Thin HTTP layer for Resource operations.
 * Validates HTTP input, delegates to ResourceApiService, returns responses.
 */
class ResourceController {
  #resourceApiService;

  constructor({ resourceApiService }) {
    this.#resourceApiService = resourceApiService;
  }

  create = async (req, res) => {
    try {
      const { knowledgeBaseId } = req.params;
      const { name, type, source } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: "The 'name' field is required and must be a non-empty string." });
      }

      if (!['text', 'pdf', 'link'].includes(type)) {
        return res.status(400).json({ error: "The 'type' field must be one of: text, pdf, link." });
      }

      // NOTE: For 'link' types, we might want to validate 'source' is a valid URL, 
      // but for now we just pass it to the service.

      const resource = await this.#resourceApiService.createResource({
        knowledgeBaseId,
        name,
        type,
        source
      });

      return res.status(201).json(resource);
    } catch (error) {
      if (error.message.startsWith('Knowledge Base not found')) {
        return res.status(404).json({ error: error.message });
      }
      console.error('[ResourceController] create error:', error);
      return res.status(500).json({ error: error.message || 'An unexpected error occurred.' });
    }
  };

  list = async (req, res) => {
    try {
      const { knowledgeBaseId } = req.params;
      const resources = await this.#resourceApiService.listResources(knowledgeBaseId);
      return res.status(200).json(resources);
    } catch (error) {
      if (error.message.startsWith('Knowledge Base not found')) {
        return res.status(404).json({ error: error.message });
      }
      console.error('[ResourceController] list error:', error);
      return res.status(500).json({ error: error.message || 'An unexpected error occurred.' });
    }
  };

  getOne = async (req, res) => {
    try {
      const { knowledgeBaseId, id } = req.params;
      const resource = await this.#resourceApiService.getResource(knowledgeBaseId, id);

      if (!resource) {
        return res.status(404).json({ error: `Resource not found: ${id} in Knowledge Base: ${knowledgeBaseId}` });
      }

      return res.status(200).json(resource);
    } catch (error) {
      console.error('[ResourceController] getOne error:', error);
      return res.status(500).json({ error: error.message || 'An unexpected error occurred.' });
    }
  };

  updateMetadata = async (req, res) => {
    try {
      const { knowledgeBaseId, id } = req.params;
      const { name, source } = req.body;

      if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
        return res.status(400).json({ error: "The 'name' field must be a non-empty string." });
      }

      const resource = await this.#resourceApiService.updateResourceMetadata(knowledgeBaseId, id, { name, source });

      if (!resource) {
        return res.status(404).json({ error: `Resource not found: ${id} in Knowledge Base: ${knowledgeBaseId}` });
      }

      return res.status(200).json(resource);
    } catch (error) {
      console.error('[ResourceController] updateMetadata error:', error);
      return res.status(500).json({ error: error.message || 'An unexpected error occurred.' });
    }
  };

  delete = async (req, res) => {
    try {
      const { knowledgeBaseId, id } = req.params;
      const deleted = await this.#resourceApiService.deleteResource(knowledgeBaseId, id);

      if (!deleted) {
        return res.status(404).json({ error: `Resource not found: ${id} in Knowledge Base: ${knowledgeBaseId}` });
      }

      return res.status(200).json({ message: 'Resource deleted. Chroma cleanup scheduled.' });
    } catch (error) {
      console.error('[ResourceController] delete error:', error);
      return res.status(500).json({ error: error.message || 'An unexpected error occurred.' });
    }
  };
}

export default ResourceController;
