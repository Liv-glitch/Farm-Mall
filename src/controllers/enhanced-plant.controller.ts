import { Request, Response } from 'express';
import { env } from '../config/environment';
import { logInfo, logError } from '../utils/logger';
import { geminiWrapper } from '../services/gemini/gemini-wrapper.service';
import { SmartYieldCalculatorService } from '../services/gemini/smart-yield-calculator.service';
import { potatoDiseaseDetectionService } from '../services/potato-disease-detection.service';
import { EnterpriseMediaService } from '../services/enterprise-media.service';
import { PlantHealthAssessmentModel } from '../models/PlantHealthAssessment.model';
import { MediaAssociation } from '../models/MediaAssociation.model';
import multer from 'multer';

// Initialize the smart yield calculator service (lazy initialization)
let smartYieldCalculator: SmartYieldCalculatorService | null = null;
const mediaService = new EnterpriseMediaService();

const getSmartYieldCalculator = (): SmartYieldCalculatorService => {
  if (!smartYieldCalculator) {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    smartYieldCalculator = new SmartYieldCalculatorService({
      apiKey: env.GEMINI_API_KEY,
      model: 'gemini-2.5-flash'
    });
  }
  return smartYieldCalculator;
};

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

  // Helper function to download image from URL and create a File-like object
  private async downloadImageFromUrl(imageUrl: string): Promise<Express.Multer.File | null> {
    try {
      logInfo('📥 Downloading image from URL', { imageUrl: imageUrl.substring(0, 100) + '...' });
      
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Create a mock Express.Multer.File object
      const mockFile: Express.Multer.File = {
        fieldname: 'image1',
        originalname: `downloaded-image.${contentType.split('/')[1] || 'jpg'}`,
        encoding: '7bit',
        mimetype: contentType,
        size: buffer.length,
        buffer: buffer,
        destination: '',
        filename: '',
        path: '',
        stream: null as any
      };

      logInfo('✅ Image downloaded successfully', { 
        size: buffer.length, 
        contentType,
        originalname: mockFile.originalname 
      });
      
      return mockFile;
    } catch (error: any) {
      logError('❌ Failed to download image from URL', error, { imageUrl: imageUrl.substring(0, 100) + '...' });
      return null;
    }
  }

  // Enhanced plant identification with Gemini + Plant.id fallback
  public async identify(req: Request, res: Response): Promise<void> {
    try {
      // Log all incoming data for bot debugging
      logInfo('🤖 Enhanced Plant Identify Request Debug', {
        headers: JSON.stringify(req.headers, null, 2),
        body: JSON.stringify(req.body, null, 2),
        query: JSON.stringify(req.query, null, 2),
        hasFile: !!req.file,
        fileInfo: req.file ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : 'No file uploaded',
        userAgent: req.headers['user-agent'],
        contentType: req.headers['content-type']
      });

      const userId = req.user?.id || req.body.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      // Check if image is provided as file upload or URL (for bot integration)
      if (!req.file && !req.body.imageUrl) {
        logInfo('🚨 Bot Request Missing Image - Validation Details', {
          hasFile: !!req.file,
          hasImageUrl: !!req.body.imageUrl,
          bodyKeys: Object.keys(req.body || {}),
          bodyImageUrl: req.body?.imageUrl,
          bodyImage: req.body?.image,
          bodyImage1: req.body?.image1,
          allBodyValues: req.body
        });
        
        res.status(400).json({
          success: false,
          message: 'Image file or imageUrl is required',
          debug: {
            received_body_keys: Object.keys(req.body || {}),
            has_file: !!req.file,
            has_imageUrl: !!req.body.imageUrl
          }
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
        fileName: req.file?.originalname || 'URL provided',
        imageUrl: req.body.imageUrl,
        location: options.location,
        hasCoordinates: !!(options.latitude && options.longitude),
        provider: geminiWrapper.isAvailable() ? 'gemini' : 'plantid'
      });

      let result;

      // Handle image URL by downloading it
      let imageFile: Express.Multer.File | undefined = req.file;
      if (req.body.imageUrl && !req.file) {
        logInfo('🤖 Bot detected - downloading image from URL');
        const downloadedFile = await this.downloadImageFromUrl(req.body.imageUrl);
        if (!downloadedFile) {
          res.status(400).json({
            success: false,
            message: 'Failed to download image from provided URL',
            imageUrl: req.body.imageUrl,
            provider: 'error'
          });
          return;
        }
        imageFile = downloadedFile;
      }

      // Try Gemini first if available (only if we have a file)
      if (geminiWrapper.isAvailable() && imageFile) {
        try {
          result = await geminiWrapper.identifyPlant(userId, imageFile, options);
          
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

      // Fallback to Plant.id API (only if we have a file)
      if (imageFile) {
        const fallbackResult = await this.fallbackToPlantId(imageFile, options);
        
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
      } else {
        res.status(400).json({
          success: false,
          message: 'No valid image source provided'
        });
      }

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
      // Log all incoming data for bot debugging
      logInfo('🤖 Enhanced Plant Health Request Debug', {
        headers: JSON.stringify(req.headers, null, 2),
        body: JSON.stringify(req.body, null, 2),
        query: JSON.stringify(req.query, null, 2),
        hasFile: !!req.file,
        fileInfo: req.file ? {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        } : 'No file uploaded',
        userAgent: req.headers['user-agent'],
        contentType: req.headers['content-type']
      });

      const userId = req.user?.id || req.body.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      // Check if image is provided as file upload or URL (for bot integration)
      if (!req.file && !req.body.imageUrl) {
        res.status(400).json({
          success: false,
          message: 'Image file or imageUrl is required'
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
        fileName: req.file?.originalname || 'URL provided',
        imageUrl: req.body.imageUrl,
        location: options.location,
        plantType: options.plantType
      });

      // Handle image URL by downloading it
      let imageFile: Express.Multer.File | undefined = req.file;
      if (req.body.imageUrl && !req.file) {
        logInfo('🤖 Bot detected - downloading image from URL for health assessment');
        const downloadedFile = await this.downloadImageFromUrl(req.body.imageUrl);
        if (!downloadedFile) {
          res.status(400).json({
            success: false,
            message: 'Failed to download image from provided URL for health assessment',
            imageUrl: req.body.imageUrl,
            provider: 'error'
          });
          return;
        }
        imageFile = downloadedFile;
      }

      if (!imageFile) {
        res.status(400).json({
          success: false,
          message: 'No valid image source provided for health assessment'
        });
        return;
      }

      const diagnosis = await potatoDiseaseDetectionService.diagnose(imageFile, {
        latitude: options.latitude,
        longitude: options.longitude,
        plantType: options.plantType || 'potato',
        location: options.location,
        symptoms: options.diseaseDetails
      });

      if (!diagnosis.success || !diagnosis.data) {
        res.status(502).json({
          success: false,
          message: diagnosis.error || 'Plant health assessment failed',
          provider: diagnosis.provider
        });
        return;
      }

      const mediaContext = {
        category: 'plant-health',
        subcategory: 'diagnosis',
        contextId: userId
      };

      const uploadedMedia = await mediaService.uploadMedia(userId, imageFile, {
        context: mediaContext,
        generateVariants: true,
        isPublic: false,
        metadata: {
          analysisType: 'plant_health',
          provider: diagnosis.provider,
          model: diagnosis.model,
          location: options.location,
          plantType: options.plantType || 'potato'
        }
      });

      const assessment = await PlantHealthAssessmentModel.create({
        userId,
        imageUrl: uploadedMedia.publicUrl || '',
        thumbnailUrl: this.getThumbnailUrl(uploadedMedia) || '',
        originalFilename: uploadedMedia.originalName,
        latitude: options.latitude ? parseFloat(options.latitude) : undefined,
        longitude: options.longitude ? parseFloat(options.longitude) : undefined,
        healthAssessmentResult: diagnosis.data as any,
        isHealthy: diagnosis.data.healthStatus?.isHealthy,
        diseases: diagnosis.data.diseases as any,
        treatmentSuggestions: diagnosis.data.treatmentPriority as any,
        providerMetadata: diagnosis.providerMetadata as any
      });

      await mediaService.associateMedia(uploadedMedia.id!, {
        associatableType: 'PlantHealthAssessment',
        associatableId: assessment.id,
        role: 'primary',
        context: mediaContext
      });

      const responseData = {
        ...diagnosis.data,
        analysisId: assessment.id,
        mediaId: uploadedMedia.id
      };

      res.json({
        success: true,
        data: responseData,
        provider: diagnosis.provider,
        model: diagnosis.model,
        enhanced_features: {
          treatment_prioritization: true,
          cost_effective_solutions: true,
          preventive_measures: true,
          regional_disease_patterns: true
        },
        metadata: {
          analysisId: assessment.id,
          mediaId: uploadedMedia.id,
          confidence: diagnosis.confidence,
          providerMetadata: diagnosis.providerMetadata,
          mediaUrls: {
            original: uploadedMedia.publicUrl,
            thumbnail: this.getThumbnailUrl(uploadedMedia),
            variants: this.getVariantUrls(uploadedMedia)
          }
        }
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

      if (!env.GEMINI_API_KEY) {
        res.status(503).json({
          success: false,
          message: 'Yield calculator API key not configured'
        });
        return;
      }

      try {
        logInfo('🤖 Initializing Smart Yield Calculator...');
        const calculator = getSmartYieldCalculator();
        
        logInfo('📊 Starting yield calculation with Gemini AI...');
        const result = await calculator.calculateYield(inputs);
        
        logInfo('✅ Yield calculation completed', { success: result.success });
        
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
      
      } catch (calculationError: any) {
        logError('Smart Yield Calculator failed', calculationError);
        res.status(500).json({
          success: false,
          message: 'Yield calculation failed',
          error: calculationError.message
        });
        return;
      }

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

      if (!options.type || options.type === 'plant_health') {
        const healthRecords = await PlantHealthAssessmentModel.findAll({
          where: { userId },
          order: [['createdAt', 'DESC']],
          limit: options.limit,
          offset: options.offset
        });

        const records = [];
        for (const record of healthRecords) {
          const media = await mediaService.getMediaByAssociation('PlantHealthAssessment', record.id, 'primary');
          records.push(this.formatPlantHealthRecord(record, media[0] || null));
        }

        res.json({
          success: true,
          data: records,
          records,
          total: records.length,
          message: 'History retrieved successfully'
        });
        return;
      }

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

  public async getAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.query.userId as string;
      const analysisId = req.params.id;
      const type = req.query.type as string;

      if (!userId) {
        res.status(401).json({ success: false, message: 'User authentication required' });
        return;
      }

      if (type !== 'plant_health') {
        const result = await geminiWrapper.getAnalysis(analysisId, type as any, userId);
        res.status(result.success ? 200 : 404).json(result);
        return;
      }

      const record = await PlantHealthAssessmentModel.findOne({ where: { id: analysisId, userId } });
      if (!record) {
        res.status(404).json({ success: false, message: 'Analysis not found' });
        return;
      }

      const media = await mediaService.getMediaByAssociation('PlantHealthAssessment', record.id, 'primary');
      res.json({
        success: true,
        data: this.formatPlantHealthRecord(record, media[0] || null)
      });
    } catch (error: any) {
      logError('Failed to get analysis', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get analysis',
        error: error.message
      });
    }
  }

  public async updateAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.body.userId;
      const analysisId = req.params.id;
      const type = req.body.type || req.query.type;

      if (!userId) {
        res.status(401).json({ success: false, message: 'User authentication required' });
        return;
      }

      if (type !== 'plant_health') {
        res.status(400).json({ success: false, message: 'Only plant_health notes can be updated here' });
        return;
      }

      const record = await PlantHealthAssessmentModel.findOne({ where: { id: analysisId, userId } });
      if (!record) {
        res.status(404).json({ success: false, message: 'Analysis not found' });
        return;
      }

      const notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : null;
      await record.update({ notes });

      res.json({
        success: true,
        message: 'Analysis updated successfully',
        data: {
          id: record.id,
          notes
        }
      });
    } catch (error: any) {
      logError('Failed to update analysis', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update analysis',
        error: error.message
      });
    }
  }

  public async deleteAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.query.userId as string;
      const analysisId = req.params.id;
      const type = req.query.type as string;

      if (!userId) {
        res.status(401).json({ success: false, message: 'User authentication required' });
        return;
      }

      if (type !== 'plant_health') {
        res.status(400).json({ success: false, message: 'Only plant_health analyses can be deleted here' });
        return;
      }

      const record = await PlantHealthAssessmentModel.findOne({ where: { id: analysisId, userId } });
      if (!record) {
        res.status(404).json({ success: false, message: 'Analysis not found' });
        return;
      }

      await MediaAssociation.destroy({
        where: {
          associatableType: 'PlantHealthAssessment',
          associatableId: record.id
        }
      });
      await record.destroy();

      res.json({
        success: true,
        message: 'Analysis deleted successfully'
      });
    } catch (error: any) {
      logError('Failed to delete analysis', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete analysis',
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

  private getThumbnailUrl(media: any): string | undefined {
    if (Array.isArray(media?.variants)) {
      return media.variants.find((variant: any) => variant.size === 'thumbnail')?.url;
    }
    return undefined;
  }

  private getVariantUrls(media: any): Array<{ size: string; url: string }> {
    if (!Array.isArray(media?.variants)) return [];
    return media.variants.map((variant: any) => ({
      size: variant.size,
      url: variant.url
    }));
  }

  private formatPlantHealthRecord(record: any, media: any) {
    return {
      id: record.id,
      type: 'plant_health',
      result: record.healthAssessmentResult,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      isHealthy: record.isHealthy,
      notes: record.notes,
      providerMetadata: record.providerMetadata,
      media
    };
  }
}

export const enhancedPlantController = new EnhancedPlantController();
