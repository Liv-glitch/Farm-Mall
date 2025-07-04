import { Request, Response } from 'express';
import { CalculatorService } from '../services/calculator.service';
import { CropVarietyModel } from '../models/CropVariety.model';
import { CostCalculationRequest, HarvestPredictionRequest } from '../types/production.types';
import { logError, logInfo } from '../utils/logger';
import { costCalculationSchema, harvestPredictionSchema } from '../utils/validators';

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

  // Get current input prices (simplified)
  async getInputPrices(req: Request, res: Response): Promise<void> {
    try {
      const { location, cropType } = req.query;

      // This is a simplified implementation
      // In a real system, you'd fetch from a pricing API or database
      const inputPrices = {
        seeds: {
          potato: { pricePerBag: 4500, currency: 'KES', unit: '50kg bag' },
          maize: { pricePerBag: 3500, currency: 'KES', unit: '25kg bag' },
          beans: { pricePerBag: 8000, currency: 'KES', unit: '90kg bag' },
          tomato: { pricePerPacket: 1500, currency: 'KES', unit: '1000 seeds' },
          onion: { pricePerPacket: 8000, currency: 'KES', unit: '500g' },
          cabbage: { pricePerPacket: 2800, currency: 'KES', unit: '1000 seeds' },
          carrot: { pricePerPacket: 1200, currency: 'KES', unit: '250g' }
        },
        fertilizers: {
          DAP: { pricePerBag: 5000, currency: 'KES', unit: '50kg bag' },
          CAN: { pricePerBag: 4200, currency: 'KES', unit: '50kg bag' },
          NPK: { pricePerBag: 4800, currency: 'KES', unit: '50kg bag' },
          Urea: { pricePerBag: 4500, currency: 'KES', unit: '50kg bag' }
        },
        pesticides: {
          fungicide: { pricePerLiter: 1800, currency: 'KES', unit: 'liter' },
          insecticide: { pricePerLiter: 2200, currency: 'KES', unit: 'liter' },
          herbicide: { pricePerLiter: 1500, currency: 'KES', unit: 'liter' }
        },
        labor: {
          skilled: { pricePerDay: 800, currency: 'KES', unit: 'person/day' },
          unskilled: { pricePerDay: 500, currency: 'KES', unit: 'person/day' },
          tractor: { pricePerHour: 1500, currency: 'KES', unit: 'hour' }
        }
      };

      // Apply location-based adjustments if provided
      let adjustedPrices = inputPrices;
      if (location) {
        const locationData = JSON.parse(location as string);
        const multiplier = this.getLocationPriceMultiplier(locationData);
        
        // Apply multiplier to all prices (simplified)
        adjustedPrices = this.adjustPricesForLocation(inputPrices, multiplier);
      }

      // Filter by crop type if specified
      let filteredPrices: any = adjustedPrices;
      if (cropType && adjustedPrices.seeds[cropType as keyof typeof adjustedPrices.seeds]) {
        const cropSeed = adjustedPrices.seeds[cropType as keyof typeof adjustedPrices.seeds];
        filteredPrices = {
          ...adjustedPrices,
          seeds: { [cropType as string]: cropSeed }
        };
      }

      logInfo('Input prices retrieved via API', { 
        userId: req.user?.id,
        location: location || 'general',
        cropType: cropType || 'all'
      });

      res.json({
        success: true,
        data: {
          prices: filteredPrices,
          lastUpdated: new Date().toISOString(),
          location: location || 'Kenya (General)',
          currency: 'KES'
        }
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

  // Helper methods
  private getLocationPriceMultiplier(location: { county?: string; subCounty?: string }): number {
    const highCostCounties = ['Nairobi', 'Mombasa', 'Kisumu'];
    const mediumCostCounties = ['Nakuru', 'Kiambu', 'Machakos'];

    if (location.county && highCostCounties.includes(location.county)) {
      return 1.2; // 20% higher costs
    } else if (location.county && mediumCostCounties.includes(location.county)) {
      return 1.1; // 10% higher costs
    }

    return 1.0; // Standard costs
  }

  private adjustPricesForLocation(prices: any, multiplier: number): any {
    // Deep clone and adjust prices
    const adjusted = JSON.parse(JSON.stringify(prices));
    
    // Apply multiplier to all numeric price values
    Object.keys(adjusted).forEach(category => {
      if (typeof adjusted[category] === 'object') {
        Object.keys(adjusted[category]).forEach(item => {
          if (adjusted[category][item].pricePerBag) {
            adjusted[category][item].pricePerBag = Math.round(adjusted[category][item].pricePerBag * multiplier);
          }
          if (adjusted[category][item].pricePerPacket) {
            adjusted[category][item].pricePerPacket = Math.round(adjusted[category][item].pricePerPacket * multiplier);
          }
          if (adjusted[category][item].pricePerLiter) {
            adjusted[category][item].pricePerLiter = Math.round(adjusted[category][item].pricePerLiter * multiplier);
          }
          if (adjusted[category][item].pricePerDay) {
            adjusted[category][item].pricePerDay = Math.round(adjusted[category][item].pricePerDay * multiplier);
          }
          if (adjusted[category][item].pricePerHour) {
            adjusted[category][item].pricePerHour = Math.round(adjusted[category][item].pricePerHour * multiplier);
          }
        });
      }
    });

    return adjusted;
  }
}

export const calculatorController = new CalculatorController(); 