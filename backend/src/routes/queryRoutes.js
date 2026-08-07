import express from 'express';

export default function createQueryRoutes({ queryController }) {
    const router = express.Router();

    router.post('/', queryController.ask);

    return router;
}
