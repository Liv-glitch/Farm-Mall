import { EnterpriseMediaService } from '../enterprise-media.service';
import { PlantIdentificationService } from './plant-identification.service';
import { PlantHealthService } from './plant-health.service';
import { SoilAnalysisService } from './soil-analysis.service';
import { GeminiConfig } from './base-gemini.service';
import { PlantIdentificationModel } from '../../models/PlantIdentification.model';
import { PlantHealthAssessmentModel } from '../../models/PlantHealthAssessment.model';
import { SoilTestModel } from '../../models/SoilTest.model';
import { MediaContext } from '../../models/Media.model';
import { logInfo, logError } from '../../utils/logger';

export interface AnalysisRequest {
  userId: string;
  file: Express.Multer.File;
  analysisType: 'plant_identification' | 'plant_health' | 'soil_analysis';
  options?: {
    location?: { latitude: number; longitude: number };
    plantType?: string;
    cropStage?: string;
    region?: string;
    season?: string;
    farmId?: string;
    additionalContext?: string;
  };
}

export interface AnalysisResponse {
  success: boolean;
  analysisId: string;
  mediaId: string;
  analysisType: string;
  result?: any;
  confidence?: number;
  processingTime: number;
  modelVersion: string;
  error?: string;
  mediaUrls: {
    original: string;
    thumbnail?: string;
    variants?: Array<{
      size: string;
      url: string;
    }>;
  };
}

export class IntegratedAnalysisService {
  private mediaService: EnterpriseMediaService;
  private plantIdService: PlantIdentificationService;
  private plantHealthService: PlantHealthService;
  private soilAnalysisService: SoilAnalysisService;

  constructor(geminiConfig: GeminiConfig) {
    this.mediaService = new EnterpriseMediaService();
    this.plantIdService = new PlantIdentificationService(geminiConfig);
    this.plantHealthService = new PlantHealthService(geminiConfig);
    this.soilAnalysisService = new SoilAnalysisService(geminiConfig);
  }

  async processAnalysisRequest(request: AnalysisRequest): Promise<AnalysisResponse> {
    const startTime = Date.now();
    
    try {
      // 1. Upload media using enterprise media service
      const mediaContext = this.createMediaContext(request);
      const uploadedMedia = await this.mediaService.uploadMedia(
        request.userId,
        request.file,
        {
          context: mediaContext,
          generateVariants: request.analysisType !== 'soil_analysis', // Only generate variants for images
          isPublic: false,
          metadata: {
            analysisType: request.analysisType,
            uploadedFor: 'ai_analysis',
            ...request.options
          }
        }
      );

      logInfo('📁 Media uploaded for analysis', {
        mediaId: uploadedMedia.id,
        analysisType: request.analysisType,
        userId: request.userId,
        fileName: uploadedMedia.fileName
      });

      // 2. Perform AI analysis based on type
      let analysisResult: any;
      let analysisRecord: any;
      
      switch (request.analysisType) {
        case 'plant_identification':
          analysisResult = await this.plantIdService.identifyPlant(
            request.file.buffer,
            {
              location: request.options?.location,
              plantType: request.options?.plantType as any,
              focusRegion: (request.options?.region as any) || 'kenya',
              includeUsageInfo: true,
              includeCultivationInfo: true,
              additionalContext: request.options?.additionalContext
            }
          );

          if (analysisResult.success) {
            analysisRecord = await this.plantIdService.saveIdentificationResult(
              request.userId,
              uploadedMedia.publicUrl!,
              this.getThumbnailUrl(uploadedMedia) || '',
              uploadedMedia.originalName,
              analysisResult.data,
              request.options?.location
            );
          }
          break;

        case 'plant_health':
          analysisResult = await this.plantHealthService.assessPlantHealth(
            request.file.buffer,
            {
              location: request.options?.location,
              plantType: request.options?.plantType,
              cropStage: request.options?.cropStage as any,
              region: request.options?.region,
              season: request.options?.season,
              additionalContext: request.options?.additionalContext
            }
          );

          if (analysisResult.success) {
            analysisRecord = await this.plantHealthService.saveHealthAssessment(
              request.userId,
              uploadedMedia.publicUrl!,
              this.getThumbnailUrl(uploadedMedia) || '',
              uploadedMedia.originalName,
              analysisResult.data,
              request.options?.location
            );
          }
          break;

        case 'soil_analysis':
          // For soil analysis, we'll process immediately since it's a document
          analysisResult = await this.soilAnalysisService.analyzeImmediately(
            request.file.buffer,
            {
              region: request.options?.region,
              cropType: request.options?.plantType,
              farmSize: '1-5 acres', // Default, could be passed in options
              budget: 'medium',
              additionalContext: request.options?.additionalContext
            }
          );

          if (analysisResult.success) {
            // Create soil test record directly
            analysisRecord = await SoilTestModel.create({
              userId: request.userId,
              farmId: request.options?.farmId,
              documentUrl: uploadedMedia.publicUrl!,
              thumbnailUrl: this.getThumbnailUrl(uploadedMedia),
              originalFilename: uploadedMedia.originalName,
              analysisResult: this.convertSoilAnalysisToLegacyFormat(analysisResult.data),
              status: 'analyzed',
              aiModelVersion: analysisResult.modelVersion
            });
          }
          break;

        default:
          throw new Error(`Unsupported analysis type: ${request.analysisType}`);
      }

      // 3. Associate media with analysis record if analysis succeeded
      if (analysisResult.success && analysisRecord) {
        await this.mediaService.associateMedia(uploadedMedia.id!, {
          associatableType: this.getAssociatableType(request.analysisType),
          associatableId: analysisRecord.id,
          role: 'primary',
          context: mediaContext
        });

        logInfo('🔗 Media associated with analysis record', {
          mediaId: uploadedMedia.id,
          analysisType: request.analysisType,
          analysisId: analysisRecord.id
        });
      }

      // 4. Prepare response
      const processingTime = Date.now() - startTime;
      
      const response: AnalysisResponse = {
        success: analysisResult.success,
        analysisId: analysisRecord?.id || 'failed',
        mediaId: uploadedMedia.id!,
        analysisType: request.analysisType,
        result: analysisResult.data,
        confidence: analysisResult.data?.confidence || analysisResult.data?.healthStatus?.confidence,
        processingTime,
        modelVersion: analysisResult.modelVersion || 'unknown',
        error: analysisResult.error,
        mediaUrls: {
          original: uploadedMedia.publicUrl!,
          thumbnail: this.getThumbnailUrl(uploadedMedia),
          variants: this.getVariantUrls(uploadedMedia)
        }
      };

      logInfo('✅ Analysis request processed successfully', {
        analysisType: request.analysisType,
        userId: request.userId,
        processingTime,
        success: response.success,
        confidence: response.confidence
      });

      return response;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      logError('❌ Analysis request failed', error, {
        analysisType: request.analysisType,
        userId: request.userId,
        processingTime
      });

      return {
        success: false,
        analysisId: 'error',
        mediaId: 'error',
        analysisType: request.analysisType,
        processingTime,
        modelVersion: 'unknown',
        error: error.message,
        mediaUrls: {
          original: ''
        }
      };
    }
  }

