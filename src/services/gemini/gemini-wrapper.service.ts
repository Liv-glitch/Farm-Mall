import { IntegratedAnalysisService } from './integrated-analysis.service';
import { GeminiConfig } from './base-gemini.service';
import { logInfo, logError } from '../../utils/logger';

export class GeminiWrapperService {
  private integratedService!: IntegratedAnalysisService;
  private isEnabled: boolean;

  constructor() {
    // Check if Gemini is configured and enabled
    this.isEnabled = !!process.env.GEMINI_API_KEY && process.env.USE_GEMINI === 'true';
    
    if (this.isEnabled) {
      const config: GeminiConfig = {
        apiKey: process.env.GEMINI_API_KEY!,
        model: (process.env.GEMINI_MODEL as any) || 'gemini-2.5-flash',
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.3'),
        topK: parseInt(process.env.GEMINI_TOP_K || '40'),
        topP: parseFloat(process.env.GEMINI_TOP_P || '0.95'),
        maxOutputTokens: parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '8192')
      };
      
      this.integratedService = new IntegratedAnalysisService(config);
      logInfo('🤖 Gemini Wrapper Service initialized', { 
        model: config.model,
        temperature: config.temperature 
      });
    } else {
      logInfo('⚠️ Gemini service disabled - missing API key or USE_GEMINI=false');
    }
  }

  /**
   * Backward compatible plant identification
   * Mimics the exact response structure your frontend expects from Plant.id
   */
  async identifyPlant(
    userId: string,
    file: Express.Multer.File,
    options: {
      latitude?: string | number;
      longitude?: string | number;
      similar_images?: string | boolean;
      plantType?: string;
    } = {}
  ) {
    try {
      if (!this.isEnabled) {
        throw new Error('Gemini service is not enabled');
      }

      // Convert string coordinates to numbers if needed
      const latitude = typeof options.latitude === 'string' ? parseFloat(options.latitude) : options.latitude;
      const longitude = typeof options.longitude === 'string' ? parseFloat(options.longitude) : options.longitude;
      const similarImages = typeof options.similar_images === 'string' ? options.similar_images === 'true' : options.similar_images;

      logInfo('🌱 Processing plant identification with Gemini', {
        userId,
        fileName: file.originalname,
        hasLocation: !!(latitude && longitude),
        plantType: options.plantType
      });

      const result = await this.integratedService.processCompatibleRequest(
        userId,
        file,
        'identification',
        {
          latitude,
          longitude,
          similarImages, 
          plantType: options.plantType
        }
      );

      return result;
      
    } catch (error: any) {
      logError('❌ Gemini plant identification failed', error, { userId });
      
      return {
        success: false,
        message: error.message || 'Plant identification failed',
        data: null,
        provider: 'gemini',
        fallback_available: true
      };
    }
  }

  /**
   * Backward compatible plant health assessment
   * Mimics the exact response structure your frontend expects from Plant.id
   */
  async assessPlantHealth(
    userId: string,
    file: Express.Multer.File,
    options: {
      latitude?: string | number;
      longitude?: string | number;
      similar_images?: string | boolean;
      plantType?: string;
      diseaseDetails?: string;
    } = {}
  ) {
    try {
      if (!this.isEnabled) {
        throw new Error('Gemini service is not enabled');
      }

      const latitude = typeof options.latitude === 'string' ? parseFloat(options.latitude) : options.latitude;
      const longitude = typeof options.longitude === 'string' ? parseFloat(options.longitude) : options.longitude;
      const similarImages = typeof options.similar_images === 'string' ? options.similar_images === 'true' : options.similar_images;

      logInfo('🏥 Processing plant health assessment with Gemini', {
        userId,
        fileName: file.originalname,
        hasLocation: !!(latitude && longitude),
        plantType: options.plantType
      });

      const result = await this.integratedService.processCompatibleRequest(
        userId,
        file,
        'health',
        {
          latitude,
          longitude,
          similarImages,
          plantType: options.plantType
        }
      );

      return result;
      
    } catch (error: any) {
      logError('❌ Gemini plant health assessment failed', error, { userId });
      
      return {
        success: false,
        message: error.message || 'Plant health assessment failed',
        data: null,
        provider: 'gemini',
        fallback_available: true
      };
    }
  }

  /**
   * Soil analysis with PDF processing
   * Returns structured soil analysis data
   */
  async analyzeSoil(
    userId: string,
    file: Express.Multer.File,
    options: {
      farmId?: string;
      cropType?: string;
      region?: string;
      farmSize?: string;
      budget?: 'low' | 'medium' | 'high';
    } = {}
  ) {
    try {
      if (!this.isEnabled) {
        throw new Error('Gemini service is not enabled');
      }

      logInfo('🌱 Processing soil analysis with Gemini', {
        userId,
        fileName: file.originalname,
        farmId: options.farmId,
        cropType: options.cropType
      });

      const result = await this.integratedService.processAnalysisRequest({
        userId,
        file,
        analysisType: 'soil_analysis',
        options: {
          farmId: options.farmId,
          plantType: options.cropType,
          region: options.region || 'kenya'
        }
      });

      if (result.success) {
        return {
          success: true,
          data: {
            // Return both legacy format and new detailed format
            ...result.result,
            // Add metadata from the analysis process
            metadata: {
              analysisId: result.analysisId,
              mediaId: result.mediaId,
              processingTime: result.processingTime,
              confidence: result.confidence,
              modelVersion: result.modelVersion,
              mediaUrls: result.mediaUrls
            }
          }
        };
      } else {
        return {
          success: false,
          message: result.error || 'Soil analysis failed',
          data: null,
          provider: 'gemini'
        };
      }
      
    } catch (error: any) {
      logError('❌ Gemini soil analysis failed', error, { userId });
      
      return {
        success: false,
        message: error.message || 'Soil analysis failed',
        data: null,
        provider: 'gemini'
      };
    }
  }

  /**
   * Get user's analysis history
   */
  async getUserHistory(
    userId: string,
    options: {
      type?: 'plant_identification' | 'plant_health' | 'soil_analysis';
      limit?: number;
      offset?: number;
    } = {}
  ) {
    try {
      if (!this.isEnabled) {
        return {
          success: false,
          message: 'Gemini service is not enabled',
          data: []
        };
      }

      return await this.integratedService.getUserAnalysisHistory(
        userId,
        options.type,
        options.limit || 20,
        options.offset || 0
      );
      
    } catch (error: any) {
      logError('❌ Failed to get user history', error, { userId });
      
      return {
        success: false,
        message: error.message,
        data: []
      };
    }
  }

  /**
   * Get specific analysis result
   */
  async getAnalysis(
    analysisId: string,
    analysisType: 'plant_identification' | 'plant_health' | 'soil_analysis',
    userId: string
  ) {
    try {
      if (!this.isEnabled) {
        return {
          success: false,
          message: 'Gemini service is not enabled'
        };
      }

      return await this.integratedService.getAnalysisById(analysisId, analysisType, userId);
      
    } catch (error: any) {
      logError('❌ Failed to get analysis', error, { analysisId, analysisType, userId });
      
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Health check for Gemini service
   */
  getHealthStatus() {
    return {
      enabled: this.isEnabled,
      provider: 'gemini',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      configured: !!process.env.GEMINI_API_KEY,
      features: {
        plant_identification: this.isEnabled,
        plant_health: this.isEnabled,
        soil_analysis: this.isEnabled,
        image_processing: this.isEnabled,
        document_processing: this.isEnabled
      }
    };
  }

  /**
   * Check if Gemini service is available and enabled
   */
  isAvailable(): boolean {
    return this.isEnabled;
  }

  /**
   * Validate request before processing
   */
  private validateRequest(file: Express.Multer.File, analysisType: string): { valid: boolean; error?: string } {
    if (!file || !file.buffer) {
      return { valid: false, error: 'No file provided' };
    }

    if (analysisType === 'soil_analysis') {
      // For soil analysis, accept PDF and images
      if (!file.mimetype.includes('pdf') && !file.mimetype.includes('image')) {
        return { valid: false, error: 'Soil analysis requires PDF or image files' };
      }
    } else {
      // For plant analysis, only accept images
      if (!file.mimetype.includes('image')) {
        return { valid: false, error: 'Plant analysis requires image files' };
      }
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: 'File size exceeds 10MB limit' };
    }

    return { valid: true };
  }

  /**
   * Process with validation
   */
  async processWithValidation(
    userId: string,
    file: Express.Multer.File,
    analysisType: 'identification' | 'health' | 'soil',
    options: any = {}
  ) {
    // Map analysis types
    const typeMap: Record<string, string> = {
      'identification': 'plant_identification',
      'health': 'plant_health', 
      'soil': 'soil_analysis'
    };

    const mappedType = typeMap[analysisType];
    
    // Validate request
    const validation = this.validateRequest(file, mappedType);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.error,
        data: null
      };
    }

    // Process based on type
    switch (analysisType) {
      case 'identification':
        return this.identifyPlant(userId, file, options);
      case 'health':
        return this.assessPlantHealth(userId, file, options);
      case 'soil':
        return this.analyzeSoil(userId, file, options);
      default:
        return {
          success: false,
          message: 'Invalid analysis type',
          data: null
        };
    }
  }
}

// Export singleton instance
export const geminiWrapper = new GeminiWrapperService();