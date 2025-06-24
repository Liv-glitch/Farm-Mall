import { ProductionCycleModel } from '../models/ProductionCycle.model';
import { CropVarietyModel } from '../models/CropVariety.model';
import { ActivityModel } from '../models/Activity.model';
import { 
  ProductionCycle, 
  Activity, 
  CreateProductionCycleRequest,
  CreateActivityRequest,
  UpdateProductionCycleRequest,
  UpdateActivityRequest 
} from '../types/production.types';
import { ERROR_CODES } from '../utils/constants';
import { logError, logInfo } from '../utils/logger';

export interface ProductionCycleWithStats extends ProductionCycle {
  totalCost: number;
  expectedRevenue: number;
  profitability: number;
  activitiesCount: number;
}

export class ProductionService {
  // Create new production cycle
  async createProductionCycle(
    userId: string,
    cycleData: CreateProductionCycleRequest
  ): Promise<ProductionCycle> {
    try {
      // Verify crop variety exists
      const cropVariety = await CropVarietyModel.findByPk(cycleData.cropVarietyId);
      if (!cropVariety) {
        throw new Error(ERROR_CODES.CROP_VARIETY_NOT_FOUND);
      }

      // TODO: Check subscription limits based on user type
      
      const cycle = await ProductionCycleModel.create({
        ...cycleData,
        userId,
        status: 'planning',
        totalCost: 0,
      });

      logInfo('Production cycle created', { 
        userId, 
        cycleId: cycle.id, 
        cropVarietyId: cycleData.cropVarietyId 
      });

      return cycle.toJSON();
    } catch (error) {
      logError('Failed to create production cycle', error as Error, { userId, cycleData });
      throw error;
    }
  }