  // Backward compatible method that mimics Plant.id API response
  async processCompatibleRequest(
    userId: string,
    file: Express.Multer.File,
    analysisType: 'identification' | 'health',
    options: {
      latitude?: number;
      longitude?: number;
      similarImages?: boolean;
      plantType?: string;
    } = {}
  ) {
    const request: AnalysisRequest = {
      userId,
      file,
      analysisType: analysisType === 'identification' ? 'plant_identification' : 'plant_health',
      options: {
        location: options.latitude && options.longitude ? {
          latitude: options.latitude,
          longitude: options.longitude
        } : undefined,
        plantType: options.plantType,
        region: 'kenya'
      }
    };

    const result = await this.processAnalysisRequest(request);

    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Analysis failed',
        data: null
      };
    }

    // Convert to Plant.id compatible format using the base service method
    let compatibleData;
    if (analysisType === 'identification') {
      compatibleData = this.plantIdService['convertToPlantIdFormat'](result.result, 'identification');
    } else {
      compatibleData = this.plantHealthService['convertToPlantIdFormat'](result.result, 'health');
    }

    return {
      success: true,
      data: compatibleData,
      metadata: {
        analysisId: result.analysisId,
        mediaId: result.mediaId,
        processingTime: result.processingTime,
        confidence: result.confidence,
        mediaUrls: result.mediaUrls
      }
    };
  }

  async getUserAnalysisHistory(
    userId: string,
    analysisType?: 'plant_identification' | 'plant_health' | 'soil_analysis',
    limit: number = 20,
    offset: number = 0
  ) {
    try {
      const history: any[] = [];

      if (!analysisType || analysisType === 'plant_identification') {
        const plantIds = await PlantIdentificationModel.findAll({
          where: { userId },
          order: [['createdAt', 'DESC']],
          limit: analysisType ? limit : Math.floor(limit / 3),
          offset: analysisType ? offset : 0
        });

        for (const record of plantIds) {
          const mediaAssociations = await this.mediaService.getMediaByAssociation(
            'PlantIdentification',
            record.id,
            'primary'
          );

          history.push({
            id: record.id,
            type: 'plant_identification',
            result: record.identificationResult,
            createdAt: record.createdAt,
            confidence: record.confidenceScore,
            media: mediaAssociations[0] || null
          });
        }
      }

      if (!analysisType || analysisType === 'plant_health') {
        const healthRecords = await PlantHealthAssessmentModel.findAll({
          where: { userId },
          order: [['createdAt', 'DESC']],
          limit: analysisType ? limit : Math.floor(limit / 3),
          offset: analysisType ? offset : 0
        });

        for (const record of healthRecords) {
          const mediaAssociations = await this.mediaService.getMediaByAssociation(
            'PlantHealthAssessment',
            record.id,
            'primary'
          );

          history.push({
            id: record.id,
            type: 'plant_health',
            result: record.healthAssessmentResult,
            createdAt: record.createdAt,
            isHealthy: record.isHealthy,
            media: mediaAssociations[0] || null
          });
        }
      }

      if (!analysisType || analysisType === 'soil_analysis') {
        const soilTests = await SoilTestModel.findAll({
          where: { userId },
          order: [['createdAt', 'DESC']],
          limit: analysisType ? limit : Math.floor(limit / 3),
          offset: analysisType ? offset : 0
        });

        for (const record of soilTests) {
          const mediaAssociations = await this.mediaService.getMediaByAssociation(
            'SoilTest',
            record.id,
            'primary'
          );

          history.push({
            id: record.id,
            type: 'soil_analysis',
            result: record.analysisResult,
            status: record.status,
            createdAt: record.createdAt,
            media: mediaAssociations[0] || null
          });
        }
      }

      // Sort by creation date
      history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return {
        success: true,
        data: history.slice(0, limit),
        total: history.length
      };

    } catch (error: any) {
      logError('Failed to get user analysis history', error, { userId, analysisType });
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  async getAnalysisById(
    analysisId: string,
    analysisType: 'plant_identification' | 'plant_health' | 'soil_analysis',
    userId: string
  ) {
    try {
      let record: any;
      let modelClass: string;

      switch (analysisType) {
        case 'plant_identification':
          record = await PlantIdentificationModel.findOne({
            where: { id: analysisId, userId }
          });
          modelClass = 'PlantIdentification';
          break;
        case 'plant_health':
          record = await PlantHealthAssessmentModel.findOne({
            where: { id: analysisId, userId }
          });
          modelClass = 'PlantHealthAssessment';
          break;
        case 'soil_analysis':
          record = await SoilTestModel.findOne({
            where: { id: analysisId, userId }
          });
          modelClass = 'SoilTest';
          break;
        default:
          throw new Error('Invalid analysis type');
      }

      if (!record) {
        return {
          success: false,
          error: 'Analysis not found'
        };
      }

      // Get associated media
      const mediaAssociations = await this.mediaService.getMediaByAssociation(
        modelClass,
        record.id,
        'primary'
      );

      return {
        success: true,
        data: {
          id: record.id,
          type: analysisType,
          result: record.identificationResult || record.healthAssessmentResult || record.analysisResult,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          confidence: record.confidenceScore,
          isHealthy: record.isHealthy,
          status: record.status,
          media: mediaAssociations[0] || null
        }
      };

    } catch (error: any) {
      logError('Failed to get analysis by ID', error, { analysisId, analysisType, userId });
      return {
        success: false,
        error: error.message
      };
    }
  }

  private createMediaContext(request: AnalysisRequest): MediaContext {
    const categoryMap = {
      'plant_identification': 'plant-analysis',
      'plant_health': 'plant-health',
      'soil_analysis': 'soil-analysis'
    };

    return {
      category: categoryMap[request.analysisType],
      subcategory: 'ai-analysis',
      contextId: request.userId,
      entityId: request.options?.farmId
    };
  }

  private getAssociatableType(analysisType: string): string {
    const typeMap = {
      'plant_identification': 'PlantIdentification',
      'plant_health': 'PlantHealthAssessment', 
      'soil_analysis': 'SoilTest'
    };
    return typeMap[analysisType as keyof typeof typeMap];
  }

  private getThumbnailUrl(media: any): string | undefined {
    if (media.variants && media.variants.length > 0) {
      const thumbnail = media.variants.find((v: any) => v.size === 'thumbnail');
      return thumbnail?.url;
    }
    return undefined;
  }

  private getVariantUrls(media: any): Array<{ size: string; url: string }> {
    if (media.variants && media.variants.length > 0) {
      return media.variants.map((v: any) => ({
        size: v.size,
        url: v.url
      }));
    }
    return [];
  }

  private convertSoilAnalysisToLegacyFormat(analysis: any): any {
    // Convert the new detailed soil analysis to the legacy format expected by existing models
    return {
      ph: analysis.basicProperties?.ph,
      nitrogen: analysis.nutrients?.macronutrients?.nitrogen?.available,
      phosphorus: analysis.nutrients?.macronutrients?.phosphorus?.available,
      potassium: analysis.nutrients?.macronutrients?.potassium?.available,
      organicMatter: analysis.basicProperties?.organicMatter,
      texture: analysis.physicalProperties?.texture?.textureClass,
      recommendations: [
        ...(analysis.fertilizationPlan?.immediate || []).map((item: any) => ({
          type: 'fertilizer',
          description: `Apply ${item.product}: ${item.amount} ${item.application}`,
          priority: 'high'
        })),
        ...(analysis.soilImprovement?.amendments || []).map((item: any) => ({
          type: 'amendment',
          description: `${item.material}: ${item.amount} ${item.frequency}`,
          priority: 'medium'
        }))
      ],
      suitableCrops: (analysis.cropRecommendations || []).map((crop: any) => ({
        cropType: crop.cropType,
        suitabilityScore: crop.suitabilityScore / 100,
        notes: crop.specificRecommendations?.join('. ') || ''
      })),
      // Store the full detailed analysis for future use
      detailedAnalysis: analysis
    };
  }
}