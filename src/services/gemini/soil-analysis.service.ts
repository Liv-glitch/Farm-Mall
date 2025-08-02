import { BaseGeminiService, GeminiConfig, AnalysisOptions, StructuredResponse } from './base-gemini.service';
import { SoilTestModel } from '../../models/SoilTest.model';
import { FileStorageService } from '../fileStorage.service';
import { logInfo, logError } from '../../utils/logger';
import { Queue, Worker, ConnectionOptions } from 'bullmq';

export interface SoilAnalysisResult {
  basicProperties: {
    ph: number;
    phCategory: 'very_acidic' | 'acidic' | 'slightly_acidic' | 'neutral' | 'slightly_alkaline' | 'alkaline' | 'very_alkaline';
    electricalConductivity?: number;
    organicMatter: number;
    organicMatterCategory: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
    cationExchangeCapacity?: number;
  };
  nutrients: {
    macronutrients: {
      nitrogen: {
        total?: number;
        available?: number;
        category: 'deficient' | 'low' | 'adequate' | 'high' | 'excessive';
        recommendations: string[];
      };
      phosphorus: {
        available: number;
        category: 'deficient' | 'low' | 'adequate' | 'high' | 'excessive';
        recommendations: string[];
      };
      potassium: {
        available: number;
        category: 'deficient' | 'low' | 'adequate' | 'high' | 'excessive';
        recommendations: string[];
      };
    };
    micronutrients: {
      [key: string]: {
        value?: number;
        category: 'deficient' | 'adequate' | 'excessive';
        recommendations: string[];
      };
    };
  };
  physicalProperties: {
    texture: {
      sand: number;
      silt: number;
      clay: number;
      textureClass: string;
      recommendations: string[];
    };
    structure?: string;
    porosity?: string;
    waterHoldingCapacity?: string;
    drainage: 'poor' | 'moderate' | 'good' | 'excessive';
  };
  soilHealth: {
    overallScore: number; // 0-100
    category: 'poor' | 'fair' | 'good' | 'excellent';
    limitingFactors: string[];
    strengths: string[];
  };
  cropRecommendations: Array<{
    cropType: string;
    suitabilityScore: number; // 0-100
    growthPotential: 'poor' | 'fair' | 'good' | 'excellent';
    specificRecommendations: string[];
    expectedYield?: string;
    profitabilityIndicator?: 'low' | 'medium' | 'high';
  }>;
  fertilizationPlan: {
    immediate: Array<{
      product: string;
      type: 'organic' | 'inorganic' | 'bio-fertilizer';
      amount: string;
      application: string;
      timing: string;
      cost?: string;
    }>;
    seasonal: Array<{
      season: string;
      applications: Array<{
        product: string;
        amount: string;
        timing: string;
        purpose: string;
      }>;
    }>;
    longTerm: Array<{
      practice: string;
      description: string;
      timeline: string;
      benefits: string[];
    }>;
  };
  soilImprovement: {
    amendments: Array<{
      material: string;
      purpose: string;
      amount: string;
      frequency: string;
      benefits: string[];
    }>;
    practices: Array<{
      practice: string;
      description: string;
      implementation: string;
      benefits: string[];
      timeline: string;
    }>;
  };
  regionalFactors: {
    climateConsiderations: string[];
    localAvailability: string[];
    culturalPractices: string[];
    economicFactors: string[];
  };
  monitoringPlan: {
    parameters: string[];
    frequency: string;
    methods: string[];
    warningSignals: string[];
  };
  confidence: number;
  limitations: string[];
  nextSteps: string[];
}

export class SoilAnalysisService extends BaseGeminiService {
  private queue: Queue;
  private fileStorage: FileStorageService;

  constructor(config: GeminiConfig) {
    super(config);
    this.fileStorage = new FileStorageService();

    const connection: ConnectionOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    };

