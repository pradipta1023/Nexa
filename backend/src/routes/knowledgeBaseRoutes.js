import express from 'express';
import createResourceRoutes from './resourceRoutes.js';

export default function createKnowledgeBaseRoutes({ kbController, resourceController }) {
  const router = express.Router();

  router.post('/', kbController.create);
  router.get('/', kbController.list);
  router.get('/:id', kbController.getOne);
  router.patch('/:id', kbController.update);
  router.delete('/:id', kbController.delete);

  const resourceRoutes = createResourceRoutes({ resourceController });
  router.use('/:knowledgeBaseId/resources', resourceRoutes);

  return router;
}
