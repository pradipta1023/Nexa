/**
 * Thin HTTP layer for Knowledge Base operations.
 * Validates HTTP input, delegates to KnowledgeBaseApiService, returns responses.
 * Contains no business logic.
 */
class KnowledgeBaseController {
  #kbApiService;

  constructor({ kbApiService }) {
    this.#kbApiService = kbApiService;
  }

  create = async (req, res) => {
    try {
      const { name, description } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: "The 'name' field is required and must be a non-empty string." });
      }

      const kb = await this.#kbApiService.createKnowledgeBase({ name, description });
      return res.status(201).json(kb);
    } catch (error) {
      console.error('[KnowledgeBaseController] create error:', error);
      return res.status(500).json({ error: error.message || 'An unexpected error occurred.' });
    }
  };

  list = async (_req, res) => {
    try {
      const kbs = await this.#kbApiService.listKnowledgeBases();
      return res.status(200).json(kbs);
    } catch (error) {
      console.error('[KnowledgeBaseController] list error:', error);
      return res.status(500).json({ error: error.message || 'An unexpected error occurred.' });
    }
  };

  getOne = async (req, res) => {
    try {
      const { id } = req.params;
      const kb = await this.#kbApiService.getKnowledgeBase(id);

      if (!kb) {
        return res.status(404).json({ error: `Knowledge Base not found: ${id}` });
      }

      return res.status(200).json(kb);
    } catch (error) {
      console.error('[KnowledgeBaseController] getOne error:', error);
      return res.status(500).json({ error: error.message || 'An unexpected error occurred.' });
    }
  };

  update = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
        return res.status(400).json({ error: "The 'name' field must be a non-empty string." });
      }

      const kb = await this.#kbApiService.updateKnowledgeBase(id, { name, description });

      if (!kb) {
        return res.status(404).json({ error: `Knowledge Base not found: ${id}` });
      }

      return res.status(200).json(kb);
    } catch (error) {
      console.error('[KnowledgeBaseController] update error:', error);
      return res.status(500).json({ error: error.message || 'An unexpected error occurred.' });
    }
  };

  delete = async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await this.#kbApiService.deleteKnowledgeBase(id);

      if (!deleted) {
        return res.status(404).json({ error: `Knowledge Base not found: ${id}` });
      }

      return res.status(200).json({ message: 'Knowledge Base deleted. Chroma cleanup scheduled.' });
    } catch (error) {
      console.error('[KnowledgeBaseController] delete error:', error);
      return res.status(500).json({ error: error.message || 'An unexpected error occurred.' });
    }
  };
}

export default KnowledgeBaseController;
