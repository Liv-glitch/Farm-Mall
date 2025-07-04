import { Router } from 'express';
import { simplePlantIdController } from '../controllers/simple-plantid.controller';

const router = Router();

/**
 * Simple Plant.id identification endpoint
 * POST /api/v1/simple-plantid/identify
 * 
 * Form data:
 * - image1: Image file
 * - latitude: Latitude (optional, defaults to 49.207)
 * - longitude: Longitude (optional, defaults to 16.608) 
 * - similar_images: Whether to include similar images (optional, defaults to true)
 */
router.post('/identify',
  simplePlantIdController.uploadMiddleware,
  simplePlantIdController.identify.bind(simplePlantIdController)
);

export default router; 