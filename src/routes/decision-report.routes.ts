import { Router } from 'express';
import { decisionReportController } from '../controllers/decision-report.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     DecisionReportRequest:
 *       type: object
 *       required:
 *         - county
 *         - subCounty
 *         - fieldSizeAcres
 *         - waterSource
 *         - plantingDate
 *         - seedSource
 *         - cropVarietyIds
 *         - priority
 *       properties:
 *         county:
 *           type: string
 *           example: "Nakuru"
 *         subCounty:
 *           type: string
 *           example: "Elburgon"
 *         locationName:
 *           type: string
 *           example: "Elburgon"
 *         gpsLat:
 *           type: number
 *         gpsLng:
 *           type: number
 *         fieldSizeAcres:
 *           type: number
 *           example: 3
 *         waterSource:
 *           type: string
 *           enum: [rainfed, irrigated]
 *         plantingDate:
 *           type: string
 *           format: date
 *           example: "2026-07-20"
 *         previousCrop:
 *           type: string
 *           example: "Maize"
 *         seedSource:
 *           type: string
 *           enum: [certified, farm_saved, unknown]
 *         cropVarietyIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           minItems: 1
 *           maxItems: 4
 *         priority:
 *           type: string
 *           enum: [yield, disease_resistance, cost, balanced]
 *         soilTestId:
 *           type: string
 *           format: uuid
 */

/**
 * @swagger
 * /api/v1/decision-reports/generate:
 *   post:
 *     summary: Generate a Farm Decision Report
 *     description: Runs a deterministic scoring engine across 7 prediction areas (location suitability, planting window, disease risk, yield, variety ranking, price forecast, profitability) and returns a complete, print-ready HTML report. Nothing is persisted.
 *     tags: [Decision Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DecisionReportRequest'
 *     responses:
 *       200:
 *         description: Report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     reportId:
 *                       type: string
 *                     generatedAt:
 *                       type: string
 *                     html:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/generate', decisionReportController.generate.bind(decisionReportController));

/**
 * @swagger
 * /api/v1/decision-reports/form-options:
 *   get:
 *     summary: Get form options for the Farm Decision Report input form
 *     description: Returns Kenya counties and available potato crop varieties so the frontend form doesn't need to hardcode a second copy of this data.
 *     tags: [Decision Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Form options retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/form-options', decisionReportController.getFormOptions.bind(decisionReportController));

export default router;
