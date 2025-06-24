import { PestAnalysisRequest, PestAnalysisResponse } from '../types/ai.types';
import { ERROR_CODES, CACHE_KEYS } from '../utils/constants';
import { redisClient } from '../config/redis';
import logger, { logError, logInfo } from '../utils/logger';
import { ImageProcessingService } from './imageProcessing.service';

export interface PestAnalysisHistory {
  id: string;
  userId: string;
  imageUrl: string;
  analysis: PestAnalysisResponse;
  createdAt: Date;
}

export class PestAnalysisService {
  private readonly CACHE_DURATION = 24 * 60 * 60; // 24 hours
  private imageProcessingService: ImageProcessingService;

  constructor() {
    this.imageProcessingService = new ImageProcessingService();
  }

  // Analyze pest and diseases in image
  async analyzePestInImage(request: PestAnalysisRequest): Promise<PestAnalysisResponse> {
    try {
      // Validate image
      await this.validateImage(request.imageUrl);

      // Process image for AI analysis
      const processedImage = await this.imageProcessingService.preprocessForAI(request.imageUrl);

      // Get analysis from AI model
      const analysis = await this.performAIAnalysis(processedImage, request.cropType);

      // Add contextual recommendations
      const response: PestAnalysisResponse = {
        ...analysis,
        recommendations: this.generateRecommendations(analysis),
        confidence: this.calculateOverallConfidence(analysis),
        metadata: {
          processingTime: Date.now() - request.timestamp.getTime(),
          imageSize: await this.imageProcessingService.getImageSize(request.imageUrl),
          modelVersion: '1.0.0',
        },
      };

      // Cache the analysis
      if (request.userId) {
        await this.cacheAnalysis(request.userId, request, response);
      }

      logInfo('Pest analysis completed', {
        userId: request.userId,
        cropType: request.cropType,
        confidence: response.confidence,
        pestsFound: response.detectedPests?.length || 0,
        diseasesFound: response.detectedDiseases?.length || 0,
      });

      return response;
    } catch (error) {
      logError('Pest analysis failed', error as Error, request);
      throw new Error(ERROR_CODES.AI_SERVICE_UNAVAILABLE);
    }
  }

  // Get analysis history for user
  async getAnalysisHistory(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<{
    analyses: PestAnalysisHistory[];
    total: number;
  }> {
    try {
      // TODO: Implement database storage for analysis history
      // For now, return empty results
      logInfo('Analysis history retrieved', { userId, limit, offset });
      
      return {
        analyses: [],
        total: 0,
      };
    } catch (error) {
      logError('Failed to get analysis history', error as Error, { userId });
      throw error;
    }
  }

  // Get pest statistics for region
  async getPestStatistics(county: string, subCounty?: string): Promise<{
    commonPests: Array<{
      name: string;
      scientificName: string;
      frequency: number;
      severity: string;
    }>;
    seasonalTrends: Array<{
      month: string;
      pestCount: number;
      diseaseCount: number;
    }>;
    riskLevel: string;
  }> {
    try {
      // TODO: Implement actual statistics from database
      // For now, return sample data for Kenya potato farming
      const commonPests = [
        {
          name: 'Potato Tuber Moth',
          scientificName: 'Phthorimaea operculella',
          frequency: 45,
          severity: 'high',
        },
        {
          name: 'Aphids',
          scientificName: 'Myzus persicae',
          frequency: 38,
          severity: 'moderate',
        },
        {
          name: 'Colorado Potato Beetle',
          scientificName: 'Leptinotarsa decemlineata',
          frequency: 22,
          severity: 'high',
        },
      ];

      const seasonalTrends = [
        { month: 'Jan', pestCount: 12, diseaseCount: 8 },
        { month: 'Feb', pestCount: 15, diseaseCount: 10 },
        { month: 'Mar', pestCount: 25, diseaseCount: 18 },
        { month: 'Apr', pestCount: 35, diseaseCount: 25 },
        { month: 'May', pestCount: 28, diseaseCount: 20 },
        { month: 'Jun', pestCount: 20, diseaseCount: 15 },
        { month: 'Jul', pestCount: 18, diseaseCount: 12 },
        { month: 'Aug', pestCount: 22, diseaseCount: 16 },
        { month: 'Sep', pestCount: 30, diseaseCount: 22 },
        { month: 'Oct', pestCount: 32, diseaseCount: 24 },
        { month: 'Nov', pestCount: 28, diseaseCount: 20 },
        { month: 'Dec', pestCount: 20, diseaseCount: 14 },
      ];

      const currentMonth = new Date().getMonth();
      const currentTrend = seasonalTrends[currentMonth];
      const riskLevel = currentTrend.pestCount > 25 ? 'high' : 
                       currentTrend.pestCount > 15 ? 'moderate' : 'low';

      logInfo('Pest statistics retrieved', { county, subCounty, riskLevel });

      return {
        commonPests,
        seasonalTrends,
        riskLevel,
      };
    } catch (error) {
      logError('Failed to get pest statistics', error as Error, { county, subCounty });
      throw error;
    }
  }

  // Private methods
  private async validateImage(imageUrl: string): Promise<void> {
    const isValid = await this.imageProcessingService.validateImage(imageUrl);
    if (!isValid) {
      throw new Error(ERROR_CODES.INVALID_FILE_TYPE);
    }
  }

  private async performAIAnalysis(_imageData: any, _cropType: string): Promise<Partial<PestAnalysisResponse>> {
    // TODO: Integrate with actual AI/ML models (TensorFlow, PyTorch, etc.)
    // For now, return mock analysis
    
    const mockPests = [
      {
        name: 'Potato Tuber Moth',
        scientificName: 'Phthorimaea operculella',
        confidence: 0.85,
        severity: 'moderate' as const,
        description: 'Common pest affecting potato tubers',
        affectedArea: {
          coordinates: [[100, 150], [200, 250]],
          percentage: 15,
        },
      },
    ];

    const mockDiseases = [
      {
        name: 'Late Blight',
        scientificName: 'Phytophthora infestans',
        confidence: 0.75,
        severity: 'high' as const,
        description: 'Fungal disease causing dark lesions on leaves',
        affectedArea: {
          coordinates: [[50, 80], [150, 200]],
          percentage: 25,
        },
      },
    ];

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      detectedPests: Math.random() > 0.5 ? mockPests : [],
      detectedDiseases: Math.random() > 0.3 ? mockDiseases : [],
      overallHealth: Math.random() > 0.6 ? 'good' : 'poor',
      riskFactors: [
        'High humidity detected',
        'Temperature favorable for pest development',
      ],
    };
  }

