import { BaseGeminiService, GeminiConfig, StructuredResponse } from './base-gemini.service';
import { logInfo, logError } from '../../utils/logger';

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
    
    const startTime = Date.now();
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const processingTime = Date.now() - startTime;
      
      let parsedData: YieldPrediction;
      try {
        parsedData = JSON.parse(text);
        parsedData.lastUpdated = new Date();
      } catch {
        // If parsing fails, create a basic response
        parsedData = this.createFallbackResponse(inputs);
      }

      logInfo('📊 Yield calculation completed', {
        cropType: inputs.cropType,
        location: inputs.location,
        farmSize: inputs.farmSize,
        estimatedYield: parsedData.estimatedYield.range.mostLikely,
        confidence: parsedData.confidence,
        processingTime
      });

      return {
        success: true,
        data: parsedData,
        modelVersion: this.config.model!,
        processingTime,
        metadata: {
          timestamp: new Date()
        }
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      logError('❌ Yield calculation failed', error, {
        cropType: inputs.cropType,
        location: inputs.location,
        farmSize: inputs.farmSize
      });

      return {
        success: false,
        error: error.message,
        modelVersion: this.config.model!,
        processingTime,
        metadata: {
          timestamp: new Date()
        }
      };
    }
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

  private createFallbackResponse(inputs: YieldCalculationInputs): YieldPrediction {
    // Create a basic response if AI processing fails
    const basicYield = this.estimateBasicYield(inputs);
    
    return {
      estimatedYield: {
        quantity: basicYield,
        unit: 'kg',
        range: {
          minimum: basicYield * 0.7,
          maximum: basicYield * 1.3,
          mostLikely: basicYield
        },
        confidence: 0.6
      },
      economicProjection: {
        grossRevenue: {
          localMarket: basicYield * 50, // Assuming $0.50 per kg
          regionalMarket: basicYield * 60,
          exportMarket: basicYield * 80
        },
        inputCosts: {
          seeds: inputs.farmSize * 200,
          fertilizers: inputs.farmSize * 300,
          pesticides: inputs.farmSize * 150,
          labor: inputs.farmSize * 400,
          irrigation: inputs.farmSize * 100,
          other: inputs.farmSize * 100,
          total: inputs.farmSize * 1250
        },
        netProfit: {
          conservative: basicYield * 20,
          realistic: basicYield * 30,
          optimistic: basicYield * 45
        },
        profitMargin: 0.25,
        breakEvenPrice: 0.40,
        roi: 0.30
      },
      riskAssessment: {
        weatherRisk: 'medium',
        diseaseRisk: 'medium',
        marketRisk: 'medium',
        overallRisk: 'medium',
        riskFactors: ['Limited data for detailed risk assessment'],
        mitigationStrategies: ['Diversify farming practices', 'Monitor market prices', 'Use weather forecasts']
      },
      optimizationRecommendations: {
        yieldImprovement: [
          {
            practice: 'Improve soil fertility',
            expectedIncrease: 15,
            cost: 500,
            priority: 'high',
            timeline: '6 months'
          }
        ],
        costReduction: [
          {
            practice: 'Bulk input purchasing',
            expectedSavings: 200,
            implementation: 'Join farmer cooperative',
            priority: 'medium'
          }
        ]
      },
      seasonalCalendar: {
        plantingWindow: {
          optimal: 'March-April',
          extended: 'February-May'
        },
        criticalActivities: [
          {
            activity: 'Land preparation',
            timing: '2 weeks before planting',
            importance: 'critical',
            cost: 200
          }
        ],
        harvestWindow: {
          estimated: '4-5 months after planting',
          factors: ['Variety maturity period', 'Weather conditions']
        }
      },
      confidence: 0.6,
      limitations: ['Limited input data', 'Basic calculation method used'],
      recommendations: ['Conduct soil analysis', 'Keep detailed farm records', 'Consider weather insurance'],
      lastUpdated: new Date()
    };
  }

  private estimateBasicYield(inputs: YieldCalculationInputs): number {
    // Basic yield estimation based on crop type and farm size
    const yieldPerAcre: Record<string, number> = {
      'maize': 1200, // kg per acre
      'beans': 800,
      'potato': 8000,
      'tomato': 15000,
      'cabbage': 20000,
      'carrot': 12000,
      'onion': 10000
    };

    const baseYield = yieldPerAcre[inputs.cropType.toLowerCase()] || 1000;
    
    // Apply modifiers based on farming practices
    let modifier = 1.0;
    
    if (inputs.farmingSystem === 'organic') modifier *= 0.85;
    if (inputs.irrigationType === 'drip') modifier *= 1.2;
    if (inputs.fertilizationLevel === 'high') modifier *= 1.15;
    if (inputs.fertilizationLevel === 'low') modifier *= 0.8;
    
    return Math.round(baseYield * modifier * inputs.farmSize);
  }
}

export const smartYieldCalculator = new SmartYieldCalculatorService({
  apiKey: process.env.GEMINI_API_KEY!,
  model: (process.env.GEMINI_MODEL as any) || 'gemini-2.5-flash'
});