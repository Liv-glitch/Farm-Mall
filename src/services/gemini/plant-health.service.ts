import { BaseGeminiService, GeminiConfig, AnalysisOptions, StructuredResponse } from './base-gemini.service';
import { PlantHealthAssessmentModel } from '../../models/PlantHealthAssessment.model';
import { FileStorageService } from '../fileStorage.service';
import { logInfo, logError } from '../../utils/logger';

export interface Disease {
  name: string;
  scientificName?: string;
  commonNames: string[];
  type: 'fungal' | 'bacterial' | 'viral' | 'nutritional' | 'environmental' | 'pest' | 'unknown';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  confidence: number;
  symptoms: string[];
  description: string;
  causes: string[];
  affectedParts: string[];
  stages: string[];
  seasonalPattern?: string;
  treatment: {
    immediate: string[];
    preventive: string[];
    organic: string[];
    chemical: string[];
    culturalPractices: string[];
  };
  prognosis: {
    treatability: 'easy' | 'moderate' | 'difficult' | 'irreversible';
    timeline: string;
    expectedOutcome: string;
  };
  similarDiseases?: string[];
  regionalConsiderations?: string;
}

export interface Pest {
  name: string;
  scientificName?: string;
  type: 'insect' | 'mite' | 'nematode' | 'rodent' | 'bird' | 'other';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  confidence: number;
  description: string;
  identificationFeatures: string[];
  damage: {
    type: string[];
    severity: string;
    affectedParts: string[];
  };
  lifecycle: string;
  seasonalActivity: string;
  control: {
    biological: string[];
    cultural: string[];
    mechanical: string[];
    chemical: string[];
    integrated: string[];
  };
  monitoring: string[];
  economicThreshold?: string;
}

export interface NutritionalDeficiency {
  nutrient: string;
  type: 'macronutrient' | 'micronutrient';
  severity: 'mild' | 'moderate' | 'severe';
  confidence: number;
  symptoms: string[];
  affectedParts: string[];
  causes: string[];
  correction: {
    fertilizers: string[];
    organicSources: string[];
    application: string[];
    timing: string;
  };
  prevention: string[];
}

export interface EnvironmentalStress {
  type: 'water_stress' | 'heat_stress' | 'cold_stress' | 'light_stress' | 'wind_damage' | 'soil_compaction';
  severity: 'mild' | 'moderate' | 'severe';
  confidence: number;
  symptoms: string[];
  causes: string[];
  mitigation: string[];
  prevention: string[];
}

export interface HealthStatus {
  overall: 'healthy' | 'stressed' | 'diseased' | 'severely_compromised';
  isHealthy: boolean;
  healthScore: number; // 0-100
  confidence: number;
  assessment: string;
  urgency: 'none' | 'low' | 'medium' | 'high' | 'emergency';
}

export interface PlantHealthResponse {
  healthStatus: HealthStatus;
  diseases: Disease[];
  pests: Pest[];
  nutritionalDeficiencies: NutritionalDeficiency[];
  environmentalStress: EnvironmentalStress[];
  primaryConcerns: string[];
  treatmentPriority: Array<{
    issue: string;
    priority: number;
    urgency: string;
    treatment: string[];
  }>;
  preventiveMeasures: string[];
  followUpRecommendations: string[];
  analysisNotes: string;
  regionalFactors?: string;
}

export class PlantHealthService extends BaseGeminiService {
  private fileStorage: FileStorageService;

  constructor(config: GeminiConfig) {
    super(config);
    this.fileStorage = new FileStorageService();
  }

  async assessPlantHealth(
    imagePath: string | Buffer,
    options: AnalysisOptions & {
      plantType?: string;
      plantAge?: string;
      cropStage?: 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'mature';
      region?: string;
      season?: string;
      previousDiagnosis?: string;
      symptomDescription?: string;
    } = {}
  ): Promise<StructuredResponse<PlantHealthResponse>> {
    const prompt = this.buildHealthAssessmentPrompt(options);
    
    return this.processImageWithPrompt<PlantHealthResponse>(
      imagePath,
      prompt,
      {
        ...options,
        additionalContext: this.buildHealthContext(options)
      }
    );
  }

