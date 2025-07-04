import {
  CostCalculationRequest,
  CostCalculationResponse,
  HarvestPredictionRequest,
  HarvestPredictionResponse,
} from '../types/production.types';
import CropVarietyModel from '../models/CropVariety.model';
import { POTATO_VARIETIES, COST_ESTIMATES } from '../utils/constants';
import { logInfo, logError } from '../utils/logger';

export class CalculatorService {
  // Calculate production costs
  async calculateCost(request: CostCalculationRequest): Promise<CostCalculationResponse> {
    try {
      // Find crop variety by ID
      const cropVariety = await CropVarietyModel.findByPk(request.cropVarietyId);

      if (!cropVariety) {
        throw new Error('Crop variety not found');
      }

      // Calculate seed requirements
      const seedRequirement = cropVariety.getSeedRequirement(
        request.landSizeAcres,
        request.seedSize
      );

      // Calculate other costs based on land size
      const laborCosts = this.calculateLaborCosts(request.landSizeAcres);
      const fertilizerCosts = this.calculateFertilizerCosts(request.landSizeAcres);
      const pesticideCosts = this.calculatePesticideCosts(request.landSizeAcres);
      const otherCosts = this.calculateOtherCosts(request.landSizeAcres);

      // Apply location-based adjustments if provided
      const locationMultiplier = this.getLocationCostMultiplier(request.location);

      // Calculate total costs
      const costBreakdown = {
        seeds: seedRequirement.totalCost,
        labor: Math.round(laborCosts * locationMultiplier),
        fertilizer: Math.round(fertilizerCosts * locationMultiplier),
        pesticides: Math.round(pesticideCosts * locationMultiplier),
        other: Math.round(otherCosts * locationMultiplier),
      };

      const estimatedTotalCost = Object.values(costBreakdown).reduce(
        (sum, cost) => sum + cost,
        0
      );

      // Generate recommendations
      const recommendations = this.generateCostRecommendations(
        request,
        costBreakdown,
        cropVariety
      );

      const response: CostCalculationResponse = {
        cropVarietyId: request.cropVarietyId,
        cropVarietyName: cropVariety.name,
        landSizeAcres: request.landSizeAcres,
        seedSize: request.seedSize,
        seedRequirement,
        estimatedTotalCost,
        costBreakdown,
        recommendations,
      };

      logInfo('Cost calculation completed', {
        cropVarietyId: request.cropVarietyId,
        cropVarietyName: cropVariety.name,
        landSize: request.landSizeAcres,
        totalCost: estimatedTotalCost,
      });

      return response;
    } catch (error) {
      logError('Cost calculation failed', error as Error, request);
      throw error;
    }
  }

