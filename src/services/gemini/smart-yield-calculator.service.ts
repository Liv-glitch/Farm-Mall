import { BaseGeminiService, GeminiConfig, StructuredResponse } from './base-gemini.service';
import { logInfo } from '../../utils/logger';

export interface YieldCalculationInputs {
  // Basic farm information
  cropType: string;
  variety?: string;
  farmSize: number; // in acres
  location: string; // e.g., "Nakuru", "Mombasa", "Central Kenya"
  
  // Soil information (from soil analysis if available)
  soilData?: {
    ph: number;
    organicMatter: number;
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    texture: string;
    drainage: string;
  };
  
  // Farming practices
  farmingSystem: 'organic' | 'conventional' | 'mixed';
  irrigationType: 'rainfed' | 'drip' | 'sprinkler' | 'furrow' | 'mixed';
  fertilizationLevel: 'low' | 'medium' | 'high' | 'optimal';
  pestManagement: 'none' | 'minimal' | 'moderate' | 'intensive' | 'ipm';
  
  // Environmental factors
  season: string;
  
  // Economic factors
  inputBudget: number; // Available budget for inputs
  targetMarket: 'local' | 'regional' | 'export';
  
  // Historical data (if available)
  previousYields?: Array<{
    year: number;
    yield: number;
    practices: string;
  }>;
}

export interface YieldPrediction {
  estimatedYield: {
    quantity: number; // in kg or tonnes
    unit: 'kg' | 'tonnes';
    range: {
      minimum: number;
      maximum: number;
      mostLikely: number;
    };
    confidence: number; // 0-1
  };
  
  economicProjection: {
    grossRevenue: {
      localMarket: number;
      regionalMarket: number;
      exportMarket?: number;
    };
    inputCosts: {
      seeds: number;
      fertilizers: number;
      pesticides: number;
      labor: number;
      irrigation: number;
      other: number;
      total: number;
    };
    netProfit: {
      conservative: number;
      realistic: number;
      optimistic: number;
    };
    profitMargin: number;
    breakEvenPrice: number;
    roi: number; // Return on investment
  };
  
  riskAssessment: {
    weatherRisk: 'low' | 'medium' | 'high';
    diseaseRisk: 'low' | 'medium' | 'high';
    marketRisk: 'low' | 'medium' | 'high';
    overallRisk: 'low' | 'medium' | 'high';
    riskFactors: string[];
    mitigationStrategies: string[];
  };
  
  optimizationRecommendations: {
    yieldImprovement: Array<{
      practice: string;
      expectedIncrease: number; // percentage
      cost: number;
      priority: 'high' | 'medium' | 'low';
      timeline: string;
    }>;
    costReduction: Array<{
      practice: string;
      expectedSavings: number;
      implementation: string;
      priority: 'high' | 'medium' | 'low';
    }>;
  };
  
  seasonalCalendar: {
    plantingWindow: {
      optimal: string;
      extended: string;
    };
    criticalActivities: Array<{
      activity: string;
      timing: string;
      importance: 'critical' | 'important' | 'optional';
      cost: number;
    }>;
    harvestWindow: {
      estimated: string;
      factors: string[];
    };
  };
  
  confidence: number;
  limitations: string[];
  recommendations: string[];
  lastUpdated: Date;
}

export class SmartYieldCalculatorService extends BaseGeminiService {
  private country: string;

  constructor(config: GeminiConfig) {
    super(config);
    this.country = process.env.FARM_COUNTRY || 'Kenya';
  }

  async calculateYield(inputs: YieldCalculationInputs): Promise<StructuredResponse<YieldPrediction>> {
    const prompt = this.buildYieldCalculationPrompt(inputs);
    
    const result = await this.processTextPrompt<YieldPrediction>(prompt);
    
    // Add lastUpdated timestamp to the data if successful
    if (result.success && result.data) {
      result.data.lastUpdated = new Date();
      
      logInfo('📊 Yield calculation completed', {
        cropType: inputs.cropType,
        location: inputs.location,
        farmSize: inputs.farmSize,
        estimatedYield: result.data.estimatedYield.range.mostLikely,
        confidence: result.data.confidence,
        processingTime: result.processingTime
      });
    }
    
    return result;
  }