  private buildHealthAssessmentPrompt(options: any): string {
    const plantInfo = options.plantType ? `plant type: ${options.plantType}` : '';
    const stageInfo = options.cropStage ? `growth stage: ${options.cropStage}` : '';
    const regionInfo = options.region ? `region: ${options.region}` : 'Kenya';
    const seasonInfo = options.season ? `season: ${options.season}` : '';
    const symptomInfo = options.symptomDescription ? `reported symptoms: ${options.symptomDescription}` : '';

    return `You are an expert plant pathologist and agricultural extension specialist with deep knowledge of plant diseases, pests, and health issues, particularly in ${regionInfo}.

Analyze the provided plant image for health issues. ${plantInfo} ${stageInfo} ${seasonInfo} ${symptomInfo}

Provide a comprehensive health assessment including:

1. **Overall Health Status:**
   - General health condition and score (0-100)
   - Immediate concerns and urgency level
   - Overall prognosis

2. **Disease Analysis:**
   - Identify any visible diseases with confidence scores
   - Disease type (fungal, bacterial, viral, etc.)
   - Severity assessment
   - Affected plant parts
   - Development stage and progression
   - Treatment recommendations (organic and chemical)
   - Prevention strategies

3. **Pest Detection:**
   - Identify visible pests or pest damage
   - Pest type and lifecycle stage
   - Damage severity and economic impact
   - Control strategies (IPM approach)
   - Monitoring recommendations

4. **Nutritional Assessment:**
   - Identify nutrient deficiency symptoms
   - Affected nutrients (macro/micronutrients)
   - Severity of deficiencies
   - Correction methods and fertilizer recommendations
   - Prevention strategies

5. **Environmental Stress Indicators:**
   - Water stress (drought/overwatering)
   - Temperature stress (heat/cold)
   - Light stress
   - Physical damage
   - Soil-related issues

6. **Treatment Prioritization:**
   - List issues by priority and urgency
   - Immediate actions required
   - Short-term and long-term treatments
   - Cost-effective solutions for smallholder farmers

7. **Regional Considerations:**
   - Climate-specific factors
   - Seasonal disease/pest patterns
   - Local treatment availability
   - Cultural practices relevant to the region

8. **Follow-up Recommendations:**
   - Monitoring schedule
   - When to reassess
   - Warning signs to watch for
   - Preventive measures for future crops

Please format your response as a valid JSON object with this structure:
{
  "healthStatus": {
    "overall": "healthy|stressed|diseased|severely_compromised",
    "isHealthy": boolean,
    "healthScore": number,
    "confidence": number,
    "assessment": "string",
    "urgency": "none|low|medium|high|emergency"
  },
  "diseases": [
    {
      "name": "string",
      "scientificName": "string",
      "commonNames": ["array"],
      "type": "fungal|bacterial|viral|nutritional|environmental|pest|unknown",
      "severity": "low|moderate|high|critical",
      "confidence": number,
      "symptoms": ["array"],
      "description": "string",
      "causes": ["array"],
      "affectedParts": ["array"],
      "stages": ["array"],
      "seasonalPattern": "string",
      "treatment": {
        "immediate": ["array"],
        "preventive": ["array"],
        "organic": ["array"],
        "chemical": ["array"],
        "culturalPractices": ["array"]
      },
      "prognosis": {
        "treatability": "easy|moderate|difficult|irreversible",
        "timeline": "string",
        "expectedOutcome": "string"
      },
      "similarDiseases": ["array"],
      "regionalConsiderations": "string"
    }
  ],
  "pests": [
    {
      "name": "string",
      "scientificName": "string",
      "type": "insect|mite|nematode|rodent|bird|other",
      "severity": "low|moderate|high|critical",
      "confidence": number,
      "description": "string",
      "identificationFeatures": ["array"],
      "damage": {
        "type": ["array"],
        "severity": "string",
        "affectedParts": ["array"]
      },
      "lifecycle": "string",
      "seasonalActivity": "string",
      "control": {
        "biological": ["array"],
        "cultural": ["array"],
        "mechanical": ["array"],
        "chemical": ["array"],
        "integrated": ["array"]
      },
      "monitoring": ["array"],
      "economicThreshold": "string"
    }
  ],
  "nutritionalDeficiencies": [
    {
      "nutrient": "string",
      "type": "macronutrient|micronutrient",
      "severity": "mild|moderate|severe",
      "confidence": number,
      "symptoms": ["array"],
      "affectedParts": ["array"],
      "causes": ["array"],
      "correction": {
        "fertilizers": ["array"],
        "organicSources": ["array"],
        "application": ["array"],
        "timing": "string"
      },
      "prevention": ["array"]
    }
  ],
  "environmentalStress": [
    {
      "type": "water_stress|heat_stress|cold_stress|light_stress|wind_damage|soil_compaction",
      "severity": "mild|moderate|severe",
      "confidence": number,
      "symptoms": ["array"],
      "causes": ["array"],
      "mitigation": ["array"],
      "prevention": ["array"]
    }
  ],
  "primaryConcerns": ["array of main issues"],
  "treatmentPriority": [
    {
      "issue": "string",
      "priority": number,
      "urgency": "string",
      "treatment": ["array"]
    }
  ],
  "preventiveMeasures": ["array"],
  "followUpRecommendations": ["array"],
  "analysisNotes": "string",
  "regionalFactors": "string"
}

Be thorough in your analysis. Focus on actionable, practical recommendations suitable for farmers in the region.`;
  }