  private generateRecommendations(
    analysis: Partial<PestAnalysisResponse>,
    location?: { county: string; subCounty: string }
  ): string[] {
    const recommendations: string[] = [];

    // General recommendations based on analysis
    if (analysis.detectedPests && analysis.detectedPests.length > 0) {
      recommendations.push('Apply appropriate insecticide treatment');
      recommendations.push('Monitor crop regularly for pest populations');
      recommendations.push('Consider biological control methods');
    }

    if (analysis.detectedDiseases && analysis.detectedDiseases.length > 0) {
      recommendations.push('Apply fungicide as recommended');
      recommendations.push('Improve field drainage to reduce humidity');
      recommendations.push('Remove infected plant material immediately');
    }

    if (analysis.overallHealth === 'poor') {
      recommendations.push('Consider soil testing and nutrient management');
      recommendations.push('Implement integrated pest management (IPM)');
    }

    // Location-specific recommendations
    if (location) {
      if (location.county.toLowerCase().includes('nakuru')) {
        recommendations.push('Consider altitude-specific varieties for this region');
      }
    }

    // General preventive measures
    recommendations.push('Maintain proper crop rotation');
    recommendations.push('Ensure adequate spacing between plants');
    recommendations.push('Monitor weather conditions regularly');

    return recommendations;
  }

  private calculateOverallConfidence(analysis: Partial<PestAnalysisResponse>): number {
    const pestConfidences = analysis.detectedPests?.map(p => p.confidence) || [];
    const diseaseConfidences = analysis.detectedDiseases?.map(d => d.confidence) || [];
    
    const allConfidences = [...pestConfidences, ...diseaseConfidences];
    
    if (allConfidences.length === 0) return 0.5; // Default confidence when nothing detected
    
    return allConfidences.reduce((sum, conf) => sum + conf, 0) / allConfidences.length;
  }

  private async cacheAnalysis(
    userId: string,
    request: PestAnalysisRequest,
    response: PestAnalysisResponse
  ): Promise<void> {
    try {
      const cacheKey = `${CACHE_KEYS.USER_SESSION}${userId}:pest_analysis:${Date.now()}`;
      const cacheData = {
        request,
        response,
        timestamp: new Date().toISOString(),
      };

      await redisClient.set(cacheKey, JSON.stringify(cacheData), this.CACHE_DURATION);
    } catch (error) {
      // Don't fail the main operation if caching fails
      logger.warn('Failed to cache pest analysis', { error, userId });
    }
  }
} 