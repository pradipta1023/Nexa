import express from 'express';
import multer from 'multer';

export default function createIngestionRoutes({ ingestionController }) {
    const router = express.Router({ mergeParams: true });
    
    // Configure multer for memory storage
    const upload = multer({ storage: multer.memoryStorage() });

    // Text Ingestion API
    router.post('/text', ingestionController.ingestText);
    
    // PDF Ingestion API
    router.post('/pdf', upload.single('pdf'), ingestionController.ingestPdf);

    return router;
}
