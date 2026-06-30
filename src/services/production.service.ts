import { ProductionCycleModel } from '../models/ProductionCycle.model';
import { CropVarietyModel } from '../models/CropVariety.model';
import { ActivityModel } from '../models/Activity.model';
import { UserModel } from '../models/User.model';
import { FarmModel } from '../models/Farm.model';
import { FarmCollaboratorModel } from '../models/FarmCollaborator.model';
import { CycleReportModel, CycleReportType } from '../models/CycleReport.model';
import { 
  ProductionCycle, 
  Activity, 
  CreateProductionCycleRequest,
  CreateActivityRequest,
  UpdateProductionCycleRequest,
  UpdateActivityRequest,
  CycleReportDetail,
  CycleReportSummary
} from '../types/production.types';
import { ERROR_CODES } from '../utils/constants';
import { logError, logInfo } from '../utils/logger';
import { Op } from 'sequelize';

export interface ProductionCycleWithStats extends ProductionCycle {
  totalCost: number;
  expectedRevenue: number | null;
  profitability: number | null;
  activitiesCount: number;
}

function calculateExpectedRevenue(cycleData: any): number | null {
  const expectedYield = Number(cycleData.expectedYield);
  const expectedPricePerKg = Number(cycleData.expectedPricePerKg);

  if (!Number.isFinite(expectedYield) || expectedYield <= 0 || !Number.isFinite(expectedPricePerKg) || expectedPricePerKg <= 0) {
    return null;
  }

  return expectedYield * expectedPricePerKg;
}

function parseJsonColumn<T = unknown>(value: unknown): T | unknown {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value) as T;
  } catch {
    return value;
  }
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(value as any);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function daysBetween(start: unknown, end: unknown): number | null {
  const startDate = start ? new Date(start as any) : null;
  const endDate = end ? new Date(end as any) : null;

  if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
}

function normalizeActivityType(type: unknown): unknown {
  if (type === 'fertilization') return 'fertilizing';
  if (type === 'disease_control') return 'pest_control';
  return type;
}

export class ProductionService {
  private normalizeActivityInputs(inputs: unknown): Array<Record<string, unknown>> {
    const parsed = parseJsonColumn(inputs);
    return Array.isArray(parsed) ? parsed.map((input) => ({ ...(input as Record<string, unknown>) })) : [];
  }