  private buildHealthContext(options: any): string {
    let context = '';
    
    if (options.region === 'kenya' || !options.region) {
      context += 'Consider Kenya\'s climate zones and common agricultural challenges. Focus on diseases and pests prevalent in tropical highland and lowland conditions. ';
    }
    
    if (options.season) {
      const seasonalContext = {
        'rainy': 'High humidity and moisture favor fungal diseases. Consider waterlogging and poor drainage issues.',
        'dry': 'Water stress, heat stress, and dust-related issues are common. Pest pressure may increase.',
        'transitional': 'Mixed conditions with varying stress factors. Disease pressure may be building.'
      };
      context += seasonalContext[options.season as keyof typeof seasonalContext] || '';
    }

    if (options.plantType) {
      context += `Focus on health issues commonly affecting ${options.plantType}. `;
    }

    return context;
  }

  // Backward compatibility method - mimics Plant.id health API response format
  async assessPlantHealthCompatible(
    imagePath: string | Buffer,
    options: {
      latitude?: number;
      longitude?: number;
      plantType?: string;
      similarImages?: boolean;
    } = {}
  ) {
    const analysisOptions: AnalysisOptions = {
      location: options.latitude && options.longitude ? {
        latitude: options.latitude,
        longitude: options.longitude
      } : undefined,
      includeMetadata: true,
      confidence: true
    };

    const result = await this.assessPlantHealth(imagePath, {
      ...analysisOptions,
      plantType: options.plantType,
      region: 'kenya'
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        message: result.error || 'Plant health assessment failed',
        data: null
      };
    }

    // Convert to Plant.id compatible format
    const compatibleResponse = this.convertToPlantIdFormat(result.data, 'health');
    
    return {
      success: true,
      data: compatibleResponse
    };
  }