  // Predict harvest
  async predictHarvest(request: HarvestPredictionRequest): Promise<HarvestPredictionResponse> {
    try {
      // Find crop variety by ID
      const cropVariety = await CropVarietyModel.findByPk(request.cropVarietyId);

      if (!cropVariety) {
        throw new Error('Crop variety not found');
      }

      // Ensure plantingDate is a proper Date object (Joi should have converted it)
      let plantingDate: Date;
      if (request.plantingDate instanceof Date) {
        plantingDate = request.plantingDate;
      } else {
        // Fallback conversion if somehow still a string
        plantingDate = new Date(request.plantingDate);
      }
      
      // Validate the date
      if (isNaN(plantingDate.getTime())) {
        throw new Error('Invalid planting date format. Use YYYY-MM-DD format.');
      }

      // Calculate harvest dates
      const estimatedHarvestDate = cropVariety.getHarvestDate(plantingDate);
      
      // Calculate harvest window (±7 days)
      const harvestWindow = {
        startDate: new Date(estimatedHarvestDate.getTime() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(estimatedHarvestDate.getTime() + 7 * 24 * 60 * 60 * 1000),
      };

      // Estimate yield based on variety and land size
      const estimatedYield = this.calculateEstimatedYield(
        cropVariety,
        request.landSizeAcres,
        request.location
      );

      // Get climate conditions (simplified for now)
      const climateConditions = await this.getClimateConditions(
        request.location,
        plantingDate,
        estimatedHarvestDate
      );

      // Generate recommendations
      const recommendations = this.generateHarvestRecommendations(
        cropVariety,
        climateConditions,
        plantingDate
      );

      const response: HarvestPredictionResponse = {
        cropVarietyId: request.cropVarietyId,
        cropVarietyName: cropVariety.name,
        plantingDate: plantingDate,
        estimatedHarvestDate,
        harvestWindow,
        estimatedYield,
        climateConditions,
        recommendations,
      };

      logInfo('Harvest prediction completed', {
        cropVarietyId: request.cropVarietyId,
        cropVarietyName: cropVariety.name,
        plantingDate: plantingDate,
        estimatedHarvestDate,
        estimatedYield: estimatedYield.totalKg,
      });

      return response;
    } catch (error) {
      logError('Harvest prediction failed', error as Error, request);
      throw error;
    }
  }

  // Calculate labor costs per acre
  private calculateLaborCosts(landSizeAcres: number): number {
    const costPerAcre = 
      COST_ESTIMATES.LABOR_COSTS.LAND_PREPARATION +
      COST_ESTIMATES.LABOR_COSTS.PLANTING +
      COST_ESTIMATES.LABOR_COSTS.WEEDING +
      COST_ESTIMATES.LABOR_COSTS.HARVESTING;

    return costPerAcre * landSizeAcres;
  }

  // Calculate fertilizer costs per acre
  private calculateFertilizerCosts(landSizeAcres: number): number {
    // Typical fertilizer requirement per acre for potatoes
    const dapBags = 2; // 2 bags of DAP per acre
    const canBags = 1; // 1 bag of CAN per acre
    const npkBags = 1; // 1 bag of NPK per acre

    const costPerAcre = 
      (dapBags * COST_ESTIMATES.FERTILIZER_COSTS.DAP) +
      (canBags * COST_ESTIMATES.FERTILIZER_COSTS.CAN) +
      (npkBags * COST_ESTIMATES.FERTILIZER_COSTS.NPK);

    return costPerAcre * landSizeAcres;
  }

  // Calculate pesticide costs per acre
  private calculatePesticideCosts(landSizeAcres: number): number {
    // Typical pesticide requirement per acre
    const fungicideLiters = 2; // 2 liters per acre
    const insecticideLiters = 1; // 1 liter per acre
    const herbicideLiters = 1; // 1 liter per acre

    const costPerAcre = 
      (fungicideLiters * COST_ESTIMATES.PESTICIDE_COSTS.FUNGICIDE) +
      (insecticideLiters * COST_ESTIMATES.PESTICIDE_COSTS.INSECTICIDE) +
      (herbicideLiters * COST_ESTIMATES.PESTICIDE_COSTS.HERBICIDE);

    return costPerAcre * landSizeAcres;
  }

  // Calculate other costs per acre
  private calculateOtherCosts(landSizeAcres: number): number {
    const costPerAcre = 
      COST_ESTIMATES.OTHER_COSTS.TRANSPORT +
      COST_ESTIMATES.OTHER_COSTS.STORAGE +
      COST_ESTIMATES.OTHER_COSTS.IRRIGATION;

    return costPerAcre * landSizeAcres;
  }

  // Get location-based cost multiplier
  private getLocationCostMultiplier(location?: { county: string; subCounty: string }): number {
    if (!location) return 1.0;

    // Higher costs in certain counties due to logistics, labor availability, etc.
    const highCostCounties = ['Nairobi', 'Mombasa', 'Kisumu'];
    const mediumCostCounties = ['Nakuru', 'Kiambu', 'Machakos'];

    if (highCostCounties.includes(location.county)) {
      return 1.2; // 20% higher costs
    } else if (mediumCostCounties.includes(location.county)) {
      return 1.1; // 10% higher costs
    }

    return 1.0; // Standard costs
  }

  // Calculate estimated yield
  private calculateEstimatedYield(
    cropVariety: CropVarietyModel,
    landSizeAcres: number,
    location?: { latitude: number; longitude: number }
  ): { totalKg: number; yieldPerAcre: number } {
    // Get base yield from variety data
    const varietyData = Object.values(POTATO_VARIETIES).find(
      v => v.name === cropVariety.name
    );

    let yieldPerAcre = varietyData?.yieldPerAcre || 8000; // Default 8 tons per acre

    // Adjust yield based on location (climate factors)
    if (location) {
      // Higher altitude generally better for potatoes (simplified)
      // This would be more sophisticated with actual climate data
      const altitudeAdjustment = this.getAltitudeYieldAdjustment(location);
      yieldPerAcre *= altitudeAdjustment;
    }

    const totalKg = yieldPerAcre * landSizeAcres;

    return {
      totalKg: Math.round(totalKg),
      yieldPerAcre: Math.round(yieldPerAcre),
    };
  }

  // Get altitude-based yield adjustment (simplified)
  private getAltitudeYieldAdjustment(location: { latitude: number; longitude: number }): number {
    // Kenya's potato-growing regions are typically at higher altitudes
    // This is a simplified model - in reality, you'd use elevation data
    const optimalRegions = [
      { lat: -0.3, lng: 36.1 }, // Nyandarua region
      { lat: -0.4, lng: 36.9 }, // Nyeri region
      { lat: -0.9, lng: 36.7 }, // Nakuru region
    ];

    // Calculate distance to nearest optimal region
    let minDistance = Infinity;
    for (const region of optimalRegions) {
      const distance = Math.sqrt(
        Math.pow(location.latitude - region.lat, 2) +
        Math.pow(location.longitude - region.lng, 2)
      );
      minDistance = Math.min(minDistance, distance);
    }

    // Yield adjustment based on proximity to optimal regions
    if (minDistance < 0.5) return 1.1; // 10% higher yield
    if (minDistance < 1.0) return 1.0; // Standard yield
    if (minDistance < 2.0) return 0.9; // 10% lower yield
    return 0.8; // 20% lower yield
  }

  // Get simplified climate conditions
  private async getClimateConditions(
    _location?: { latitude: number; longitude: number },
    _plantingDate?: Date,
    _harvestDate?: Date
  ): Promise<{ averageTemperature: number; expectedRainfall: number; humidity: number }> {
    // This is simplified - in reality, you'd integrate with weather APIs
    // Kenya's highland regions (good for potatoes) typically have:
    return {
      averageTemperature: 18, // Celsius
      expectedRainfall: 1200, // mm annually
      humidity: 70, // percentage
    };
  }

  // Generate cost recommendations
  private generateCostRecommendations(
    request: CostCalculationRequest,
    costBreakdown: any,
    cropVariety: CropVarietyModel
  ): string[] {
    const recommendations: string[] = [];

    // Cost per acre analysis
    const costPerAcre = costBreakdown.seeds + costBreakdown.labor + 
                       costBreakdown.fertilizer + costBreakdown.pesticides + 
                       costBreakdown.other;

    if (costPerAcre > 50000) {
      recommendations.push(
        'Consider mechanization to reduce labor costs for larger farms'
      );
    }

    if (costBreakdown.seeds > costBreakdown.fertilizer) {
      recommendations.push(
        'Seed costs are high - consider certified seed dealers for better prices'
      );
    }

    if (request.seedSize === 2) {
      recommendations.push(
        'Size 2 seeds require more bags per acre but may have better germination rates'
      );
    }

    if (cropVariety.isEarlyMaturity()) {
      recommendations.push(
        'Early maturing variety allows for multiple seasons per year'
      );
    }

    recommendations.push(
      'Consider group purchasing of inputs to reduce costs',
      'Keep detailed records for better cost management',
      'Plan for harvest and post-harvest handling costs'
    );

    return recommendations;
  }

  // Generate harvest recommendations
  private generateHarvestRecommendations(
    cropVariety: CropVarietyModel,
    _climateConditions: any,
    plantingDate: Date
  ): string[] {
    const recommendations: string[] = [];

    // Season-based recommendations
    const plantingMonth = plantingDate.getMonth();
    if (plantingMonth >= 2 && plantingMonth <= 4) { // March-May
      recommendations.push('Planted during long rains - expect good yields');
    } else if (plantingMonth >= 9 && plantingMonth <= 11) { // Oct-Dec
      recommendations.push('Planted during short rains - may need irrigation');
    } else {
      recommendations.push('Off-season planting - irrigation will be essential');
    }

    // Variety-specific recommendations
    if (cropVariety.isEarlyMaturity()) {
      recommendations.push(
        'Early variety - can plant again for a second season',
        'Monitor for early harvest indicators to maximize quality'
      );
    }

    if (cropVariety.name === 'Markies') {
      recommendations.push(
        'Markies variety - excellent for processing and storage',
        'Ensure proper curing for maximum storage life'
      );
    }

    recommendations.push(
      'Monitor soil moisture levels during tuber formation',
      'Prepare harvest equipment and storage facilities in advance',
      'Plan marketing strategy before harvest',
      'Consider weather forecasts for optimal harvest timing'
    );

    return recommendations;
  }

  // Get varieties suitable for a location
  async getSuitableVarieties(location?: { county: string; subCounty: string }): Promise<any[]> {
    try {
      const varieties = await CropVarietyModel.findAll({
        where: { cropType: 'potato' },
        order: [['name', 'ASC']],
      });

      // Add suitability information based on location
      return varieties.map(variety => {
        const varietyData = Object.values(POTATO_VARIETIES).find(
          v => v.name === variety.name
        );

        return {
          ...variety.toJSON(),
          characteristics: varietyData?.characteristics || [],
          suitability: this.getVarietySuitability(variety, location),
        };
      });
    } catch (error) {
      logError('Failed to get suitable varieties', error as Error, { location });
      throw error;
    }
  }

  // Get variety suitability for location
  private getVarietySuitability(
    _variety: CropVarietyModel,
    location?: { county: string; subCounty: string }
  ): 'high' | 'medium' | 'low' {
    if (!location) return 'medium';

    // Highland counties are better for potato farming
    const highlandCounties = [
      'Nakuru', 'Nyandarua', 'Nyeri', 'Kiambu', 'Meru', 'Laikipia'
    ];

    if (highlandCounties.includes(location.county)) {
      return 'high';
    }

    return 'medium';
  }
}

export const calculatorService = new CalculatorService();
export default calculatorService; 