import express from 'express';

export default function createKnowledgeBaseRoutes({ kbController }) {
  const router = express.Router();

  router.post('/', kbController.create);
  router.get('/', kbController.list);
  router.get('/:id', kbController.getOne);
  router.patch('/:id', kbController.update);
  router.delete('/:id', kbController.delete);

  return router;
}
