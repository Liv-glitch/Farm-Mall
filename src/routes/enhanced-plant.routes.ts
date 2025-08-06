import { Router } from 'express';
import { enhancedPlantController } from '../controllers/enhanced-plant.controller';
import { authenticate } from '../middleware/auth.middleware';
import { aiRateLimit, historyRateLimit } from '../middleware/rateLimit.middleware';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(aiRateLimit);

/**
 * @swagger
 * /api/enhanced-plant/identify:
 *   post:
 *     summary: Enhanced Plant Identification (Gemini + Plant.id fallback)
 *     tags: [Enhanced Plant Intelligence]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image1
 *               - location
 *             properties:
 *               image1:
 *                 type: string
 *                 format: binary
 *                 description: Plant image (JPEG, PNG, WebP)
 *               location:
 *                 type: string
 *                 description: User's location (e.g., "Nakuru", "Central Kenya")
 *                 example: "Nakuru"
 *               latitude:
 *                 type: string
 *                 description: GPS latitude (optional)
 *               longitude:
 *                 type: string
 *                 description: GPS longitude (optional)
 *               plant_type:
 *                 type: string
 *                 description: Type of plant (crop, wild, ornamental)
 *                 enum: [crop, wild, ornamental, all]
 *               region:
 *                 type: string
 *                 description: Broader region for context
 *                 default: kenya
 *               similar_images:
 *                 type: string
 *                 description: Include similar images
 *                 default: "true"
 *     responses:
 *       200:
 *         description: Plant identified successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/identify', 
  enhancedPlantController.uploadMiddleware,
  enhancedPlantController.identify.bind(enhancedPlantController)
);

/**
 * @swagger
 * /api/enhanced-plant/health:
 *   post:
 *     summary: Enhanced Plant Health Assessment
 *     tags: [Enhanced Plant Intelligence]
 *     security:
 *       - bearerAuth: []
 */
router.post('/health',
  enhancedPlantController.uploadMiddleware,
  enhancedPlantController.assessHealth.bind(enhancedPlantController)
);

/**
 * @swagger
 * /api/enhanced-plant/soil:
 *   post:
 *     summary: Soil Analysis with PDF Processing
 *     tags: [Enhanced Plant Intelligence]
 *     security:
 *       - bearerAuth: []
 */
router.post('/soil',
  enhancedPlantController.uploadSoilMiddleware,
  enhancedPlantController.analyzeSoil.bind(enhancedPlantController)
);

/**
 * @swagger
 * /api/enhanced-plant/yield:
 *   post:
 *     summary: Smart Yield Calculation and Prediction
 *     tags: [Enhanced Plant Intelligence]
 *     security:
 *       - bearerAuth: []
 */
router.post('/yield',
  enhancedPlantController.calculateYield.bind(enhancedPlantController)
);

/**
 * @swagger
 * /api/enhanced-plant/history:
 *   get:
 *     summary: Get User's Analysis History
 *     tags: [Enhanced Plant Intelligence]
 *     security:
 *       - bearerAuth: []
 */
router.get('/history',
  historyRateLimit,
  enhancedPlantController.getHistory.bind(enhancedPlantController)
);

/**
 * @swagger
 * /api/enhanced-plant/health-check:
 *   get:
 *     summary: Service Health Check
 *     tags: [Enhanced Plant Intelligence]
 */
router.get('/health-check',
  enhancedPlantController.healthCheck.bind(enhancedPlantController)
);

export default router;