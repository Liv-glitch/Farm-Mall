import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     PestAnalysisRequest:
 *       type: object
 *       required:
 *         - cropType
 *         - location
 *       properties:
 *         cropType:
 *           type: string
 *           enum: [potato, maize, beans, tomato, onion, cabbage, carrot]
 *           example: "potato"
 *         location:
 *           type: object
 *           properties:
 *             latitude:
 *               type: number
 *               example: -0.2367
 *             longitude:
 *               type: number
 *               example: 37.6531
 *         farmingStage:
 *           type: string
 *           example: "flowering"
 *         symptoms:
 *           type: array
 *           items:
 *             type: string
 *           example: ["leaf spots", "yellowing"]
 *         imageUrl:
 *           type: string
 *           format: uri
 *           example: "https://example.com/plant-image.jpg"
 *     
 *     PestAnalysisResponse:
 *       type: object
 *       properties:
 *         analysisId:
 *           type: string
 *           format: uuid
 *         confidence:
 *           type: number
 *           example: 0.85
 *         detectedPests:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Potato Late Blight"
 *               scientificName:
 *                 type: string
 *                 example: "Phytophthora infestans"
 *               confidence:
 *                 type: number
 *                 example: 0.92
 *               severity:
 *                 type: string
 *                 enum: [low, moderate, high]
 *                 example: "high"
 *               description:
 *                 type: string
 *               affectedArea:
 *                 type: object
 *                 properties:
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: array
 *                       items:
 *                         type: number
 *                   percentage:
 *                     type: number
 *         detectedDiseases:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               scientificName:
 *                 type: string
 *               confidence:
 *                 type: number
 *               severity:
 *                 type: string
 *                 enum: [low, moderate, high]
 *               description:
 *                 type: string
 *         overallHealth:
 *           type: string
 *           enum: [good, poor]
 *         riskFactors:
 *           type: array
 *           items:
 *             type: string
 *         recommendations:
 *           type: array
 *           items:
 *             type: string
 *         metadata:
 *           type: object
 *           properties:
 *             processingTime:
 *               type: number
 *             imageSize:
 *               type: object
 *             modelVersion:
 *               type: string
 */

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /api/v1/ai/pest-analysis/upload:
 *   post:
 *     summary: Analyze pest and diseases from uploaded image
 *     description: Upload a plant image and get AI-powered pest and disease analysis using PlantID API.
 *     tags: [AI Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - cropType
 *               - location
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Plant image file (JPEG, PNG, WebP, max 10MB)
 *               cropType:
 *                 type: string
 *                 enum: [potato, maize, beans, tomato, onion, cabbage, carrot]
 *               location:
 *                 type: string
 *                 description: JSON string of location object with latitude and longitude
 *               farmingStage:
 *                 type: string
 *                 description: Current farming stage
 *               symptoms:
 *                 type: string
 *                 description: JSON string array of observed symptoms
 *     responses:
 *       200:
 *         description: Analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     analysis:
 *                       $ref: '#/components/schemas/PestAnalysisResponse'
 *                     imageMetadata:
 *                       type: object
 *                     processingInfo:
 *                       type: object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       503:
 *         description: AI service temporarily unavailable
 */
router.post('/pest-analysis/upload', 
  aiController.uploadMiddleware,
  aiController.analyzePestFromImage.bind(aiController)
);

/**
 * @swagger
 * /api/v1/ai/pest-analysis/url:
 *   post:
 *     summary: Analyze pest and diseases from image URL
 *     description: Analyze a plant image from a URL using AI-powered pest and disease detection.
 *     tags: [AI Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/PestAnalysisRequest'
 *               - type: object
 *                 required:
 *                   - imageUrl
 *     responses:
 *       200:
 *         description: Analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PestAnalysisResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       503:
 *         description: AI service temporarily unavailable
 */
router.post('/pest-analysis/url', aiController.analyzePestFromUrl.bind(aiController));

/**
 * @swagger
 * /api/v1/ai/analysis-history:
 *   get:
 *     summary: Get pest analysis history
 *     description: Retrieve user's previous pest and disease analysis results.
 *     tags: [AI Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of analyses to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of analyses to skip
 *     responses:
 *       200:
 *         description: Analysis history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       imageUrl:
 *                         type: string
 *                       analysis:
 *                         $ref: '#/components/schemas/PestAnalysisResponse'
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/analysis-history', aiController.getAnalysisHistory.bind(aiController));

/**
 * @swagger
 * /api/v1/ai/pest-statistics:
 *   get:
 *     summary: Get pest statistics for location
 *     description: Get common pests, seasonal trends, and risk levels for a specific location.
 *     tags: [AI Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: county
 *         required: true
 *         schema:
 *           type: string
 *         description: County name
 *       - in: query
 *         name: subCounty
 *         schema:
 *           type: string
 *         description: Sub-county name (optional)
 *     responses:
 *       200:
 *         description: Pest statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     commonPests:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           scientificName:
 *                             type: string
 *                           frequency:
 *                             type: number
 *                           severity:
 *                             type: string
 *                     seasonalTrends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                           pestCount:
 *                             type: number
 *                           diseaseCount:
 *                             type: number
 *                     riskLevel:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/pest-statistics', aiController.getPestStatistics.bind(aiController));

/**
 * @swagger
 * /api/v1/ai/test-plantid:
 *   post:
 *     summary: Test PlantID API connection
 *     description: Test the PlantID API integration with a sample image.
 *     tags: [AI Analysis]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API test successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     testResult:
 *                       $ref: '#/components/schemas/PestAnalysisResponse'
 *                     apiStatus:
 *                       type: string
 *                       example: "connected"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       503:
 *         description: PlantID API connection failed
 */
router.post('/test-plantid', aiController.testPlantIdConnection.bind(aiController));

/**
 * @swagger
 * /api/v1/ai/health-assessment:
 *   post:
 *     summary: Comprehensive plant health assessment
 *     description: Perform a comprehensive plant health assessment combining pest analysis, disease detection, and overall health evaluation using Plant.id API format.
 *     tags: [AI Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/PestAnalysisRequest'
 *               - type: object
 *                 required:
 *                   - imageUrl
 *     responses:
 *       200:
 *         description: Health assessment completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                     model_version:
 *                       type: string
 *                       example: "plant-id-3.0.1"
 *                     custom_id:
 *                       type: string
 *                       nullable: true
 *                     input:
 *                       type: object
 *                       properties:
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *                         modifiers:
 *                           type: array
 *                           items:
 *                             type: string
 *                         images:
 *                           type: array
 *                           items:
 *                             type: string
 *                     result:
 *                       type: object
 *                       properties:
 *                         is_plant:
 *                           type: object
 *                           properties:
 *                             probability:
 *                               type: number
 *                             threshold:
 *                               type: number
 *                             binary:
 *                               type: boolean
 *                         classification:
 *                           type: object
 *                         disease:
 *                           type: object
 *                         health_assessment:
 *                           type: object
 *                           properties:
 *                             is_healthy:
 *                               type: object
 *                               properties:
 *                                 probability:
 *                                   type: number
 *                                 threshold:
 *                                   type: number
 *                                 binary:
 *                                   type: boolean
 *                             diseases:
 *                               type: array
 *                               items:
 *                                 type: object
 *                     status:
 *                       type: string
 *                       example: "COMPLETED"
 *                     created:
 *                       type: string
 *                       format: date-time
 *                     completed:
 *                       type: string
 *                       format: date-time
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/health-assessment', authenticate, aiController.assessPlantHealth.bind(aiController));

/**
 * @swagger
 * /api/v1/ai/health-assessment/upload:
 *   post:
 *     summary: Comprehensive plant health assessment with file upload
 *     description: Upload a plant image directly and get comprehensive health assessment without needing pre-uploaded URLs.
 *     tags: [AI Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - cropType
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Plant image file (JPEG, PNG, WebP, max 10MB)
 *               cropType:
 *                 type: string
 *                 enum: [potato, maize, beans, tomato, onion, cabbage, carrot]
 *               location:
 *                 type: string
 *                 description: JSON string of location object with latitude and longitude
 *               farmingStage:
 *                 type: string
 *                 description: Current farming stage
 *               symptoms:
 *                 type: string
 *                 description: JSON string array of observed symptoms
 *     responses:
 *       200:
 *         description: Health assessment completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     healthAssessment:
 *                       type: object
 *                       description: Plant.id API compatible health assessment
 *                     imageMetadata:
 *                       type: object
 *                     processingInfo:
 *                       type: object
 *                       properties:
 *                         originalUrl:
 *                           type: string
 *                         processedUrl:
 *                           type: string
 *                         thumbnailUrl:
 *                           type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/health-assessment/upload', 
  authenticate, 
  aiController.uploadMiddleware, 
  aiController.assessPlantHealthFromUpload.bind(aiController)
);

/**
 * @swagger
 * /api/v1/ai/service-status:
 *   get:
 *     summary: Get service integration status
 *     description: Check the status and integration health of ImageProcessing and PestAnalysis services.
 *     tags: [AI Analysis]
 *     responses:
 *       200:
 *         description: Service status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     services:
 *                       type: object
 *                       properties:
 *                         imageProcessingService:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                             features:
 *                               type: object
 *                             lastTest:
 *                               type: object
 *                         pestAnalysisService:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                             features:
 *                               type: object
 *                     integrationFlow:
 *                       type: object
 *                     dependencies:
 *                       type: object
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/service-status', aiController.getServiceStatus.bind(aiController));

// Placeholder routes for future implementation
router.get('/weather-forecast', (_, res) => {
  res.status(501).json({ message: 'Weather forecast endpoint - coming soon' });
});

router.get('/weather-current', (_, res) => {
  res.status(501).json({ message: 'Current weather endpoint - coming soon' });
});

router.post('/soil-recommendations', (_, res) => {
  res.status(501).json({ message: 'Soil recommendations endpoint - coming soon' });
});

export default router; 