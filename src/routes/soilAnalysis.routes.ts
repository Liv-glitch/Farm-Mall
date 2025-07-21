import { Router } from 'express';
import { SoilAnalysisController } from '../controllers/soilAnalysis.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const soilAnalysisController = new SoilAnalysisController();

/**
 * @swagger
 * components:
 *   schemas:
 *     SoilTest:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         farmId:
 *           type: string
 *           format: uuid
 *         documentUrl:
 *           type: string
 *           format: uri
 *         thumbnailUrl:
 *           type: string
 *           format: uri
 *         originalFilename:
 *           type: string
 *         analysisResult:
 *           type: object
 *           properties:
 *             ph:
 *               type: number
 *             nitrogen:
 *               type: number
 *             phosphorus:
 *               type: number
 *             potassium:
 *               type: number
 *             organicMatter:
 *               type: number
 *             texture:
 *               type: string
 *             recommendations:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                   description:
 *                     type: string
 *                   priority:
 *                     type: string
 *                     enum: [high, medium, low]
 *             suitableCrops:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   cropType:
 *                     type: string
 *                   suitabilityScore:
 *                     type: number
 *                   notes:
 *                     type: string
 *         status:
 *           type: string
 *           enum: [pending, analyzed, failed]
 *         aiModelVersion:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/soil-analysis/upload:
 *   post:
 *     summary: Upload and analyze a soil test document
 *     description: Upload a soil test document (PDF or image) and queue it for analysis
 *     tags: [Soil Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               farmId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Document uploaded and queued for analysis
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
 *                   $ref: '#/components/schemas/SoilTest'
 *       400:
 *         description: Invalid request (no file or invalid file type)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/upload',
  authenticate,
  soilAnalysisController.uploadMiddleware.single('file'),
  soilAnalysisController.uploadAndAnalyze.bind(soilAnalysisController)
);

/**
 * @swagger
 * /api/v1/soil-analysis:
 *   get:
 *     summary: Get user's soil tests
 *     description: Retrieve all soil tests for the authenticated user
 *     tags: [Soil Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: farmId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by farm ID
 *     responses:
 *       200:
 *         description: List of soil tests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SoilTest'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, soilAnalysisController.getSoilTests.bind(soilAnalysisController));

/**
 * @swagger
 * /api/v1/soil-analysis/{id}:
 *   get:
 *     summary: Get a specific soil test
 *     description: Retrieve details of a specific soil test by ID
 *     tags: [Soil Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Soil test ID
 *     responses:
 *       200:
 *         description: Soil test details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/SoilTest'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Soil test not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticate, soilAnalysisController.getSoilTest.bind(soilAnalysisController));

export default router; 