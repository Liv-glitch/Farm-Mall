import { Request, Response } from 'express';
import { env } from '../config/environment';
import { logInfo, logError } from '../utils/logger';
import { geminiWrapper } from '../services/gemini/gemini-wrapper.service';
import { smartYieldCalculator } from '../services/gemini/smart-yield-calculator.service';
import multer from 'multer';

// Configure multer for memory storage (better for Gemini integration)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.'));
    }
  }
});

export class EnhancedPlantController {
  public uploadMiddleware = upload.single('image1');
  public uploadSoilMiddleware = upload.single('document');

  // Enhanced plant identification with Gemini + Plant.id fallback
  public async identify(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.body.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Image file is required'
        });
        return;
      }

      // Extract request parameters
      const options = {
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        similar_images: req.body.similar_images || 'true',
        plantType: req.body.plant_type || req.body.plantType,
        location: req.body.location || 'Central Kenya', // User-provided location
        region: req.body.region || 'kenya'
      };

      logInfo('🌱 Processing plant identification request', {
        userId,
        fileName: req.file.originalname,
        location: options.location,
        hasCoordinates: !!(options.latitude && options.longitude),
        provider: geminiWrapper.isAvailable() ? 'gemini' : 'plantid'
      });

      let result;

      // Try Gemini first if available
      if (geminiWrapper.isAvailable()) {
        try {
          result = await geminiWrapper.identifyPlant(userId, req.file, options);
          
          // If Gemini succeeds, return enhanced response
          if (result.success) {
            res.json({
              success: true,
              data: result.data,
              provider: 'gemini',
              enhanced_features: {
                cultivation_tips: true,
                regional_varieties: true,
                market_info: true,
                seasonal_guidance: true
              },
              metadata: (result as any).metadata
            });
            return;
          }
        } catch (geminiError: any) {
          logError('Gemini identification failed, falling back to Plant.id', geminiError, { userId });
        }
      }

      // Fallback to Plant.id API (your existing logic)
      const fallbackResult = await this.fallbackToPlantId(req.file, options);
      
      res.json({
        success: fallbackResult.success,
        data: fallbackResult.data,
        provider: 'plantid',
        fallback_reason: result?.message || 'Gemini unavailable',
        enhanced_features: {
          cultivation_tips: false,
          regional_varieties: false,
          market_info: false,
          seasonal_guidance: false
        }
      });

    } catch (error: any) {
      logError('Plant identification failed', error);
      
      res.status(500).json({
        success: false,
        message: 'Plant identification failed',
        error: error.message
      });
    }
  }

  // Enhanced plant health assessment
  public async assessHealth(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.body.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Image file is required'
        });
        return;
      }

      const options = {
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        similar_images: req.body.similar_images || 'true',
        plantType: req.body.plant_type || req.body.plantType,
        location: req.body.location || 'Central Kenya',
        diseaseDetails: req.body.disease_details || req.body.symptoms
      };

      logInfo('🏥 Processing plant health assessment', {
        userId,
        fileName: req.file.originalname,
        location: options.location,
        plantType: options.plantType
      });

      let result;

      // Try Gemini first
      if (geminiWrapper.isAvailable()) {
        result = await geminiWrapper.assessPlantHealth(userId, req.file, options);
        
        if (result.success) {
          res.json({
            success: true,
            data: result.data,
            provider: 'gemini',
            enhanced_features: {
              treatment_prioritization: true,
              cost_effective_solutions: true,
              preventive_measures: true,
              regional_disease_patterns: true
            },
            metadata: (result as any).metadata
          });
          return;
        }
      }

      // Fallback to Plant.id health API
      const fallbackResult = await this.fallbackToPlantIdHealth(req.file, options);
      
      res.json({
        success: fallbackResult.success,
        data: fallbackResult.data || null,
        provider: 'plantid',
        fallback_reason: result?.message || 'Gemini unavailable'
      });

    } catch (error: any) {
      logError('Plant health assessment failed', error);
      
      res.status(500).json({
        success: false,
        message: 'Plant health assessment failed',
        error: error.message
      });
    }
  }

  // Soil analysis with PDF processing
  public async analyzeSoil(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.body.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Document file is required'
        });
        return;
      }

      const options = {
        farmId: req.body.farm_id || req.body.farmId,
        cropType: req.body.crop_type || req.body.cropType,
        location: req.body.location || 'Central Kenya',
        farmSize: req.body.farm_size || req.body.farmSize,
        budget: req.body.budget || 'medium'
      };

      logInfo('🌱 Processing soil analysis', {
        userId,
        fileName: req.file.originalname,
        location: options.location,
        cropType: options.cropType
      });

      if (!geminiWrapper.isAvailable()) {
        res.status(503).json({
          success: false,
          message: 'Soil analysis service temporarily unavailable'
        });
        return;
      }

      const result = await geminiWrapper.analyzeSoil(userId, req.file, options);
      
      res.json({
        success: result.success,
        data: result.data,
        message: result.success ? 'Soil analysis completed' : result.message,
        provider: 'gemini',
        features: {
          detailed_recommendations: true,
          fertilizer_planning: true,
          crop_suitability: true,
          cost_analysis: true
        }
      });

    } catch (error: any) {
      logError('Soil analysis failed', error);
      
      res.status(500).json({
        success: false,
        message: 'Soil analysis failed',
        error: error.message
      });
    }
  }

  // Yield calculation and prediction
  public async calculateYield(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.body.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      // Validate required inputs
      const requiredFields = ['cropType', 'farmSize', 'location'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
        return;
      }

      const inputs = {
        cropType: req.body.cropType,
        variety: req.body.variety,
        farmSize: parseFloat(req.body.farmSize),
        location: req.body.location,
        soilData: req.body.soilData,
        farmingSystem: req.body.farmingSystem || 'mixed',
        irrigationType: req.body.irrigationType || 'rainfed',
        fertilizationLevel: req.body.fertilizationLevel || 'medium',
        pestManagement: req.body.pestManagement || 'ipm',
        season: req.body.season || 'main',
        inputBudget: parseFloat(req.body.inputBudget || 0),
        targetMarket: req.body.targetMarket || 'local',
        previousYields: req.body.previousYields
      };

      logInfo('📊 Processing yield calculation', {
        userId,
        cropType: inputs.cropType,
        farmSize: inputs.farmSize,
        location: inputs.location
      });

      if (!geminiWrapper.isAvailable()) {
        res.status(503).json({
          success: false,
          message: 'Yield calculator service temporarily unavailable'
        });
        return;
      }

      const result = await smartYieldCalculator.calculateYield(inputs);
      
      res.json({
        success: result.success,
        data: result.data,
        message: result.success ? 'Yield calculation completed' : result.error,
        provider: 'gemini',
        processing_time: result.processingTime,
        features: {
          economic_analysis: true,
          risk_assessment: true,
          optimization_recommendations: true,
          seasonal_calendar: true
        }
      });

    } catch (error: any) {
      logError('Yield calculation failed', error);
      
      res.status(500).json({
        success: false,
        message: 'Yield calculation failed',
        error: error.message
      });
    }
  }

  // Get user's analysis history
  public async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.query.userId as string;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const options = {
        type: req.query.type as any,
        limit: parseInt(req.query.limit as string) || 20,
        offset: parseInt(req.query.offset as string) || 0
      };

      const result = await geminiWrapper.getUserHistory(userId, options);
      
      res.json({
        success: result.success,
        data: result.data,
        total: result.data?.length || 0,
        message: result.success ? 'History retrieved successfully' : (result as any).message || 'Failed to retrieve history'
      });

    } catch (error: any) {
      logError('Failed to get user history', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve history',
        error: error.message
      });
    }
  }

  // Service health check
  public async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      const status = geminiWrapper.getHealthStatus();
      
      res.json({
        success: true,
        status,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: error.message
      });
    }
  }

  // Fallback methods for Plant.id API
  private async fallbackToPlantId(file: Express.Multer.File, options: any) {
    // Your existing Plant.id implementation logic here
    // This is a simplified version - use your actual Plant.id code
    const apiKey = env.PLANTID_API_KEY;
    if (!apiKey) {
      throw new Error('Plant.id API key not configured');
    }

    const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    
    const url = 'https://plant.id/api/v3/identification?' + 
      'details=common_names,url,description,taxonomy,rank,gbif_id,inaturalist_id,image,synonyms,edible_parts,watering,propagation_methods&' +
      'language=en';

    const requestBody = {
      images: [base64Image],
      similar_images: options.similar_images === 'true',
      latitude: parseFloat(options.latitude || '0'),
      longitude: parseFloat(options.longitude || '0')
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Plant.id API error: ${response.status}`);
    }

    const responseData = await response.json();
    return {
      success: true,
      data: responseData
    };
  }

  private async fallbackToPlantIdHealth(_file: Express.Multer.File, _options: any) {
    // Similar implementation for Plant.id health API
    // Use your existing health assessment logic
    return {
      success: false,
      message: 'Plant.id health API fallback not implemented',
      data: null
    };
  }
}

export const enhancedPlantController = new EnhancedPlantController();