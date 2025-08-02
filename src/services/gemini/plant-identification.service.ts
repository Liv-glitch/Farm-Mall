import { BaseGeminiService, GeminiConfig, AnalysisOptions, StructuredResponse } from './base-gemini.service';
import { PlantIdentificationModel } from '../../models/PlantIdentification.model';
import { FileStorageService } from '../fileStorage.service';
import { logInfo, logError } from '../../utils/logger';

export interface PlantIdentification {
  scientificName: string;
  commonName: string;
  commonNames: string[];
  family: string;
  genus: string;
  species: string;
  confidence: number;
  description: string;
  characteristics: {
    leafType?: string;
    flowerColor?: string;
    fruitType?: string;
    growthHabit?: string;
    size?: string;
  };
  taxonomy: {
    kingdom: string;
    phylum: string;
    class: string;
    order: string;
    family: string;
    genus: string;
    species: string;
  };
  edibleParts?: string[];
  usefulProperties?: string[];
  nativeRegion?: string;
  cultivationTips?: string[];
  wateringNeeds?: string;
  sunlightRequirements?: string;
  soilPreferences?: string;
  propagationMethods?: string[];
  seasonalInfo?: {
    plantingSeason?: string;
    floweringSeason?: string;
    harvestSeason?: string;
  };
}

export interface PlantIdentificationResponse {
  plants: PlantIdentification[];
  primaryIdentification: PlantIdentification;
  alternativeIdentifications: PlantIdentification[];
  analysisNotes: string;
  regionalContext?: string;
}

export class PlantIdentificationService extends BaseGeminiService {
  private fileStorage: FileStorageService;

  constructor(config: GeminiConfig) {
    super(config);
    this.fileStorage = new FileStorageService();
  }

  async identifyPlant(
    imagePath: string | Buffer,
    options: AnalysisOptions & {
      plantType?: 'crop' | 'wild' | 'ornamental' | 'all';
      focusRegion?: 'kenya' | 'east-africa' | 'tropical' | 'global';
      includeUsageInfo?: boolean;
      includeCultivationInfo?: boolean;
    } = {}
  ): Promise<StructuredResponse<PlantIdentificationResponse>> {
    const plantType = options.plantType || 'all';
    const focusRegion = options.focusRegion || 'kenya';

    const prompt = this.buildPlantIdentificationPrompt(plantType, focusRegion, options);
    
    return this.processImageWithPrompt<PlantIdentificationResponse>(
      imagePath,
      prompt,
      {
        ...options,
        additionalContext: this.getRegionalContext(focusRegion)
      }
    );
  }

  private buildPlantIdentificationPrompt(
    plantType: string,
    focusRegion: string,
    options: any
  ): string {
    let prompt = `You are an expert botanist specializing in plant identification, particularly in ${focusRegion === 'kenya' ? 'Kenya and East Africa' : focusRegion}. 

Analyze the provided image and identify the plant with high accuracy. Focus on ${plantType === 'all' ? 'all types of plants' : `${plantType} plants`}.

Please provide a comprehensive identification including:

1. **Primary Identification:**
   - Scientific name (binomial nomenclature)
   - Common name(s) in English and local languages if known
   - Plant family and classification
   - Confidence level (0-1)

2. **Alternative Identifications (if any):**
   - List 2-3 similar species with confidence scores
   - Key distinguishing features

3. **Plant Characteristics:**
   - Leaf type, shape, and arrangement
   - Flower characteristics (if visible)
   - Fruit/seed characteristics (if visible)
   - Growth habit and typical size
   - Distinctive features

4. **Taxonomic Classification:**
   - Complete taxonomic hierarchy
   - Family characteristics

5. **Practical Information:**
   ${options.includeUsageInfo ? `
   - Edible parts (if any) and preparation methods
   - Medicinal uses (traditional and documented)
   - Economic/commercial value
   - Cultural significance in the region
   ` : ''}
   
   ${options.includeCultivationInfo ? `
   - Growing conditions and requirements
   - Soil preferences and pH range
   - Water and sunlight needs
   - Best planting/growing seasons for the region
   - Propagation methods
   - Common cultivation challenges
   - Pest and disease susceptibility
   ` : ''}

6. **Regional Context:**
   - Native habitat and distribution
   - Adaptation to local climate
   - Seasonal growth patterns
   - Local varieties or cultivars

Please format your response as a valid JSON object with the following structure:
{
  "plants": [
    {
      "scientificName": "string",
      "commonName": "string", 
      "commonNames": ["array of strings"],
      "family": "string",
      "genus": "string",
      "species": "string",
      "confidence": number,
      "description": "string",
      "characteristics": {
        "leafType": "string",
        "flowerColor": "string",
        "fruitType": "string", 
        "growthHabit": "string",
        "size": "string"
      },
      "taxonomy": {
        "kingdom": "string",
        "phylum": "string",
        "class": "string",
        "order": "string", 
        "family": "string",
        "genus": "string",
        "species": "string"
      },
      "edibleParts": ["array"],
      "usefulProperties": ["array"],
      "nativeRegion": "string",
      "cultivationTips": ["array"],
      "wateringNeeds": "string",
      "sunlightRequirements": "string",
      "soilPreferences": "string",
      "propagationMethods": ["array"],
      "seasonalInfo": {
        "plantingSeason": "string",
        "floweringSeason": "string", 
        "harvestSeason": "string"
      }
    }
  ],
  "primaryIdentification": "reference to main plant object",
  "alternativeIdentifications": ["array of alternative plant objects"],
  "analysisNotes": "string with analysis notes",
  "regionalContext": "string with regional growing context"
}

Be thorough but concise. Prioritize accuracy over quantity of information.`;

    return prompt;
  }

