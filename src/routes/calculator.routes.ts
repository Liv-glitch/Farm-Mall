import { Router } from 'express';
import { calculatorController } from '../controllers/calculator.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CostCalculationRequest:
 *       type: object
 *       required:
 *         - cropVarietyId
 *         - landSizeAcres
 *         - seedSize
 *       properties:
 *         cropVarietyId:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440001"
 *         landSizeAcres:
 *           type: number
 *           example: 2.5
 *         seedSize:
 *           type: integer
 *           enum: [1, 2]
 *           example: 1
 *         location:
 *           type: object
 *           properties:
 *             county:
 *               type: string
 *               example: "Meru"
 *             subCounty:
 *               type: string
 *               example: "Central"
 *             latitude:
 *               type: number
 *               example: -0.2367
 *             longitude:
 *               type: number
 *               example: 37.6531
 *     
 *     CostCalculationResponse:
 *       type: object
 *       properties:
 *         cropVarietyId:
 *           type: string
 *           format: uuid
 *         cropVarietyName:
 *           type: string
 *         landSizeAcres:
 *           type: number
 *         seedSize:
 *           type: integer
 *         seedRequirement:
 *           type: object
 *           properties:
 *             bagsNeeded:
 *               type: number
 *             totalCost:
 *               type: number
 *         estimatedTotalCost:
 *           type: number
 *           example: 180000
 *         costBreakdown:
 *           type: object
 *           properties:
 *             seeds:
 *               type: number
 *             labor:
 *               type: number
 *             fertilizer:
 *               type: number
 *             pesticides:
 *               type: number
 *             other:
 *               type: number
 *         recommendations:
 *           type: array
 *           items:
 *             type: string
 *     
 *     HarvestPredictionRequest:
 *       type: object
 *       required:
 *         - cropVarietyId
 *         - plantingDate
 *         - landSizeAcres
 *       properties:
 *         cropVarietyId:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440001"
 *         plantingDate:
 *           type: string
 *           format: date
 *           example: "2025-07-15"
 *         landSizeAcres:
 *           type: number
 *           example: 2.5
 *         location:
 *           type: object
 *           properties:
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *     
 *     HarvestPredictionResponse:
 *       type: object
 *       properties:
 *         cropVarietyId:
 *           type: string
 *           format: uuid
 *         cropVarietyName:
 *           type: string
 *         plantingDate:
 *           type: string
 *           format: date
 *         estimatedHarvestDate:
 *           type: string
 *           format: date
 *         harvestWindow:
 *           type: object
 *           properties:
 *             startDate:
 *               type: string
 *               format: date
 *             endDate:
 *               type: string
 *               format: date
 *         estimatedYield:
 *           type: object
 *           properties:
 *             totalKg:
 *               type: number
 *             yieldPerAcre:
 *               type: number
 *         climateConditions:
 *           type: object
 *           properties:
 *             averageTemperature:
 *               type: number
 *             expectedRainfall:
 *               type: number
 *             humidity:
 *               type: number
 *         recommendations:
 *           type: array
 *           items:
 *             type: string
 *     
 *     InputPrices:
 *       type: object
 *       properties:
 *         seeds:
 *           type: object
 *           additionalProperties:
 *             type: object
 *             properties:
 *               pricePerBag:
 *                 type: number
 *               pricePerPacket:
 *                 type: number
 *               currency:
 *                 type: string
 *               unit:
 *                 type: string
 *         fertilizers:
 *           type: object
 *           additionalProperties:
 *             type: object
 *             properties:
 *               pricePerBag:
 *                 type: number
 *               currency:
 *                 type: string
 *               unit:
 *                 type: string
 *         pesticides:
 *           type: object
 *           additionalProperties:
 *             type: object
 *             properties:
 *               pricePerLiter:
 *                 type: number
 *               currency:
 *                 type: string
 *               unit:
 *                 type: string
 *         labor:
 *           type: object
 *           additionalProperties:
 *             type: object
 *             properties:
 *               pricePerDay:
 *                 type: number
 *               pricePerHour:
 *                 type: number
 *               currency:
 *                 type: string
 *               unit:
 *                 type: string
 */

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /api/v1/calculator/cost-estimate:
 *   post:
 *     summary: Calculate detailed production costs
 *     description: Calculate comprehensive production costs for any crop variety with detailed breakdown and recommendations.
 *     tags: [Cost Calculator]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CostCalculationRequest'
 *     responses:
 *       200:
 *         description: Cost calculation completed successfully
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
 *                   $ref: '#/components/schemas/CostCalculationResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Crop variety not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/cost-estimate', calculatorController.calculateCost.bind(calculatorController));

