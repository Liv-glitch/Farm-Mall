import { Router } from 'express';
import { productionController } from '../controllers/production.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CropVariety:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           example: "Shangi"
 *         cropType:
 *           type: string
 *           enum: [potato, maize, beans, tomato, onion, cabbage, carrot]
 *           example: "potato"
 *         maturityPeriodDays:
 *           type: integer
 *           example: 75
 *         seedSize1BagsPerAcre:
 *           type: number
 *           example: 20
 *         seedSize2BagsPerAcre:
 *           type: number
 *           example: 16
 *         seedCostPerBag:
 *           type: number
 *           example: 4500
 *     
 *     ProductionCycle:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         cropVarietyId:
 *           type: string
 *           format: uuid
 *         landSizeAcres:
 *           type: number
 *           example: 2.5
 *         farmLocation:
 *           type: string
 *           example: "Meru County, Kenya"
 *         farmLocationLat:
 *           type: number
 *           example: -0.2367
 *         farmLocationLng:
 *           type: number
 *           example: 37.6531
 *         plantingDate:
 *           type: string
 *           format: date
 *         estimatedHarvestDate:
 *           type: string
 *           format: date
 *         actualHarvestDate:
 *           type: string
 *           format: date
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [planning, active, harvested, archived]
 *           example: "planning"
 *         totalCost:
 *           type: number
 *           example: 180000
 *         expectedYield:
 *           type: number
 *           example: 8000
 *         actualYield:
 *           type: number
 *           nullable: true
 *         expectedPricePerKg:
 *           type: number
 *           example: 45
 *         actualPricePerKg:
 *           type: number
 *           nullable: true
 *         cropVariety:
 *           $ref: '#/components/schemas/CropVariety'
 *     
 *     CreateProductionCycleRequest:
 *       type: object
 *       required:
 *         - cropVarietyId
 *         - landSizeAcres
 *         - farmLocation
 *         - plantingDate
 *       properties:
 *         cropVarietyId:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440001"
 *         landSizeAcres:
 *           type: number
 *           example: 2.5
 *         farmLocation:
 *           type: string
 *           example: "Meru County, Kenya"
 *         farmLocationLat:
 *           type: number
 *           example: -0.2367
 *         farmLocationLng:
 *           type: number
 *           example: 37.6531
 *         plantingDate:
 *           type: string
 *           format: date
 *           example: "2025-07-15"
 *         expectedYield:
 *           type: number
 *           example: 8000
 *         expectedPricePerKg:
 *           type: number
 *           example: 45
 *     
 *     Activity:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         productionCycleId:
 *           type: string
 *           format: uuid
 *         type:
 *           type: string
 *           enum: [soil_preparation, planting, fertilizing, weeding, pest_control, irrigation, harvesting]
 *           example: "planting"
 *         description:
 *           type: string
 *           example: "Potato seed planting - Shangi variety"
 *         scheduledDate:
 *           type: string
 *           format: date
 *         completedDate:
 *           type: string
 *           format: date
 *           nullable: true
 *         cost:
 *           type: number
 *           example: 15000
 *         laborHours:
 *           type: number
 *           example: 16
 *         laborType:
 *           type: string
 *           enum: [family, hired, cooperative]
 *           example: "hired"
 *         status:
 *           type: string
 *           enum: [planned, in_progress, completed, cancelled]
 *           example: "planned"
 *         inputs:
 *           type: string
 *           description: "JSON string of inputs used"
 *         notes:
 *           type: string
 *           nullable: true
 *         weather:
 *           type: string
 *           description: "JSON string of weather conditions"
 *           nullable: true
 *     
 *     CreateActivityRequest:
 *       type: object
 *       required:
 *         - type
 *         - description
 *         - scheduledDate
 *       properties:
 *         type:
 *           type: string
 *           enum: [soil_preparation, planting, fertilizing, weeding, pest_control, irrigation, harvesting]
 *         description:
 *           type: string
 *         scheduledDate:
 *           type: string
 *           format: date
 *         cost:
 *           type: number
 *         laborHours:
 *           type: number
 *         laborType:
 *           type: string
 *           enum: [family, hired, cooperative]
 *         inputs:
 *           type: string
 *         notes:
 *           type: string
 *     
 *     DashboardStats:
 *       type: object
 *       properties:
 *         activeCycles:
 *           type: integer
 *           example: 3
 *         totalCycles:
 *           type: integer
 *           example: 15
 *         totalExpectedRevenue:
 *           type: number
 *           example: 850000
 *         totalActualCost:
 *           type: number
 *           example: 420000
 *         upcomingActivities:
 *           type: integer
 *           example: 7
 */

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /api/v1/production/crop-varieties:
 *   get:
 *     summary: Get all crop varieties (universal for all crops)
 *     description: Retrieve all available crop varieties across all supported crop types. Can filter by crop type or search by name.
 *     tags: [Production Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cropType
 *         schema:
 *           type: string
 *           enum: [potato, maize, beans, tomato, onion, cabbage, carrot]
 *         description: Filter varieties by crop type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search varieties by name
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
 *                         $ref: '#/components/schemas/CropVariety'
 *                     groupedByType:
 *                       type: object
 *                       description: Varieties grouped by crop type
 *                     total:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/crop-varieties', productionController.getCropVarieties.bind(productionController));

/**
 * @swagger
 * /api/v1/production/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Retrieve farming dashboard statistics including active cycles, total revenue, costs, and upcoming activities.
 *     tags: [Production Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DashboardStats'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/dashboard/stats', productionController.getDashboardStats.bind(productionController));

/**
 * @swagger
 * /api/v1/production/cycles:
 *   get:
 *     summary: Get user's production cycles
 *     description: Retrieve all production cycles for the authenticated user with pagination and filtering options.
 *     tags: [Production Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planning, active, harvested, archived]
 *         description: Filter cycles by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of cycles to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of cycles to skip
 *     responses:
 *       200:
 *         description: Production cycles retrieved successfully
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
 *                     $ref: '#/components/schemas/ProductionCycle'
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
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   post:
 *     summary: Create new production cycle
 *     description: Create a new production cycle for any supported crop type.
 *     tags: [Production Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductionCycleRequest'
 *     responses:
 *       201:
 *         description: Production cycle created successfully
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
 *                   example: "Production cycle created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/ProductionCycle'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Crop variety not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/cycles', productionController.getProductionCycles.bind(productionController));
router.post('/cycles', productionController.createProductionCycle.bind(productionController));

/**
 * @swagger
 * /api/v1/production/cycles/{cycleId}:
 *   get:
 *     summary: Get single production cycle
 *     description: Retrieve detailed information about a specific production cycle including associated activities.
 *     tags: [Production Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cycleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Production cycle ID
 *     responses:
 *       200:
 *         description: Production cycle retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ProductionCycle'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Production cycle not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   put:
 *     summary: Update production cycle
 *     description: Update production cycle details with validation for status transitions.
 *     tags: [Production Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cycleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Production cycle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [planning, active, harvested, archived]
 *               actualHarvestDate:
 *                 type: string
 *                 format: date
 *               actualYield:
 *                 type: number
 *               actualPricePerKg:
 *                 type: number
 *     responses:
 *       200:
 *         description: Production cycle updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Production cycle not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   delete:
 *     summary: Delete production cycle
 *     description: Delete a production cycle and all associated activities.
 *     tags: [Production Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cycleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Production cycle ID
 *     responses:
 *       200:
 *         description: Production cycle deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Production cycle not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/cycles/:cycleId', productionController.getProductionCycle.bind(productionController));
router.put('/cycles/:cycleId', productionController.updateProductionCycle.bind(productionController));
router.delete('/cycles/:cycleId', productionController.deleteProductionCycle.bind(productionController));

/**
 * @swagger
 * /api/v1/production/activities:
 *   get:
 *     summary: Get user's activities
 *     description: Retrieve all farming activities for the authenticated user with optional filtering.
 *     tags: [Production Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planned, in_progress, completed, cancelled]
 *         description: Filter by activity status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [soil_preparation, planting, fertilizing, weeding, pest_control, irrigation, harvesting]
 *         description: Filter by activity type
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of activities to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of activities to skip
 *     responses:
 *       200:
 *         description: Activities retrieved successfully
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
 *                     activities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Activity'
 *                     total:
 *                       type: integer
 *                       example: 15
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/activities', authenticate, productionController.getActivities.bind(productionController));

/**
 * @swagger
 * /api/v1/production/cycles/{cycleId}/activities:
 *   get:
 *     summary: Get activities for production cycle
 *     description: Retrieve all activities for a specific production cycle.
 *     tags: [Production Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cycleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Production cycle ID
 *     responses:
 *       200:
 *         description: Cycle activities retrieved successfully
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
 *                     $ref: '#/components/schemas/Activity'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Production cycle not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   post:
 *     summary: Add activity to production cycle
 *     description: Add a new farming activity to a production cycle.
 *     tags: [Production Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cycleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Production cycle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateActivityRequest'
 *     responses:
 *       201:
 *         description: Activity added successfully
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
 *                   example: "Activity added successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Activity'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Production cycle not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/cycles/:cycleId/activities', authenticate, productionController.getCycleActivities.bind(productionController));
router.post('/cycles/:cycleId/activities', productionController.addActivity.bind(productionController));

/**
 * @swagger
 * /api/v1/production/activities/{activityId}:
 *   put:
 *     summary: Update activity
 *     description: Update details of a farming activity.
 *     tags: [Production Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Activity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completedDate:
 *                 type: string
 *                 format: date
 *               cost:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [planned, in_progress, completed, cancelled]
 *               notes:
 *                 type: string
 *               weather:
 *                 type: string
 *     responses:
 *       200:
 *         description: Activity updated successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Activity not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 *   delete:
 *     summary: Delete activity
 *     description: Delete a farming activity from a production cycle.
 *     tags: [Production Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Activity ID
 *     responses:
 *       200:
 *         description: Activity deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Activity not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/activities/:activityId', productionController.updateActivity.bind(productionController));
router.delete('/activities/:activityId', productionController.deleteActivity.bind(productionController));

export default router; 