  private buildActivityRows(activities: any[], includeFinancials: boolean): Array<Record<string, unknown>> {
    const sortedActivities = [...activities].sort(
      (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );

    return sortedActivities.map((activity, index) => {
      const previousActivity = index > 0 ? sortedActivities[index - 1] : null;
      const activityInputs = this.normalizeActivityInputs(activity.inputs);
      const row: Record<string, unknown> = {
        id: activity.id,
        type: activity.type,
        description: activity.description || activity.type,
        status: activity.status,
        scheduledDate: toIsoDate(activity.scheduledDate),
        completedDate: toIsoDate(activity.completedDate),
        durationDays: daysBetween(activity.scheduledDate, activity.completedDate),
        daysSincePreviousActivity: previousActivity
          ? daysBetween(previousActivity.completedDate || previousActivity.scheduledDate, activity.completedDate || activity.scheduledDate)
          : null,
        laborHours: toFiniteNumber(activity.laborHours),
        laborType: activity.laborType || null,
        notes: activity.notes || null,
      };

      if (includeFinancials) {
        row.cost = toFiniteNumber(activity.cost) || 0;
        row.inputs = activityInputs.map((input) => ({
          name: input.name || '',
          quantity: toFiniteNumber(input.quantity) || 0,
          unit: input.unit || '',
          cost: toFiniteNumber(input.cost) || 0,
          brand: input.brand || null,
          supplier: input.supplier || null,
        }));
      } else {
        row.inputs = activityInputs.map((input) => ({
          name: input.name || '',
          quantity: toFiniteNumber(input.quantity) || 0,
          unit: input.unit || '',
        }));
      }

      return row;
    });
  }

  private buildReportSnapshot(cycleData: any, type: CycleReportType): Record<string, unknown> {
    const activities = Array.isArray(cycleData.activities) ? cycleData.activities : [];
    const includeFinancials = type === 'financial';
    const actualYield = toFiniteNumber(cycleData.actualYield);
    const actualPricePerKg = toFiniteNumber(cycleData.actualPricePerKg);
    const actualRevenue =
      actualYield !== null && actualYield > 0 && actualPricePerKg !== null && actualPricePerKg > 0
        ? actualYield * actualPricePerKg
        : null;
    const activityTotal = activities.reduce((sum: number, activity: any) => sum + (toFiniteNumber(activity.cost) || 0), 0);
    const inputTotal = activities.reduce((sum: number, activity: any) => {
      return (
        sum +
        this.normalizeActivityInputs(activity.inputs).reduce(
          (inputSum, input) => inputSum + (toFiniteNumber(input.cost) || 0),
          0
        )
      );
    }, 0);
    const totalCost = activityTotal + inputTotal;

    const baseSnapshot: Record<string, unknown> = {
      reportType: type,
      generatedAt: new Date().toISOString(),
      cycle: {
        id: cycleData.id,
        cropVariety: cycleData.cropVariety?.name || 'Production cycle',
        cropType: cycleData.cropVariety?.cropType || null,
        farmName: cycleData.farm?.name || null,
        farmLocation:
          cycleData.farmLocation ||
          [cycleData.farmLocationName, cycleData.farmSubcounty, cycleData.farmCounty].filter(Boolean).join(', ') ||
          cycleData.farm?.location ||
          null,
        county: cycleData.farmCounty || null,
        subcounty: cycleData.farmSubcounty || null,
        landSizeAcres: toFiniteNumber(cycleData.landSizeAcres),
        plantingDate: toIsoDate(cycleData.plantingDate),
        estimatedHarvestDate: toIsoDate(cycleData.estimatedHarvestDate),
        actualHarvestDate: toIsoDate(cycleData.actualHarvestDate),
        status: cycleData.status,
      },
      activities: this.buildActivityRows(activities, includeFinancials),
      activitySummary: {
        totalActivities: activities.length,
        completedActivities: activities.filter((activity: any) => activity.status === 'completed').length,
        cycleDurationDays: daysBetween(cycleData.plantingDate, cycleData.actualHarvestDate || cycleData.estimatedHarvestDate),
      },
    };

    if (includeFinancials) {
      baseSnapshot.financialSummary = {
        activityCostTotal: activityTotal,
        inputCostTotal: inputTotal,
        totalCost,
        actualYield,
        actualPricePerKg,
        actualRevenue,
        profit: actualRevenue === null ? null : actualRevenue - totalCost,
      };
    }

    return baseSnapshot;
  }

  private getReportLabels(reportData: any): Pick<CycleReportSummary, 'cropLabel' | 'farmLabel' | 'harvestDate'> {
    const snapshot = parseJsonColumn(reportData.snapshotData) as any;
    return {
      cropLabel:
        snapshot?.cycle?.cropVariety ||
        reportData.productionCycle?.cropVariety?.name ||
        'Production cycle',
      farmLabel:
        snapshot?.cycle?.farmLocation ||
        reportData.productionCycle?.farmLocation ||
        reportData.productionCycle?.farm?.location ||
        'Farm location',
      harvestDate: snapshot?.cycle?.actualHarvestDate || reportData.productionCycle?.actualHarvestDate || null,
    };
  }

  private toReportSummary(report: CycleReportModel): CycleReportSummary {
    const data = report.toJSON() as any;
    const labels = this.getReportLabels(data);

    return {
      id: data.id,
      productionCycleId: data.productionCycleId,
      type: data.type,
      snapshotVersion: data.snapshotVersion,
      generatedAt: data.generatedAt,
      ...labels,
    };
  }

  private async generateCycleReportsIfMissing(userId: string, cycleId: string): Promise<void> {
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
        },
        {
          model: FarmModel,
          as: 'farm',
        },
      ],
    });

    if (!cycle || cycle.status !== 'harvested') return;

    const cycleData = cycle.toJSON() as any;
    await Promise.all(
      (['activity', 'financial'] as CycleReportType[]).map(async (type) => {
        const existingReport = await CycleReportModel.findOne({
          where: { productionCycleId: cycleId, type },
        });

        if (existingReport) return;

        await CycleReportModel.create({
          userId,
          productionCycleId: cycleId,
          type,
          snapshotVersion: 1,
          snapshotData: this.buildReportSnapshot(cycleData, type),
          generatedAt: new Date(),
        });
      })
    );
  }

  private normalizeBoundaryCoordinates(value: unknown): Array<{ lat: number; lng: number }> | undefined {
    if (value === undefined || value === null || value === '') return undefined;

    const parsed = parseJsonColumn(value);
    if (!Array.isArray(parsed)) {
      throw new Error('Farm boundary coordinates must be an array of latitude/longitude points.');
    }

    const points = parsed.map((point: any) => ({
      lat: Number(point?.lat),
      lng: Number(point?.lng),
    }));

    const invalidPoint = points.find(
      (point) =>
        !Number.isFinite(point.lat) ||
        !Number.isFinite(point.lng) ||
        point.lat < -90 ||
        point.lat > 90 ||
        point.lng < -180 ||
        point.lng > 180
    );

    if (invalidPoint) {
      throw new Error('Each farm boundary point must include valid lat and lng values.');
    }

    if (points.length > 0 && points.length < 3) {
      throw new Error('Farm boundary must include at least 3 points.');
    }

    return points.length >= 3 ? points : undefined;
  }

  private normalizeCycleLocationData<T extends CreateProductionCycleRequest | UpdateProductionCycleRequest>(
    data: T
  ): T {
    const boundary = this.normalizeBoundaryCoordinates(data.farmBoundaryCoordinates);
    const normalized = { ...data } as T;

    if (boundary) {
      normalized.farmBoundaryCoordinates = boundary;
    } else if ('farmBoundaryCoordinates' in normalized) {
      delete (normalized as any).farmBoundaryCoordinates;
    }

    return normalized;
  }

  private async getAccessibleFarms(userId: string): Promise<FarmModel[]> {
    return FarmModel.findAll({
      where: {
        [Op.or]: [
          { ownerId: userId },
          {
            '$collaborators.collaborator_id$': userId,
            '$collaborators.status$': 'active'
          }
        ]
      },
      include: [{
        model: FarmCollaboratorModel,
        as: 'collaborators',
        required: false
      }]
    });
  }

  private composeFarmLocation(cycleData: CreateProductionCycleRequest): string {
    const explicitLocation = cycleData.farmLocation?.trim();
    if (explicitLocation) return explicitLocation;

    return [
      cycleData.farmLocationName?.trim(),
      cycleData.farmSubcounty?.trim(),
      cycleData.farmCounty?.trim(),
    ].filter(Boolean).join(', ') || 'Farm location';
  }

  private async createDefaultFarmForCycle(
    userId: string,
    cycleData: CreateProductionCycleRequest
  ): Promise<FarmModel> {
    const user = await UserModel.findByPk(userId);
    const userName = user?.fullName?.trim();

    const farm = await FarmModel.create({
      ownerId: userId,
      name: userName ? `${userName}'s Farm` : 'Default Farm',
      location: this.composeFarmLocation(cycleData),
      locationLat: cycleData.farmLocationLat,
      locationLng: cycleData.farmLocationLng,
      sizeAcres: cycleData.landSizeAcres,
    });

    logInfo('Default farm created for production cycle', {
      userId,
      farmId: farm.id,
      location: farm.location,
    });

    return farm;
  }

  private async resolveFarmForCycle(
    userId: string,
    cycleData: CreateProductionCycleRequest
  ): Promise<FarmModel> {
    if (cycleData.farmId) {
      const farm = await FarmModel.findOne({
        where: { id: cycleData.farmId },
        include: [{
          model: FarmCollaboratorModel,
          as: 'collaborators',
          where: {
            collaboratorId: userId,
            status: 'active'
          },
          required: false
        }]
      });

      if (farm && (farm.ownerId === userId || farm.collaborators?.length)) {
        return farm;
      }

      const accessibleFarms = await this.getAccessibleFarms(userId);
      if (accessibleFarms.length === 0) {
        return this.createDefaultFarmForCycle(userId, cycleData);
      }

      throw new Error('The selected farm could not be found or you do not have access to it. Please choose another farm.');
    }

    const accessibleFarms = await this.getAccessibleFarms(userId);
    if (accessibleFarms.length > 0) {
      return accessibleFarms[0];
    }

    return this.createDefaultFarmForCycle(userId, cycleData);
  }

  // Create new production cycle
  async createProductionCycle(
    userId: string,
    cycleData: CreateProductionCycleRequest
  ): Promise<ProductionCycle> {
    try {
      const normalizedCycleData = this.normalizeCycleLocationData(cycleData);
      // Verify crop variety exists
      const cropVariety = await CropVarietyModel.findByPk(normalizedCycleData.cropVarietyId);
      if (!cropVariety) {
        throw new Error(ERROR_CODES.CROP_VARIETY_NOT_FOUND);
      }

      const farm = await this.resolveFarmForCycle(userId, normalizedCycleData);

      // TODO: Check subscription limits based on user type
      
      const cycle = await ProductionCycleModel.create({
        ...normalizedCycleData,
        userId,
        farmId: farm.id,
        status: 'active',
        totalCost: 0,
      });

      logInfo('Production cycle created', { 
        userId, 
        cycleId: cycle.id,
        farmId: farm.id,
        cropVarietyId: normalizedCycleData.cropVarietyId
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
      // Get all farms where user is owner or collaborator
      const farms = await FarmModel.findAll({
        where: {
          [Op.or]: [
            { ownerId: userId },
            {
              '$collaborators.collaborator_id$': userId,
              '$collaborators.status$': 'active'
            }
          ]
        },
        include: [{
          model: FarmCollaboratorModel,
          as: 'collaborators',
          required: false
        }]
      });

      const farmIds = farms.map(farm => farm.id);

      const whereClause: any = { farmId: farmIds };
      if (status) {
        whereClause.status = status;
      }

      const { count, rows } = await ProductionCycleModel.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: CropVarietyModel,
            as: 'cropVariety',
            attributes: ['id', 'name', 'cropType', 'maturityPeriodDays']
          },
          {
            model: ActivityModel,
            as: 'activities',
            attributes: ['id', 'type', 'cost', 'scheduledDate', 'completedDate']
          },
          {
            model: FarmModel,
            as: 'farm',
            attributes: ['id', 'name', 'location']
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
        
        const expectedRevenue = calculateExpectedRevenue(cycleData);
        const profitability = expectedRevenue === null ? null : expectedRevenue - totalCost;

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
        where: { id: cycleId },
        include: [
          {
            model: CropVarietyModel,
            as: 'cropVariety',
          },
          {
            model: ActivityModel,
            as: 'activities',
            order: [['scheduledDate', 'ASC']]
          },
          {
            model: FarmModel,
            as: 'farm',
            include: [{
              model: FarmCollaboratorModel,
              as: 'collaborators',
              where: {
                collaboratorId: userId,
                status: 'active'
              },
              required: false
            }]
          }
        ]
      });

      if (!cycle) {
        throw new Error(ERROR_CODES.PRODUCTION_CYCLE_NOT_FOUND);
      }

      // Check if user has access to this cycle's farm
      const farm = cycle.get('farm') as any;
      if (farm.ownerId !== userId && !farm.collaborators?.length) {
        throw new Error(ERROR_CODES.UNAUTHORIZED);
      }

      const cycleData = cycle.toJSON() as any;
      const activities = cycleData.activities || [];
      
      const totalCost = activities.reduce((sum: number, activity: any) => 
        sum + (activity.cost || 0), cycleData.totalCostActual || 0
      );
      
      const expectedRevenue = calculateExpectedRevenue(cycleData);
      const profitability = expectedRevenue === null ? null : expectedRevenue - totalCost;

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
        where: { id: cycleId },
        include: [{
          model: FarmModel,
          as: 'farm',
          include: [{
            model: FarmCollaboratorModel,
            as: 'collaborators',
            where: {
              collaboratorId: userId,
              status: 'active'
            },
            required: false
          }]
        }]
      });

      if (!cycle) {
        throw new Error(ERROR_CODES.PRODUCTION_CYCLE_NOT_FOUND);
      }

      // Check if user has access to this cycle's farm
      const farm = cycle.get('farm') as any;
      if (farm.ownerId !== userId && !farm.collaborators?.length) {
        throw new Error(ERROR_CODES.UNAUTHORIZED);
      }

      const previousStatus = cycle.status;

      // Validate status transitions only if status is being updated
      if (updateData.status && updateData.status !== cycle.status) {
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

      const normalizedUpdateData = this.normalizeCycleLocationData(updateData);
      await cycle.update(normalizedUpdateData);

      if (previousStatus !== 'harvested' && cycle.status === 'harvested') {
        await this.generateCycleReportsIfMissing(cycle.userId, cycleId);
      }

      logInfo('Production cycle updated', { userId, cycleId, updateData: normalizedUpdateData });
      return cycle.toJSON();
    } catch (error) {
      logError('Failed to update production cycle', error as Error, { userId, cycleId });
      throw error;
    }
  }

  async getCycleReports(userId: string): Promise<CycleReportSummary[]> {
    try {
      const reports = await CycleReportModel.findAll({
        where: { userId },
        include: [
          {
            model: ProductionCycleModel,
            as: 'productionCycle',
            include: [
              {
                model: CropVarietyModel,
                as: 'cropVariety',
                attributes: ['id', 'name', 'cropType'],
              },
              {
                model: FarmModel,
                as: 'farm',
                attributes: ['id', 'name', 'location'],
              },
            ],
          },
        ],
        order: [['generatedAt', 'DESC']],
      });

      return reports.map((report) => this.toReportSummary(report));
    } catch (error) {
      logError('Failed to get cycle reports', error as Error, { userId });
      throw error;
    }
  }

  async getCycleReport(userId: string, reportId: string): Promise<CycleReportDetail> {
    try {
      const report = await CycleReportModel.findOne({
        where: { id: reportId, userId },
        include: [
          {
            model: ProductionCycleModel,
            as: 'productionCycle',
            include: [
              {
                model: CropVarietyModel,
                as: 'cropVariety',
                attributes: ['id', 'name', 'cropType'],
              },
              {
                model: FarmModel,
                as: 'farm',
                attributes: ['id', 'name', 'location'],
              },
            ],
          },
        ],
      });

      if (!report) {
        throw new Error('Report not found');
      }

      const summary = this.toReportSummary(report);
      const data = report.toJSON() as any;

      return {
        ...summary,
        snapshotData: parseJsonColumn<Record<string, unknown>>(data.snapshotData) as Record<string, unknown>,
      };
    } catch (error) {
      logError('Failed to get cycle report', error as Error, { userId, reportId });
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

  // Get all user activities
  async getUserActivities(
    userId: string,
    filters: {
      status?: string;
      type?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    activities: Activity[];
    total: number;
  }> {
    try {
      const { status, type, limit = 20, offset = 0 } = filters;
      const whereClause: any = { userId };

      if (status) {
        whereClause.status = status;
      }
      if (type) {
        whereClause.type = type;
      }

      const { count, rows } = await ActivityModel.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: ProductionCycleModel,
            as: 'productionCycle',
            attributes: ['id', 'farmLocation', 'status'],
            include: [
              {
                model: CropVarietyModel,
                as: 'cropVariety',
                attributes: ['id', 'name', 'cropType']
              }
            ]
          }
        ],
        limit,
        offset,
        order: [['scheduledDate', 'DESC']]
      });

      const activities = rows.map(activity => activity.toJSON());

      logInfo('User activities retrieved', { userId, count, filters });

      return {
        activities,
        total: count,
      };
    } catch (error) {
      logError('Failed to get user activities', error as Error, { userId, filters });
      throw error;
    }
  }

  // Get activities for specific production cycle
  async getCycleActivities(userId: string, cycleId: string): Promise<Activity[]> {
    try {
      // Verify cycle belongs to user
      const cycle = await ProductionCycleModel.findOne({
        where: { id: cycleId, userId }
      });

      if (!cycle) {
        throw new Error(ERROR_CODES.PRODUCTION_CYCLE_NOT_FOUND);
      }

      const activities = await ActivityModel.findAll({
        where: { productionCycleId: cycleId },
        order: [['scheduledDate', 'ASC']]
      });

      logInfo('Cycle activities retrieved', { userId, cycleId, count: activities.length });

      return activities.map(activity => activity.toJSON());
    } catch (error) {
      logError('Failed to get cycle activities', error as Error, { userId, cycleId });
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

      const normalizedActivityData = {
        ...activityData,
        type: normalizeActivityType(activityData.type) as string,
      };

      const activity = await ActivityModel.create({
        ...normalizedActivityData,
        productionCycleId: cycleId,
        userId,
        status: 'in_progress',
      });

      // Update cycle total cost if activity has cost
              // TODO: Update cycle total cost when models are properly set up

      logInfo('Activity added to production cycle', { 
        userId, 
        cycleId, 
        activityId: activity.id,
        type: normalizedActivityData.type 
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

      const normalizedUpdateData = {
        ...updateData,
        ...(updateData.type ? { type: normalizeActivityType(updateData.type) as string } : {}),
      };

      await activity.update(normalizedUpdateData);

      logInfo('Activity updated', { userId, activityId, updateData: normalizedUpdateData });
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
  async getDashboardStats(userId?: string, isAdmin = false): Promise<{
    activeCycles: number;
    totalCycles: number;
    totalExpectedRevenue: number;
    totalActualCost: number;
    upcomingActivities: number;
    totalUsers?: number;
    activeUsers?: number;
    totalActualRevenue?: number;
  }> {
    try {
      // User-specific stats
      let activeCycles = 0, totalCycles = 0, upcomingActivities = 0;
      if (userId) {
        // user-specific
        [activeCycles, totalCycles] = await Promise.all([
          ProductionCycleModel.count({ where: { userId, status: 'active' } }),
          ProductionCycleModel.count({ where: { userId } })
      ]);
        console.log('DEBUG: Raw activeCycles count:', activeCycles);
        console.log('DEBUG: Raw totalCycles count:', totalCycles);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
        upcomingActivities = await ActivityModel.count({
        where: {
          userId,
          scheduledDate: {
            [require('sequelize').Op.between]: [new Date(), nextWeek]
          },
          status: { [require('sequelize').Op.ne]: 'completed' }
        }
      });
        console.log('DEBUG: Raw upcomingActivities count:', upcomingActivities);
      } else if (isAdmin) {
        // global stats for admin
        [activeCycles, totalCycles] = await Promise.all([
          ProductionCycleModel.count({ where: { status: 'active' } }),
          ProductionCycleModel.count()
        ]);
        console.log('DEBUG: Raw global activeCycles count:', activeCycles);
        console.log('DEBUG: Raw global totalCycles count:', totalCycles);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        upcomingActivities = await ActivityModel.count({
          where: {
            scheduledDate: {
              [require('sequelize').Op.between]: [new Date(), nextWeek]
            },
            status: { [require('sequelize').Op.ne]: 'completed' }
          }
        });
        console.log('DEBUG: Raw global upcomingActivities count:', upcomingActivities);
      }

      // Admin/global stats
      let totalUsers, activeUsers, totalActualRevenue;
      if (isAdmin) {
        totalUsers = await UserModel.count();
        console.log('DEBUG: Raw totalUsers count:', totalUsers);
        // Users with at least one active production cycle
        const activeUserIds = await ProductionCycleModel.findAll({
          attributes: ['userId'],
          where: { status: 'active' },
          group: ['userId'],
          raw: true
        });
        console.log('DEBUG: Raw activeUserIds:', activeUserIds);
        activeUsers = activeUserIds.length;
        // Total actual revenue: sum of totalYieldKg * default price (30) for harvested cycles
        const harvestedCycles = await ProductionCycleModel.findAll({
          where: { status: 'harvested' },
          attributes: ['totalYieldKg'],
          raw: true
        });
        console.log('DEBUG: Raw harvestedCycles:', harvestedCycles);
        totalActualRevenue = harvestedCycles.reduce((sum, c) => {
          let yieldKg = 0;
          if (typeof c.totalYieldKg === 'string') {
            yieldKg = parseFloat(c.totalYieldKg);
          } else if (typeof c.totalYieldKg === 'number') {
            yieldKg = c.totalYieldKg;
          }
          const price = 30; // Default price per kg
          return sum + (yieldKg * price);
        }, 0);
        console.log('DEBUG: Calculated totalActualRevenue:', totalActualRevenue);
      }

      // TODO: Calculate revenue and costs when model fields are properly set up
      const totalExpectedRevenue = 0;
      const totalActualCost = 0;

      const stats = {
        activeCycles,
        totalCycles,
        totalExpectedRevenue,
        totalActualCost,
        upcomingActivities,
        ...(isAdmin ? { totalUsers, activeUsers, totalActualRevenue } : {})
      };
      console.log('DEBUG: dashboard stats object:', stats);

      logInfo('Dashboard statistics retrieved', { userId, stats });
      return stats;
    } catch (error) {
      logError('Failed to get dashboard stats', error as Error, { userId });
      throw error;
    }
  }
} 