  // Get user's production cycles
  async getUserProductionCycles(
    userId: string,
    status?: string,
    limit = 20,
    offset = 0
  ): Promise<{
    cycles: ProductionCycleWithStats[];
    total: number;
  }> {
    try {
      const whereClause: any = { userId };
      if (status) {
        whereClause.status = status;
      }

      const { count, rows } = await ProductionCycleModel.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: CropVarietyModel,
            as: 'cropVariety',
            attributes: ['id', 'name', 'variety', 'maturityDays']
          },
          {
            model: ActivityModel,
            as: 'activities',
            attributes: ['id', 'type', 'cost', 'scheduledDate', 'completedDate']
          }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      // Calculate statistics for each cycle
      const cyclesWithStats: ProductionCycleWithStats[] = rows.map(cycle => {
        const cycleData = cycle.toJSON() as any;
        const activities = cycleData.activities || [];
        
        const totalCost = activities.reduce((sum: number, activity: any) => 
          sum + (activity.cost || 0), cycleData.totalCostActual || 0
        );
        
        const expectedRevenue = cycleData.expectedYield * (cycleData.expectedPricePerKg || 0);
        const profitability = expectedRevenue - totalCost;

        return {
          ...cycleData,
          totalCost,
          expectedRevenue,
          profitability,
          activitiesCount: activities.length,
        };
      });

      logInfo('Production cycles retrieved', { userId, count, status });

      return {
        cycles: cyclesWithStats,
        total: count,
      };
    } catch (error) {
      logError('Failed to get production cycles', error as Error, { userId });
      throw error;
    }
  }

  // Get single production cycle
  async getProductionCycle(userId: string, cycleId: string): Promise<ProductionCycleWithStats> {
    try {
      const cycle = await ProductionCycleModel.findOne({
        where: { id: cycleId, userId },
        include: [
          {
            model: CropVarietyModel,
            as: 'cropVariety',
          },
          {
            model: ActivityModel,
            as: 'activities',
            order: [['scheduledDate', 'ASC']]
          }
        ]
      });

      if (!cycle) {
        throw new Error(ERROR_CODES.PRODUCTION_CYCLE_NOT_FOUND);
      }

      const cycleData = cycle.toJSON() as any;
      const activities = cycleData.activities || [];
      
      const totalCost = activities.reduce((sum: number, activity: any) => 
        sum + (activity.cost || 0), cycleData.totalCostActual || 0
      );
      
      const expectedRevenue = cycleData.expectedYield * (cycleData.expectedPricePerKg || 0);
      const profitability = expectedRevenue - totalCost;

      const result: ProductionCycleWithStats = {
        ...cycleData,
        totalCost,
        expectedRevenue,
        profitability,
        activitiesCount: activities.length,
      };

      logInfo('Production cycle retrieved', { userId, cycleId });
      return result;
    } catch (error) {
      logError('Failed to get production cycle', error as Error, { userId, cycleId });
      throw error;
    }
  }

  // Update production cycle
  async updateProductionCycle(
    userId: string,
    cycleId: string,
    updateData: UpdateProductionCycleRequest
  ): Promise<ProductionCycle> {
    try {
      const cycle = await ProductionCycleModel.findOne({
        where: { id: cycleId, userId }
      });

      if (!cycle) {
        throw new Error(ERROR_CODES.PRODUCTION_CYCLE_NOT_FOUND);
      }

      // Validate status transitions
      if (updateData.status) {
        const validTransitions: Record<string, string[]> = {
          'planning': ['active', 'archived'],
          'active': ['harvested', 'archived'],
          'harvested': ['archived'],
          'archived': []
        };

        const currentStatus = cycle.status;
        if (!validTransitions[currentStatus]?.includes(updateData.status)) {
          throw new Error(ERROR_CODES.INVALID_CROP_STAGE);
        }
      }

      await cycle.update(updateData);

      logInfo('Production cycle updated', { userId, cycleId, updateData });
      return cycle.toJSON();
    } catch (error) {
      logError('Failed to update production cycle', error as Error, { userId, cycleId });
      throw error;
    }
  }

  // Delete production cycle
  async deleteProductionCycle(userId: string, cycleId: string): Promise<{ message: string }> {
    try {
      const cycle = await ProductionCycleModel.findOne({
        where: { id: cycleId, userId }
      });

      if (!cycle) {
        throw new Error(ERROR_CODES.PRODUCTION_CYCLE_NOT_FOUND);
      }

      // Delete associated activities first
      await ActivityModel.destroy({
        where: { productionCycleId: cycleId }
      });

      // Delete the cycle
      await cycle.destroy();

      logInfo('Production cycle deleted', { userId, cycleId });
      return { message: 'Production cycle deleted successfully' };
    } catch (error) {
      logError('Failed to delete production cycle', error as Error, { userId, cycleId });
      throw error;
    }
  }

  // Add activity to production cycle
  async addActivity(
    userId: string,
    cycleId: string,
    activityData: CreateActivityRequest
  ): Promise<Activity> {
    try {
      // Verify production cycle exists and belongs to user
      const cycle = await ProductionCycleModel.findOne({
        where: { id: cycleId, userId }
      });

      if (!cycle) {
        throw new Error(ERROR_CODES.PRODUCTION_CYCLE_NOT_FOUND);
      }

      const activity = await ActivityModel.create({
        ...activityData,
        productionCycleId: cycleId,
        userId,
        status: 'planned',
      });

      // Update cycle total cost if activity has cost
              // TODO: Update cycle total cost when models are properly set up

      logInfo('Activity added to production cycle', { 
        userId, 
        cycleId, 
        activityId: activity.id,
        type: activityData.type 
      });

      return activity.toJSON();
    } catch (error) {
      logError('Failed to add activity', error as Error, { userId, cycleId, activityData });
      throw error;
    }
  }

  // Update activity
  async updateActivity(
    userId: string,
    activityId: string,
    updateData: UpdateActivityRequest
  ): Promise<Activity> {
    try {
      const activity = await ActivityModel.findOne({
        where: { id: activityId, userId }
      });

      if (!activity) {
        throw new Error(ERROR_CODES.ACTIVITY_NOT_FOUND);
      }

      // TODO: Update cycle cost when models are properly set up

      await activity.update(updateData);

      logInfo('Activity updated', { userId, activityId, updateData });
      return activity.toJSON();
    } catch (error) {
      logError('Failed to update activity', error as Error, { userId, activityId });
      throw error;
    }
  }

  // Delete activity
  async deleteActivity(userId: string, activityId: string): Promise<{ message: string }> {
    try {
      const activity = await ActivityModel.findOne({
        where: { id: activityId, userId }
      });

      if (!activity) {
        throw new Error(ERROR_CODES.ACTIVITY_NOT_FOUND);
      }

      // TODO: Update cycle cost when models are properly set up

      await activity.destroy();

      logInfo('Activity deleted', { userId, activityId });
      return { message: 'Activity deleted successfully' };
    } catch (error) {
      logError('Failed to delete activity', error as Error, { userId, activityId });
      throw error;
    }
  }

  // Get dashboard statistics
  async getDashboardStats(userId: string): Promise<{
    activeCycles: number;
    totalCycles: number;
    totalExpectedRevenue: number;
    totalActualCost: number;
    upcomingActivities: number;
  }> {
    try {
      const [activeCycles, totalCycles] = await Promise.all([
        ProductionCycleModel.count({
          where: { userId, status: 'active' }
        }),
        ProductionCycleModel.count({
          where: { userId }
        })
      ]);

      // TODO: Calculate revenue and costs when model fields are properly set up
      const totalExpectedRevenue = 0;
      const totalActualCost = 0;

      // Count upcoming activities (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const upcomingActivities = await ActivityModel.count({
        where: {
          userId,
          scheduledDate: {
            [require('sequelize').Op.between]: [new Date(), nextWeek]
          },
          status: { [require('sequelize').Op.ne]: 'completed' }
        }
      });

      const stats = {
        activeCycles,
        totalCycles,
        totalExpectedRevenue,
        totalActualCost,
        upcomingActivities,
      };

      logInfo('Dashboard statistics retrieved', { userId, stats });
      return {
        activeCycles: stats.activeCycles,
        totalCycles: stats.totalCycles,
        totalExpectedRevenue: stats.totalExpectedRevenue,
        totalActualCost: stats.totalActualCost,
        upcomingActivities: upcomingActivities
      };
    } catch (error) {
      logError('Failed to get dashboard stats', error as Error, { userId });
      throw error;
    }
  }
} 