import express from 'express';

export default function createResourceRoutes({ resourceController }) {
  // mergeParams is required to access knowledgeBaseId from the parent route
  const router = express.Router({ mergeParams: true });

  router.post('/', resourceController.create);
  router.get('/', resourceController.list);
  router.get('/:id', resourceController.getOne);
  router.patch('/:id', resourceController.updateMetadata);
  router.delete('/:id', resourceController.delete);

  return router;
}