    this.queue = new Queue('gemini-soil-analysis', { connection });
    this.initializeWorker(connection);
  }

  private initializeWorker(connection: ConnectionOptions) {
    const worker = new Worker('gemini-soil-analysis', async (job) => {
      const { soilTestId, documentBuffer, analysisOptions } = job.data;
      
      try {
        const soilTest = await SoilTestModel.findByPk(soilTestId);
        if (!soilTest) {
          throw new Error('Soil test not found');
        }

        // Analyze the document using Gemini
        const analysis = await this.analyzeSoilDocument(
          Buffer.from(documentBuffer, 'base64'),
          analysisOptions
        );

        if (analysis.success && analysis.data) {
          // Update soil test record with Gemini analysis results
          await soilTest.update({
            analysisResult: this.convertToLegacyFormat(analysis.data),
            status: 'analyzed',
            aiModelVersion: this.config.model
          });

          logInfo('✅ Gemini soil analysis completed', {
            soilTestId,
            overallScore: analysis.data.soilHealth.overallScore,
            cropRecommendations: analysis.data.cropRecommendations.length
          });
        } else {
          throw new Error(analysis.error || 'Analysis failed');
        }

      } catch (error: any) {
        const soilTest = await SoilTestModel.findByPk(soilTestId);
        if (soilTest) {
          await soilTest.update({
            status: 'failed',
            analysisResult: {
              error: error.message,
              recommendations: []
            }
          });
        }
        throw error;
      }
    }, { connection });

    worker.on('completed', (job) => {
      logInfo('🎉 Soil analysis job completed', { jobId: job.id });
    });

    worker.on('failed', (job, error) => {
      logError('❌ Soil analysis job failed', error, { jobId: job?.id });
    });
  }

  async analyzeSoilDocument(
    documentBuffer: Buffer,
    options: AnalysisOptions & {
      region?: string;
      cropType?: string;
      farmSize?: string;
      budget?: 'low' | 'medium' | 'high';
      farmingSystem?: 'organic' | 'conventional' | 'mixed';
    } = {}
  ): Promise<StructuredResponse<SoilAnalysisResult>> {
    const prompt = this.buildSoilAnalysisPrompt(options);
    
    return this.processDocumentWithPrompt<SoilAnalysisResult>(
      documentBuffer,
      prompt,
      {
        ...options,
        additionalContext: this.buildSoilContext(options)
      }
    );
  }

  private buildSoilAnalysisPrompt(options: any): string {
    const region = options.region || 'Kenya';
    const cropType = options.cropType || 'general agriculture';
    const farmingSystem = options.farmingSystem || 'mixed';
    const budget = options.budget || 'medium';

    return `You are an expert soil scientist and agricultural consultant specializing in ${region}. 

Analyze the provided soil test document/report and provide comprehensive recommendations for ${cropType} production using ${farmingSystem} farming practices within a ${budget} budget.

Extract and analyze the following information from the document:

1. **Basic Soil Properties:**
   - Soil pH and its agricultural implications
   - Electrical conductivity (if available)
   - Organic matter content and category
   - Cation exchange capacity (if available)

2. **Nutrient Analysis:**
   - Macronutrients (N, P, K) levels and categories
   - Micronutrients (Zn, Fe, Mn, Cu, B, Mo, etc.) if available
   - Nutrient deficiencies and excesses
   - Specific recommendations for each nutrient

3. **Physical Properties:**
   - Soil texture (sand, silt, clay percentages)
   - Soil texture classification
   - Drainage characteristics
   - Structure and porosity (if mentioned)
   - Water holding capacity

4. **Soil Health Assessment:**
   - Overall soil health score (0-100)
   - Limiting factors for crop production
   - Soil strengths and advantages
   - Critical issues requiring immediate attention

5. **Crop Suitability Analysis:**
   - Recommend suitable crops for this soil
   - Suitability scores for different crop options
   - Expected yield potential
   - Profitability considerations for the region

6. **Fertilization Strategy:**
   - Immediate fertilizer requirements
   - Seasonal fertilization calendar
   - Long-term soil fertility management
   - Organic vs. inorganic options
   - Cost-effective solutions for the specified budget

7. **Soil Improvement Plan:**
   - Soil amendments needed (lime, gypsum, organic matter)
   - Management practices for soil health
   - Timeline for improvements
   - Expected benefits and outcomes

8. **Regional Considerations:**
   - Climate-specific recommendations
   - Local fertilizer and amendment availability
   - Traditional practices that can be integrated
   - Economic factors and market considerations

9. **Monitoring and Maintenance:**
   - Parameters to monitor regularly
   - Testing frequency recommendations
   - Warning signals to watch for
   - Adaptive management strategies

Please format your response as a comprehensive JSON object with this structure:
{
  "basicProperties": {
    "ph": number,
    "phCategory": "very_acidic|acidic|slightly_acidic|neutral|slightly_alkaline|alkaline|very_alkaline",
    "electricalConductivity": number,
    "organicMatter": number,
    "organicMatterCategory": "very_low|low|moderate|high|very_high",
    "cationExchangeCapacity": number
  },
  "nutrients": {
    "macronutrients": {
      "nitrogen": {
        "total": number,
        "available": number,
        "category": "deficient|low|adequate|high|excessive",
        "recommendations": ["array"]
      },
      "phosphorus": {
        "available": number,
        "category": "deficient|low|adequate|high|excessive", 
        "recommendations": ["array"]
      },
      "potassium": {
        "available": number,
        "category": "deficient|low|adequate|high|excessive",
        "recommendations": ["array"]
      }
    },
    "micronutrients": {
      "zinc": {
        "value": number,
        "category": "deficient|adequate|excessive",
        "recommendations": ["array"]
      }
    }
  },
  "physicalProperties": {
    "texture": {
      "sand": number,
      "silt": number, 
      "clay": number,
      "textureClass": "string",
      "recommendations": ["array"]
    },
    "structure": "string",
    "porosity": "string",
    "waterHoldingCapacity": "string",
    "drainage": "poor|moderate|good|excessive"
  },
  "soilHealth": {
    "overallScore": number,
    "category": "poor|fair|good|excellent",
    "limitingFactors": ["array"],
    "strengths": ["array"]
  },
  "cropRecommendations": [
    {
      "cropType": "string",
      "suitabilityScore": number,
      "growthPotential": "poor|fair|good|excellent",
      "specificRecommendations": ["array"],
      "expectedYield": "string",
      "profitabilityIndicator": "low|medium|high"
    }
  ],
  "fertilizationPlan": {
    "immediate": [
      {
        "product": "string",
        "type": "organic|inorganic|bio-fertilizer",
        "amount": "string",
        "application": "string",
        "timing": "string",
        "cost": "string"
      }
    ],
    "seasonal": [
      {
        "season": "string",
        "applications": [
          {
            "product": "string",
            "amount": "string",
            "timing": "string",
            "purpose": "string"
          }
        ]
      }
    ],
    "longTerm": [
      {
        "practice": "string",
        "description": "string",
        "timeline": "string",
        "benefits": ["array"]
      }
    ]
  },
  "soilImprovement": {
    "amendments": [
      {
        "material": "string",
        "purpose": "string",
        "amount": "string",
        "frequency": "string",
        "benefits": ["array"]
      }
    ],
    "practices": [
      {
        "practice": "string",
        "description": "string",
        "implementation": "string",
        "benefits": ["array"],
        "timeline": "string"
      }
    ]
  },
  "regionalFactors": {
    "climateConsiderations": ["array"],
    "localAvailability": ["array"],
    "culturalPractices": ["array"],
    "economicFactors": ["array"]
  },
  "monitoringPlan": {
    "parameters": ["array"],
    "frequency": "string",
    "methods": ["array"],
    "warningSignals": ["array"]
  },
  "confidence": number,
  "limitations": ["array"],
  "nextSteps": ["array"]
}

Provide practical, actionable recommendations that are appropriate for the regional context and farming system specified.`;
  }

  private buildSoilContext(options: any): string {
    let context = '';
    
    const region = options.region || 'Kenya';
    if (region.toLowerCase() === 'kenya') {
      context += 'Focus on Kenya\'s diverse agro-ecological zones and soil types. Consider common soil challenges like acidity, low organic matter, and micronutrient deficiencies. Emphasize locally available amendments and fertilizers. ';
    }

    if (options.cropType) {
      context += `Tailor recommendations specifically for ${options.cropType} production, considering its specific nutritional requirements and soil preferences. `;
    }

    if (options.farmingSystem === 'organic') {
      context += 'Prioritize organic amendments, bio-fertilizers, and sustainable soil management practices. Avoid synthetic chemical recommendations. ';
    } else if (options.farmingSystem === 'conventional') {
      context += 'Include both organic and synthetic fertilizer options, focusing on cost-effectiveness and efficiency. ';
    }

    if (options.budget === 'low') {
      context += 'Emphasize cost-effective solutions, locally available materials, and practices that provide good return on investment for smallholder farmers. ';
    }

    return context;
  }

  // Convert new detailed format to legacy format for backward compatibility
  private convertToLegacyFormat(analysis: SoilAnalysisResult): any {
    return {
      ph: analysis.basicProperties.ph,
      nitrogen: analysis.nutrients.macronutrients.nitrogen.available || analysis.nutrients.macronutrients.nitrogen.total,
      phosphorus: analysis.nutrients.macronutrients.phosphorus.available,
      potassium: analysis.nutrients.macronutrients.potassium.available,
      organicMatter: analysis.basicProperties.organicMatter,
      texture: analysis.physicalProperties.texture.textureClass,
      recommendations: [
        ...analysis.fertilizationPlan.immediate.map(item => ({
          type: 'fertilizer',
          description: `Apply ${item.product}: ${item.amount} ${item.application}`,
          priority: 'high'
        })),
        ...analysis.soilImprovement.amendments.map(item => ({
          type: 'amendment',
          description: `${item.material}: ${item.amount} ${item.frequency}`,
          priority: 'medium'
        }))
      ],
      suitableCrops: analysis.cropRecommendations.map(crop => ({
        cropType: crop.cropType,
        suitabilityScore: crop.suitabilityScore / 100, // Convert to 0-1 scale
        notes: crop.specificRecommendations.join('. ')
      }))
    };
  }

  async uploadAndAnalyze(
    userId: string,
    file: Express.Multer.File,
    farmId?: string,
    analysisOptions: any = {}
  ) {
    // Create context for soil analysis upload
    const context = farmId 
      ? FileStorageService.createSoilAnalysisContext(farmId, 'soil-test', userId)
      : {
          category: 'soil-analysis' as const,
          subcategory: 'soil-test' as const,
          contextId: userId,
        };

    // Upload file to Supabase
    const uploadResult = await this.fileStorage.uploadFile(file, context, {
      generateThumbnail: true,
      metadata: {
        farmId,
        type: 'soil-test'
      }
    });

    // Create soil test record
    const soilTest = await SoilTestModel.create({
      userId,
      farmId,
      documentUrl: uploadResult.url,
      thumbnailUrl: uploadResult.thumbnailUrl,
      originalFilename: uploadResult.originalName,
      status: 'pending',
      aiModelVersion: this.config.model
    });

    // Convert file buffer to base64 for queue
    const documentBuffer = file.buffer.toString('base64');

    // Queue analysis job
    await this.queue.add('analyze-soil-test', {
      soilTestId: soilTest.id,
      documentBuffer,
      analysisOptions: {
        ...analysisOptions,
        region: 'Kenya'
      }
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

    logInfo('📋 Soil analysis queued', {
      soilTestId: soilTest.id,
      userId,
      farmId,
      fileName: uploadResult.originalName
    });

    return soilTest;
  }

  async getSoilTests(userId: string, farmId?: string) {
    const where: any = { userId };
    if (farmId) {
      where.farmId = farmId;
    }

    return SoilTestModel.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
  }

  async getSoilTest(id: string, userId: string) {
    return SoilTestModel.findOne({
      where: { id, userId }
    });
  }

  // Direct analysis method (bypassing queue for immediate results)
  async analyzeImmediately(
    documentBuffer: Buffer,
    options: any = {}
  ): Promise<StructuredResponse<SoilAnalysisResult>> {
    return this.analyzeSoilDocument(documentBuffer, {
      region: 'Kenya',
      ...options
    });
  }

  // Generate fertilizer recommendation based on soil analysis
  async generateFertilizerPlan(
    soilAnalysis: SoilAnalysisResult,
    cropType: string,
    farmSize: number,
    budget: number,
    region: string = 'Kenya'
  ): Promise<StructuredResponse<any>> {
    const prompt = `Based on the soil analysis results and farm parameters, create a detailed fertilizer plan:

    Soil Analysis Summary:
    - pH: ${soilAnalysis.basicProperties.ph}
    - Organic Matter: ${soilAnalysis.basicProperties.organicMatter}%
    - Nitrogen: ${soilAnalysis.nutrients.macronutrients.nitrogen.category}
    - Phosphorus: ${soilAnalysis.nutrients.macronutrients.phosphorus.category}
    - Potassium: ${soilAnalysis.nutrients.macronutrients.potassium.category}

    Farm Parameters:
    - Crop: ${cropType}
    - Farm Size: ${farmSize} acres
    - Budget: $${budget}
    - Region: ${region}

    Provide a comprehensive fertilizer plan including:
    1. Specific fertilizer products available in ${region}
    2. Application rates per acre
    3. Total quantities needed for ${farmSize} acres
    4. Cost breakdown within the $${budget} budget
    5. Application timing and methods
    6. Expected yield improvements
    7. Return on investment calculations

    Format as a detailed JSON object with practical, implementable recommendations.`;

    const startTime = Date.now();
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const processingTime = Date.now() - startTime;
      
      let parsedData: any;
      try {
        parsedData = JSON.parse(text);
      } catch {
        parsedData = { content: text };
      }

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
}