  private buildYieldCalculationPrompt(inputs: YieldCalculationInputs): string {
    return `You are an expert agricultural economist and agronomist specializing in yield prediction and farm profitability analysis in ${this.country}, specifically the ${inputs.location} region.

Analyze the following farm data and provide a comprehensive yield prediction and economic analysis:

**Farm Information:**
- Country: ${this.country}
- Region/Location: ${inputs.location}
- Crop: ${inputs.cropType} ${inputs.variety ? `(Variety: ${inputs.variety})` : ''}
- Farm Size: ${inputs.farmSize} acres

**Soil Conditions:**
${inputs.soilData ? `
- pH: ${inputs.soilData.ph}
- Organic Matter: ${inputs.soilData.organicMatter}%
- Nitrogen: ${inputs.soilData.nitrogen} ppm
- Phosphorus: ${inputs.soilData.phosphorus} ppm
- Potassium: ${inputs.soilData.potassium} ppm
- Soil Texture: ${inputs.soilData.texture}
- Drainage: ${inputs.soilData.drainage}
` : 'No detailed soil analysis available - use regional averages for ' + inputs.location}

**Farming Practices:**
- Farming System: ${inputs.farmingSystem}
- Irrigation: ${inputs.irrigationType}
- Fertilization Level: ${inputs.fertilizationLevel}
- Pest Management: ${inputs.pestManagement}
- Season: ${inputs.season}
- Input Budget: $${inputs.inputBudget}
- Target Market: ${inputs.targetMarket}

**Historical Performance:**
${inputs.previousYields ? 
  inputs.previousYields.map(y => `${y.year}: ${y.yield} kg (${y.practices})`).join('\n') :
  'No historical data available'}

Please provide a comprehensive analysis considering:
- Regional crop performance data for ${inputs.location}, ${this.country}
- Local climate patterns and seasonal variations
- Local market prices and demand in ${this.country}
- Input costs and availability in ${inputs.location}
- Regional agricultural challenges and opportunities
- Government policies and subsidies in ${this.country}

Format your response as a comprehensive JSON object with this structure:
{
  "estimatedYield": {
    "quantity": number,
    "unit": "kg|tonnes",
    "range": {
      "minimum": number,
      "maximum": number,
      "mostLikely": number
    },
    "confidence": number
  },
  "economicProjection": {
    "grossRevenue": {
      "localMarket": number,
      "regionalMarket": number,
      "exportMarket": number
    },
    "inputCosts": {
      "seeds": number,
      "fertilizers": number,
      "pesticides": number,
      "labor": number,
      "irrigation": number,
      "other": number,
      "total": number
    },
    "netProfit": {
      "conservative": number,
      "realistic": number,
      "optimistic": number
    },
    "profitMargin": number,
    "breakEvenPrice": number,
    "roi": number
  },
  "riskAssessment": {
    "weatherRisk": "low|medium|high",
    "diseaseRisk": "low|medium|high",
    "marketRisk": "low|medium|high",
    "overallRisk": "low|medium|high",
    "riskFactors": ["array"],
    "mitigationStrategies": ["array"]
  },
  "optimizationRecommendations": {
    "yieldImprovement": [
      {
        "practice": "string",
        "expectedIncrease": number,
        "cost": number,
        "priority": "high|medium|low",
        "timeline": "string"
      }
    ],
    "costReduction": [
      {
        "practice": "string",
        "expectedSavings": number,
        "implementation": "string",
        "priority": "high|medium|low"
      }
    ]
  },
  "seasonalCalendar": {
    "plantingWindow": {
      "optimal": "string",
      "extended": "string"
    },
    "criticalActivities": [
      {
        "activity": "string",
        "timing": "string",
        "importance": "critical|important|optional",
        "cost": number
      }
    ],
    "harvestWindow": {
      "estimated": "string",
      "factors": ["array"]
    }
  },
  "confidence": number,
  "limitations": ["array"],
  "recommendations": ["array"]
}

Provide realistic, actionable, and region-specific recommendations based on current agricultural practices and market conditions in ${inputs.location}, ${this.country}.`;
  }

}