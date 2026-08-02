import express from 'express';

export default function createIngestionRoutes({ ingestionController }) {
    const router = express.Router();

    // Text Ingestion API
    // Future PDF ingestion endpoint will be added here
    router.post('/text', ingestionController.ingestText);

    return router;
}