  private getRegionalContext(region: string): string {
    const contexts: Record<string, string> = {
      'kenya': 'Focus on plants commonly found in Kenya\'s diverse climate zones: coastal, highland, arid, and semi-arid regions. Consider crops like maize, beans, sweet potatoes, cassava, bananas, coffee, tea, and indigenous vegetables.',
      'east-africa': 'Consider the East African region including Kenya, Tanzania, Uganda, Ethiopia, and Rwanda. Focus on regional crops, indigenous plants, and species adapted to tropical highland and lowland conditions.',
      'tropical': 'Focus on tropical and subtropical plant species, considering temperature, humidity, and rainfall patterns typical of tropical regions.',
      'global': 'Provide global plant identification without regional bias, but mention adaptation to different climate zones.'
    };
    return contexts[region] || contexts['global'];
  }

  // Backward compatibility method - mimics Plant.id API response format
  async identifyPlantCompatible(
    imagePath: string | Buffer,
    options: {
      latitude?: number;
      longitude?: number;
      similarImages?: boolean;
      plantType?: string;
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

    const result = await this.identifyPlant(imagePath, {
      ...analysisOptions,
      plantType: options.plantType as any || 'all',
      focusRegion: 'kenya',
      includeUsageInfo: true,
      includeCultivationInfo: true
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        message: result.error || 'Plant identification failed',
        data: null
      };
    }

    // Convert to Plant.id compatible format
    const compatibleResponse = this.convertToPlantIdFormat(result.data, 'identification');
    
    return {
      success: true,
      data: compatibleResponse
    };
  }

  async saveIdentificationResult(
    userId: string,
    imageUrl: string, 
    thumbnailUrl: string,
    originalFilename: string,
    identificationResult: PlantIdentificationResponse,
    location?: { latitude: number; longitude: number }
  ) {
    try {
      const plantIdentification = await PlantIdentificationModel.create({
        userId,
        imageUrl,
        thumbnailUrl,
        originalFilename,
        latitude: location?.latitude,
        longitude: location?.longitude,
        identificationResult: identificationResult as any,
        confidenceScore: identificationResult.primaryIdentification?.confidence
      });

      logInfo('💾 Plant identification saved to database', {
        id: plantIdentification.id,
        userId,
        confidence: identificationResult.primaryIdentification?.confidence,
        plantName: identificationResult.primaryIdentification?.scientificName
      });

      return plantIdentification;
    } catch (error: any) {
      logError('❌ Failed to save plant identification', error, { userId });
      throw error;
    }
  }

  async getIdentificationHistory(userId: string, limit: number = 20) {
    return PlantIdentificationModel.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  async getIdentificationById(id: string, userId: string) {
    return PlantIdentificationModel.findOne({
      where: { id, userId }
    });
  }

  // Smart dynamic prompting based on user interaction
  async getDetailedPlantInfo(
    plantName: string,
    aspectType: 'cultivation' | 'nutrition' | 'pests' | 'varieties' | 'market',
    region: string = 'kenya'
  ): Promise<StructuredResponse<any>> {
    const prompt = this.buildDetailedInfoPrompt(plantName, aspectType, region);
    
    // For text-only queries, we'll use the model without image
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

  private buildDetailedInfoPrompt(plantName: string, aspectType: string, region: string): string {
    const aspectPrompts = {
      cultivation: `Provide detailed cultivation information for ${plantName} in ${region}, including:
        - Optimal growing conditions and seasons
        - Soil preparation and requirements
        - Planting methods and spacing
        - Fertilization schedules and recommendations
        - Irrigation requirements and timing
        - Common cultivation challenges and solutions
        - Expected yield and harvest timing
        - Post-harvest handling`,
      
      nutrition: `Provide comprehensive nutritional information for ${plantName}, including:
        - Nutritional composition (vitamins, minerals, macronutrients)
        - Health benefits and medicinal properties
        - Preparation methods to maximize nutrition
        - Storage recommendations to preserve nutrients
        - Traditional uses in ${region}
        - Safety considerations and contraindications`,
      
      pests: `Provide detailed pest and disease management information for ${plantName} in ${region}, including:
        - Common pests and their identification
        - Disease symptoms and causes
        - Integrated pest management strategies
        - Organic and chemical control options
        - Prevention methods and best practices
        - Seasonal pest and disease patterns
        - Regional-specific challenges`,
      
      varieties: `Provide information about ${plantName} varieties suitable for ${region}, including:
        - Local/indigenous varieties and their characteristics
        - Improved/hybrid varieties available
        - Variety selection criteria for different conditions
        - Seed sources and availability
        - Performance comparison of varieties
        - Adaptation to local climate conditions`,
      
      market: `Provide market and economic information for ${plantName} in ${region}, including:
        - Current market prices and trends
        - Demand patterns and seasonality
        - Value addition opportunities
        - Storage and transportation considerations
        - Export potential and requirements
        - Marketing channels and strategies
        - Profitability analysis`
    };

    return `${aspectPrompts[aspectType as keyof typeof aspectPrompts]}

Please provide your response in a structured JSON format with clear sections and actionable information.`;
  }
}