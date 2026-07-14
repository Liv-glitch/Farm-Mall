import { Request, Response } from 'express';
import { CalculatorService } from '../services/calculator.service';
import { CropVarietyModel } from '../models/CropVariety.model';
import { CostCalculationRequest, HarvestPredictionRequest } from '../types/production.types';
import { logError, logInfo } from '../utils/logger';
import { costCalculationSchema, harvestPredictionSchema } from '../utils/validators';
import { inputsMarketplaceService } from '../services/inputsMarketplace.service';

const calculatorService = new CalculatorService();

export class CalculatorController {
  // Calculate production costs
  async calculateCost(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      // Validate request body with Joi schema
      const { error, value } = costCalculationSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details.map(detail => detail.message)
        });
        return;
      }

      const calculationData: CostCalculationRequest = value;
      const result = await calculatorService.calculateCost(calculationData);

      logInfo('Cost calculation completed via API', { 
        userId, 
        cropVarietyId: calculationData.cropVarietyId,
        landSize: calculationData.landSizeAcres,
        totalCost: result.estimatedTotalCost
      });

      res.json({
        success: true,
        message: 'Cost calculation completed successfully',
        data: result
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to calculate cost via API', err, { 
        userId: req.user?.id, 
        body: req.body 
      });
      
      const statusCode = err.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to calculate production costs',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // Predict harvest
  async predictHarvest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      // Validate request body with Joi schema
      const { error, value } = harvestPredictionSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          details: error.details.map(detail => detail.message)
        });
        return;
      }

      const predictionData: HarvestPredictionRequest = value;
      const result = await calculatorService.predictHarvest(predictionData);

      logInfo('Harvest prediction completed via API', { 
        userId, 
        cropVarietyId: predictionData.cropVarietyId,
        plantingDate: predictionData.plantingDate,
        estimatedYield: result.estimatedYield.totalKg
      });

      res.json({
        success: true,
        message: 'Harvest prediction completed successfully',
        data: result
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to predict harvest via API', err, { 
        userId: req.user?.id, 
        body: req.body 
      });
      
      const statusCode = err.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to predict harvest',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // Get all crop varieties for selection
  async getCropVarieties(req: Request, res: Response): Promise<void> {
    try {
      const { location } = req.query;
      
      let varieties;
      if (location) {
        // Parse location if provided
        const locationData = JSON.parse(location as string);
        varieties = await calculatorService.getSuitableVarieties(locationData);
      } else {
        // Get all varieties
        varieties = await CropVarietyModel.findAll({
          order: [['cropType', 'ASC'], ['name', 'ASC']]
        });
      }

      // Group by crop type
      const groupedVarieties = varieties.reduce((acc: any, variety: any) => {
        const cropType = variety.cropType;
        if (!acc[cropType]) {
          acc[cropType] = [];
        }
        acc[cropType].push(variety);
        return acc;
      }, {});

      logInfo('Crop varieties for calculator retrieved via API', { 
        userId: req.user?.id,
        total: varieties.length,
        cropTypes: Object.keys(groupedVarieties).length
      });

      res.json({
        success: true,
        data: {
          varieties: varieties,
          groupedByType: groupedVarieties,
          total: varieties.length
        }
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to get crop varieties for calculator via API', err, { 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve crop varieties',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // Get current input prices from the inputs marketplace
  async getInputPrices(req: Request, res: Response): Promise<void> {
    try {
      const cropVarietyId = typeof req.query.cropVarietyId === 'string' ? req.query.cropVarietyId : undefined;
      const cropType = typeof req.query.cropType === 'string' ? req.query.cropType : undefined;
      const county = typeof req.query.county === 'string' ? req.query.county : undefined;
      const landSizeAcres = req.query.landSizeAcres ? Number(req.query.landSizeAcres) : undefined;
      const seedSize = Number(req.query.seedSize) === 2 ? 2 : 1;
      const cropVariety = cropVarietyId ? await CropVarietyModel.findByPk(cropVarietyId) : null;

      const result = await inputsMarketplaceService.getCalculatorListings({
        cropVarietyName: cropVariety?.name,
        cropType: cropType || cropVariety?.cropType,
        county,
        landSizeAcres: Number.isNaN(landSizeAcres) ? undefined : landSizeAcres,
        seedSize,
      });

      logInfo('Input prices retrieved via API', { 
        userId: req.user?.id,
        source: result.source,
        cropVarietyId,
        cropType: cropType || cropVariety?.cropType || 'all',
        county: county || 'all'
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to get input prices via API', err, { 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve input prices',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

  // Get quick cost estimate (simplified calculation)
  async getQuickEstimate(req: Request, res: Response): Promise<void> {
    try {
      const { cropType, landSizeAcres } = req.query;

      if (!cropType || !landSizeAcres) {
        res.status(400).json({
          success: false,
          message: 'Crop type and land size are required'
        });
        return;
      }

      // Simplified cost estimates per acre by crop type
      const costPerAcre: Record<string, number> = {
        potato: 75000,
        maize: 25000,
        beans: 30000,
        tomato: 120000,
        onion: 45000,
        cabbage: 35000,
        carrot: 40000
      };

      const acres = parseFloat(landSizeAcres as string);
      const baseCost = costPerAcre[cropType as string] || 50000;
      const totalEstimate = baseCost * acres;

      const breakdown = {
        seeds: Math.round(totalEstimate * 0.35),
        fertilizer: Math.round(totalEstimate * 0.25),
        labor: Math.round(totalEstimate * 0.25),
        pesticides: Math.round(totalEstimate * 0.10),
        other: Math.round(totalEstimate * 0.05)
      };

      logInfo('Quick estimate calculated via API', { 
        userId: req.user?.id,
        cropType,
        landSizeAcres: acres,
        totalEstimate
      });

      res.json({
        success: true,
        data: {
          cropType,
          landSizeAcres: acres,
          estimatedTotalCost: totalEstimate,
          costPerAcre: baseCost,
          costBreakdown: breakdown,
          currency: 'KES',
          note: 'This is a quick estimate. Use detailed calculation for accurate planning.'
        }
      });
    } catch (error) {
      const err = error as Error;
      logError('Failed to get quick estimate via API', err, { 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to calculate quick estimate',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }

}

export const calculatorController = new CalculatorController(); 