  async saveHealthAssessment(
    userId: string,
    imageUrl: string,
    thumbnailUrl: string,
    originalFilename: string,
    healthAssessment: PlantHealthResponse,
    location?: { latitude: number; longitude: number }
  ) {
    try {
      const assessment = await PlantHealthAssessmentModel.create({
        userId,
        imageUrl,
        thumbnailUrl,
        originalFilename,
        latitude: location?.latitude,
        longitude: location?.longitude,
        healthAssessmentResult: healthAssessment as any,
        isHealthy: healthAssessment.healthStatus.isHealthy,
        diseases: healthAssessment.diseases as any,
        treatmentSuggestions: healthAssessment.treatmentPriority as any
      });

      logInfo('💾 Plant health assessment saved to database', {
        id: assessment.id,
        userId,
        isHealthy: healthAssessment.healthStatus.isHealthy,
        healthScore: healthAssessment.healthStatus.healthScore,
        diseaseCount: healthAssessment.diseases.length,
        pestCount: healthAssessment.pests.length
      });

      return assessment;
    } catch (error: any) {
      logError('❌ Failed to save plant health assessment', error, { userId });
      throw error;
    }
  }

  async getHealthAssessmentHistory(userId: string, limit: number = 20) {
    return PlantHealthAssessmentModel.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  async getHealthAssessmentById(id: string, userId: string) {
    return PlantHealthAssessmentModel.findOne({
      where: { id, userId }
    });
  }

  // Specialized analysis for specific health concerns
  async analyzeSpecificIssue(
    imagePath: string | Buffer,
    issueType: 'disease' | 'pest' | 'nutrient' | 'environment',
    specificConcern: string,
    options: AnalysisOptions = {}
  ): Promise<StructuredResponse<any>> {
    const prompt = this.buildSpecificIssuePrompt(issueType, specificConcern);
    
    return this.processImageWithPrompt(imagePath, prompt, options);
  }

  private buildSpecificIssuePrompt(issueType: string, concern: string): string {
    const prompts = {
      disease: `Focus specifically on identifying and analyzing the disease: ${concern}. 
        Provide detailed information about symptoms, stages, treatment options, and prevention strategies.`,
      
      pest: `Focus specifically on identifying and analyzing the pest: ${concern}.
        Provide detailed information about identification, damage patterns, lifecycle, and control strategies.`,
      
      nutrient: `Focus specifically on analyzing the nutritional deficiency: ${concern}.
        Provide detailed information about symptoms, causes, correction methods, and prevention.`,
      
      environment: `Focus specifically on analyzing the environmental stress: ${concern}.
        Provide detailed information about symptoms, causes, mitigation, and prevention strategies.`
    };

    return `You are an expert plant health specialist. ${prompts[issueType as keyof typeof prompts]}
    
    Analyze the image and provide a comprehensive assessment focused on this specific issue.
    Format your response as a detailed JSON object with actionable recommendations.`;
  }

  // AI-powered treatment recommendation system
  async getPersonalizedTreatment(
    healthAssessment: PlantHealthResponse,
    farmerProfile: {
      location: string;
      farmSize: string;
      resources: 'limited' | 'moderate' | 'adequate';
      experience: 'beginner' | 'intermediate' | 'advanced';
      budget: 'low' | 'medium' | 'high';
      organicPreference: boolean;
    }
  ): Promise<StructuredResponse<any>> {
    const prompt = `Based on the plant health assessment and farmer profile, provide personalized treatment recommendations:

    Health Issues: ${JSON.stringify(healthAssessment.primaryConcerns)}
    Location: ${farmerProfile.location}
    Farm Size: ${farmerProfile.farmSize}
    Resources: ${farmerProfile.resources}
    Experience: ${farmerProfile.experience}
    Budget: ${farmerProfile.budget}
    Organic Preference: ${farmerProfile.organicPreference}

    Provide step-by-step treatment plans that are:
    1. Appropriate for the farmer's experience level
    2. Within budget constraints
    3. Accessible in the local area
    4. Aligned with organic preferences if specified
    5. Practical for the farm size

    Format as a JSON object with prioritized actions, timeline, costs, and success monitoring methods.`;

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