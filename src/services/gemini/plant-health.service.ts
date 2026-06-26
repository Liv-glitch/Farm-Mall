import { BaseGeminiService, GeminiConfig, AnalysisOptions, StructuredResponse } from './base-gemini.service';
import { PlantHealthAssessmentModel } from '../../models/PlantHealthAssessment.model';
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
    prevention?: string[];
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
  constructor(config: GeminiConfig) {
    super(config);
  }

  async assessPlantHealth(
    imageBuffer: Buffer,
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
    
    // Determine MIME type from buffer
    const mimeType = this.detectImageMimeType(imageBuffer);
    
    return this.processImageWithPrompt<PlantHealthResponse>(
      imageBuffer,
      prompt,
      mimeType,
      {
        ...options,
        additionalContext: this.buildHealthContext(options)
      }
    );
  }

  private detectImageMimeType(buffer: Buffer): string {
    // Check file signature to determine MIME type
    const signature = buffer.toString('hex', 0, 4).toUpperCase();
    
    if (signature.startsWith('FFD8')) return 'image/jpeg';
    if (signature.startsWith('8950')) return 'image/png';
    if (signature.startsWith('4749')) return 'image/gif';
    if (signature.startsWith('5249')) return 'image/webp';
    
    // Default to JPEG if unknown
    return 'image/jpeg';
  }

  private buildHealthAssessmentPrompt(options: any): string {
    const plantInfo = options.plantType ? `plant type: ${options.plantType}` : '';
    const stageInfo = options.cropStage ? `growth stage: ${options.cropStage}` : '';
    const regionInfo = options.region ? `region: ${options.region}` : 'Kenya';
    const seasonInfo = options.season ? `season: ${options.season}` : '';
    const symptomInfo = options.symptomDescription ? `reported symptoms: ${options.symptomDescription}` : '';

    return `You are an agricultural extension officer explaining plant health to a lay farmer in ${regionInfo}. You understand plant diseases, pests, and crop stress, but your response must be easy for a farmer with no technical training to understand.

Analyze the provided plant image for health issues. ${plantInfo} ${stageInfo} ${seasonInfo} ${symptomInfo}

Language rules for every farmer-facing string in the JSON:
- Always write in English only. Do not write Kiswahili, Swahili, Sheng, or any other language.
- If the image, location, crop name, or user context suggests another language, still answer in English.
- Translate any local-language disease, pest, symptom, or treatment wording into clear English before returning JSON.
- Use simple, practical words a lay farmer would use.
- Keep descriptions, symptoms, causes, and recommendations short and clear.
- Explain any scientific name or technical term in plain words the first time you use it.
- Avoid jargon such as lesion, necrosis, inoculum, canopy, etiology, pathogen pressure, translaminar, systemic activity, mode of action, and economic threshold unless you also explain it simply.
- Say what the farmer should do, when to do it, and what warning signs to watch for.
- Do not recommend restricted chemicals as a first step. If chemicals may be needed, tell the farmer to use a registered product through a qualified agrovet or extension officer and follow the label.

Provide a comprehensive health assessment including:

1. **Overall Health Status:**
   - General health condition and score (0-100)
   - Immediate concerns and urgency level
   - Overall prognosis

2. **Disease Analysis:**
   - Identify any visible diseases with confidence scores
   - Disease type in plain language, for example fungus disease, bacteria disease, virus disease, nutrition problem, pest damage, or weather/water stress
   - Severity assessment
   - Affected plant parts
   - How the problem is likely to spread
   - Treatment recommendations in simple steps
   - Prevention strategies

3. **Pest Detection:**
   - Identify visible pests or pest damage
   - Pest type and visible damage signs
   - How serious the damage looks
   - Control steps: field hygiene, hand removal, biological options, and safe chemical options where needed
   - Simple monitoring recommendations

4. **Nutritional Assessment:**
   - Identify nutrient deficiency symptoms
   - Affected nutrients, explained in simple words
   - Severity of deficiencies
   - Correction methods and fertilizer recommendations that a farmer can understand
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

Be thorough in your analysis, but keep the wording simple. The JSON keys must stay exactly as shown, but the text values should sound like clear advice from a local extension officer to a farmer.`;
  }

  private buildHealthContext(options: any): string {
    let context = '';
    
    if (options.region === 'kenya' || !options.region) {
      context += 'Consider Kenya\'s climate zones and common agricultural challenges. Focus on diseases and pests prevalent in tropical highland and lowland conditions. ';
    }
    
    if (options.season) {
      const seasonalContext = {
        'rainy': 'Wet leaves and humid air help leaf diseases spread. Also check for waterlogging and poor drainage.',
        'dry': 'Plants may suffer from lack of water, heat, and dust. Some pests may increase.',
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

    const imageBuffer = typeof imagePath === 'string' ? Buffer.from(imagePath, 'base64') : imagePath;
    const result = await this.assessPlantHealth(imageBuffer, {
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

    // Return result directly as it's already in proper format
    return {
      success: true,
      data: result.data
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
    
    const imageBuffer = typeof imagePath === 'string' ? Buffer.from(imagePath, 'base64') : imagePath;
    const mimeType = this.detectImageMimeType(imageBuffer);
    return this.processImageWithPrompt(imageBuffer, prompt, mimeType, options);
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

    return this.processTextPrompt(prompt);
  }
}
