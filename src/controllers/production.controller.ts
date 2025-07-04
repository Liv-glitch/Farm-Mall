import { Request, Response } from 'express';
import { ProductionService } from '../services/production.service';
import { CropVarietyModel } from '../models/CropVariety.model';
import { 
  CreateProductionCycleRequest, 
  CreateActivityRequest, 
  UpdateProductionCycleRequest, 
  UpdateActivityRequest 
} from '../types/production.types';
import { logError, logInfo } from '../utils/logger';

const productionService = new ProductionService();

export class ProductionController {
  // Get all crop varieties (universal for all crops)
  async getCropVarieties(req: Request, res: Response): Promise<void> {
    try {
      const { cropType, search } = req.query;
      
      const whereClause: any = {};
      if (cropType) {
        whereClause.cropType = cropType;
      }
      if (search) {
        whereClause.name = { [require('sequelize').Op.iLike]: `%${search}%` };
      }

      const varieties = await CropVarietyModel.findAll({
        where: whereClause,
        order: [['cropType', 'ASC'], ['name', 'ASC']]
      });

      // Group by crop type for better organization
      const groupedVarieties = varieties.reduce((acc: any, variety) => {
        const cropType = variety.cropType;
        if (!acc[cropType]) {
          acc[cropType] = [];
        }
        acc[cropType].push(variety.toJSON());
        return acc;
      }, {});

      logInfo('Crop varieties retrieved', { 
        total: varieties.length, 
        cropTypes: Object.keys(groupedVarieties).length,
        userId: req.user?.id 
      });

      res.json({
        success: true,
        data: {
          varieties: varieties.map(v => v.toJSON()),
          groupedByType: groupedVarieties,
          total: varieties.length
        }
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to get crop varieties', err, { userId: req.user?.id });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve crop varieties',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // Create production cycle
  async createProductionCycle(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const cycleData: CreateProductionCycleRequest = req.body;

      const cycle = await productionService.createProductionCycle(userId, cycleData);

      logInfo('Production cycle created via API', { userId, cycleId: cycle.id });

      res.status(201).json({
        success: true,
        message: 'Production cycle created successfully',
        data: cycle
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to create production cycle via API', err, { 
        userId: req.user?.id, 
        body: req.body 
      });
      
      const statusCode = err.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to create production cycle',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // Get user's production cycles
  async getProductionCycles(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { status, limit = 20, offset = 0 } = req.query;

      const result = await productionService.getUserProductionCycles(
        userId,
        status as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      logInfo('Production cycles retrieved via API', { 
        userId, 
        total: result.total,
        status: status || 'all'
      });

      res.json({
        success: true,
        data: result.cycles,
        pagination: {
          total: result.total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: result.total > parseInt(offset as string) + parseInt(limit as string)
        }
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to get production cycles via API', err, { userId: req.user?.id });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve production cycles',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // Get single production cycle
  async getProductionCycle(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { cycleId } = req.params;

      const cycle = await productionService.getProductionCycle(userId, cycleId);

      logInfo('Production cycle retrieved via API', { userId, cycleId });

      res.json({
        success: true,
        data: cycle
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to get production cycle via API', err, { 
        userId: req.user?.id, 
        cycleId: req.params.cycleId 
      });
      
      const statusCode = err.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to retrieve production cycle',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // Update production cycle
  async updateProductionCycle(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { cycleId } = req.params;
      const updateData: UpdateProductionCycleRequest = req.body;

      const cycle = await productionService.updateProductionCycle(userId, cycleId, updateData);

      logInfo('Production cycle updated via API', { userId, cycleId, updateData });

      res.json({
        success: true,
        message: 'Production cycle updated successfully',
        data: cycle
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to update production cycle via API', err, { 
        userId: req.user?.id, 
        cycleId: req.params.cycleId,
        body: req.body 
      });
      
      const statusCode = err.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to update production cycle',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // Delete production cycle
  async deleteProductionCycle(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { cycleId } = req.params;

      const result = await productionService.deleteProductionCycle(userId, cycleId);

      logInfo('Production cycle deleted via API', { userId, cycleId });

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to delete production cycle via API', err, { 
        userId: req.user?.id, 
        cycleId: req.params.cycleId 
      });
      
      const statusCode = err.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to delete production cycle',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // Get all user activities
  async getActivities(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { status, type, limit = 20, offset = 0 } = req.query;

      const result = await productionService.getUserActivities(
        userId,
        {
          status: status as string,
          type: type as string,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      );

      logInfo('Activities retrieved via API', { 
        userId, 
        total: result.total,
        status: status || 'all',
        type: type || 'all'
      });

      res.json({
        success: true,
        data: result.activities,
        pagination: {
          total: result.total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: result.total > parseInt(offset as string) + parseInt(limit as string)
        }
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to get activities via API', err, { userId: req.user?.id });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve activities',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // Get activities for specific production cycle
  async getCycleActivities(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { cycleId } = req.params;

      const activities = await productionService.getCycleActivities(userId, cycleId);

      logInfo('Cycle activities retrieved via API', { userId, cycleId, count: activities.length });

      res.json({
        success: true,
        data: activities
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to get cycle activities via API', err, { 
        userId: req.user?.id, 
        cycleId: req.params.cycleId 
      });
      
      const statusCode = err.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to retrieve cycle activities',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // Add activity to production cycle
  async addActivity(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { cycleId } = req.params;
      const activityData: CreateActivityRequest = req.body;

      const activity = await productionService.addActivity(userId, cycleId, activityData);

      logInfo('Activity added via API', { userId, cycleId, activityId: activity.id });

      res.status(201).json({
        success: true,
        message: 'Activity added successfully',
        data: activity
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to add activity via API', err, { 
        userId: req.user?.id, 
        cycleId: req.params.cycleId,
        body: req.body 
      });
      
      const statusCode = err.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to add activity',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // Update activity
  async updateActivity(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { activityId } = req.params;
      const updateData: UpdateActivityRequest = req.body;

      const activity = await productionService.updateActivity(userId, activityId, updateData);

      logInfo('Activity updated via API', { userId, activityId, updateData });

      res.json({
        success: true,
        message: 'Activity updated successfully',
        data: activity
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to update activity via API', err, { 
        userId: req.user?.id, 
        activityId: req.params.activityId,
        body: req.body 
      });
      
      const statusCode = err.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to update activity',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // Delete activity
  async deleteActivity(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { activityId } = req.params;

      const result = await productionService.deleteActivity(userId, activityId);

      logInfo('Activity deleted via API', { userId, activityId });

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to delete activity via API', err, { 
        userId: req.user?.id, 
        activityId: req.params.activityId 
      });
      
      const statusCode = err.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to delete activity',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // Get dashboard statistics
  async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const stats = await productionService.getDashboardStats(userId);

      logInfo('Dashboard stats retrieved via API', { userId, stats });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to get dashboard stats via API', err, { userId: req.user?.id });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard statistics',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
}

export const productionController = new ProductionController(); 