/**
 * @swagger
 * /api/v1/calculator/harvest-prediction:
 *   post:
 *     summary: Predict harvest timing and yield
 *     description: Predict harvest date, yield estimates, and provide climate-based recommendations for any crop.
 *     tags: [Cost Calculator]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HarvestPredictionRequest'
 *     responses:
 *       200:
 *         description: Harvest prediction completed successfully
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
 *                   $ref: '#/components/schemas/HarvestPredictionResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Crop variety not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/harvest-prediction', calculatorController.predictHarvest.bind(calculatorController));

/**
 * @swagger
 * /api/v1/calculator/quick-estimate:
 *   get:
 *     summary: Get quick cost estimate by crop type
 *     description: Get a simplified cost estimate for rapid planning across all supported crops.
 *     tags: [Cost Calculator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cropType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [potato, maize, beans, tomato, onion, cabbage, carrot]
 *         description: Type of crop to estimate costs for
 *       - in: query
 *         name: landSizeAcres
 *         required: true
 *         schema:
 *           type: number
 *         description: Size of land in acres
 *     responses:
 *       200:
 *         description: Quick estimate calculated successfully
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
 *                     cropType:
 *                       type: string
 *                     landSizeAcres:
 *                       type: number
 *                     estimatedTotalCost:
 *                       type: number
 *                     costPerAcre:
 *                       type: number
 *                     costBreakdown:
 *                       type: object
 *                       properties:
 *                         seeds:
 *                           type: number
 *                         fertilizer:
 *                           type: number
 *                         labor:
 *                           type: number
 *                         pesticides:
 *                           type: number
 *                         other:
 *                           type: number
 *                     currency:
 *                       type: string
 *                       example: "KES"
 *                     note:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/quick-estimate', calculatorController.getQuickEstimate.bind(calculatorController));

/**
 * @swagger
 * /api/v1/calculator/crop-varieties:
 *   get:
 *     summary: Get crop varieties for calculator
 *     description: Retrieve crop varieties with suitability information for the calculator tools.
 *     tags: [Cost Calculator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: JSON string of location data for suitability assessment
 *     responses:
 *       200:
 *         description: Crop varieties retrieved successfully
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
 *                     varieties:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/CropVariety'
 *                           - type: object
 *                             properties:
 *                               suitability:
 *                                 type: string
 *                                 enum: [high, medium, low]
 *                     groupedByType:
 *                       type: object
 *                     total:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/crop-varieties', calculatorController.getCropVarieties.bind(calculatorController));

/**
 * @swagger
 * /api/v1/calculator/input-prices:
 *   get:
 *     summary: Get current input prices
 *     description: Retrieve current market prices for seeds, fertilizers, pesticides, and labor with location-based adjustments.
 *     tags: [Cost Calculator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: JSON string of location data for price adjustments
 *       - in: query
 *         name: cropType
 *         schema:
 *           type: string
 *           enum: [potato, maize, beans, tomato, onion, cabbage, carrot]
 *         description: Filter prices by specific crop type
 *     responses:
 *       200:
 *         description: Input prices retrieved successfully
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
 *                     prices:
 *                       $ref: '#/components/schemas/InputPrices'
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                     location:
 *                       type: string
 *                     currency:
 *                       type: string
 *                       example: "KES"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/input-prices', calculatorController.getInputPrices.bind(calculatorController));

export default router; 