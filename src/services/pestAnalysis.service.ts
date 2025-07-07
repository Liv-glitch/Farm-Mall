import { env } from '../config/environment';
import { logInfo, logError } from '../utils/logger';
import { PestAnalysisRequest, PestAnalysisResponse } from '../types/ai.types';

export class PestAnalysisService {
  private readonly plantIdApiKey: string;
  private readonly plantIdBaseUrl = 'https://plant.id/api/v3';

  constructor() {
    this.plantIdApiKey = env.PLANTID_API_KEY || '';
    if (!this.plantIdApiKey) {
      logError('Plant.id API key not configured', new Error('PLANTID_API_KEY not found'));
    }
  }

  // Main analysis method - direct Plant.id API call
  async analyzePestInImage(request: PestAnalysisRequest): Promise<PestAnalysisResponse> {
    try {
      if (!this.plantIdApiKey) {
        throw new Error('PLANTID_API_KEY not configured');
      }

      const plantIdResponse = await this.callPlantIdAPI(request.imageUrl, request.cropType);

      // Convert Plant.id response to our format
      const response: PestAnalysisResponse = {
        confidence: plantIdResponse.result?.classification?.suggestions?.[0]?.probability || 0.5,
        overallHealth: this.determineOverallHealth(plantIdResponse),
        detectedPests: this.extractPests(plantIdResponse),
        detectedDiseases: this.extractDiseases(plantIdResponse),
        riskFactors: this.extractRiskFactors(plantIdResponse),
        recommendations: this.extractRecommendations(plantIdResponse),
        metadata: {
          processingTime: Date.now() - request.timestamp.getTime(),
          imageSize: { width: 0, height: 0, size: 0 }, // Plant.id doesn't return this
          modelVersion: 'plant.id-v3',
          rawPlantIdResponse: plantIdResponse // Include raw response for debugging
        },
      };

      logInfo('Plant.id analysis completed', {
        userId: request.userId,
        cropType: request.cropType,
        confidence: response.confidence,
        pestsFound: response.detectedPests?.length || 0,
        diseasesFound: response.detectedDiseases?.length || 0,
      });

      return response;
    } catch (error) {
      logError('Plant.id analysis failed', error as Error, { 
        userId: request.userId,
        cropType: request.cropType
      });
      throw error;
    }
  }

  // Direct Plant.id API call
  private async callPlantIdAPI(imageUrl: string, _cropType?: string): Promise<any> {
    const requestBody = {
      images: [imageUrl],
      similar_images: true,
      plant_details: ["common_names"],
      disease_details: ["common_names", "description", "treatment"],
      plant_language: "en",
      modifiers: ["crops_fast", "similar_images", "health_assessment"]
    };

    // LOG API REQUEST DETAILS
    logInfo('🚀 Plant.id API Request Starting', {
      url: `${this.plantIdBaseUrl}/identification`,
      apiKeyPrefix: this.plantIdApiKey ? `${this.plantIdApiKey.substring(0, 8)}...` : 'NOT_SET',
      imageType: imageUrl.startsWith('data:') ? 'base64' : 'url',
      imageSize: imageUrl.length,
      requestBody: {
        ...requestBody,
        images: [`${imageUrl.substring(0, 50)}...`] // Log first 50 chars of image
      }
    });

    const response = await fetch(`${this.plantIdBaseUrl}/identification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': this.plantIdApiKey,
      },
      body: JSON.stringify(requestBody),
    });

    // LOG RESPONSE DETAILS
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    logInfo('📡 Plant.id API Response Received', {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      logError('❌ Plant.id API Error Response', new Error(`API Error: ${response.status}`), {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText,
        headers: responseHeaders
      });
      throw new Error(`Plant.id API error: ${response.status} - ${errorText}`);
    }

    const jsonResponse = await response.json();
    
    // LOG SUCCESSFUL RESPONSE
    logInfo('✅ Plant.id API Success Response', {
      responseSize: JSON.stringify(jsonResponse).length,
      hasResult: !!jsonResponse.result,
      resultKeys: jsonResponse.result ? Object.keys(jsonResponse.result) : [],
      fullResponse: jsonResponse // Log the complete response
    });

    return jsonResponse;
  }

  // Convert Plant.id response to our health format
  private determineOverallHealth(plantIdResponse: any): 'excellent' | 'good' | 'fair' | 'poor' {
    if (plantIdResponse.result?.is_healthy_probability) {
      const healthScore = plantIdResponse.result.is_healthy_probability;
      if (healthScore > 0.8) return 'excellent';
      if (healthScore > 0.6) return 'good';
      if (healthScore > 0.4) return 'fair';
      return 'poor';
    }
    return 'fair'; // Default if no health data
  }

  // Extract pest information from Plant.id response
  private extractPests(plantIdResponse: any): Array<{
    name: string;
    scientificName: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }> {
    const pests: any[] = [];
    
    if (plantIdResponse.result?.disease?.suggestions) {
      plantIdResponse.result.disease.suggestions.forEach((disease: any) => {
        if (disease.name && disease.name.toLowerCase().includes('pest')) {
          pests.push({
            name: disease.details?.common_names?.[0] || disease.name,
            scientificName: disease.name,
            confidence: disease.probability,
            severity: disease.probability > 0.7 ? 'high' : disease.probability > 0.4 ? 'medium' : 'low',
            description: disease.details?.description || 'Pest detected in plant'
          });
        }
      });
    }
    
    return pests;
  }

  // Extract disease information from Plant.id response
  private extractDiseases(plantIdResponse: any): Array<{
    name: string;
    scientificName: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
    treatment?: string;
  }> {
    const diseases: any[] = [];
    
    if (plantIdResponse.result?.disease?.suggestions) {
      plantIdResponse.result.disease.suggestions.forEach((disease: any) => {
          diseases.push({
          name: disease.details?.common_names?.[0] || disease.name,
          scientificName: disease.name,
          confidence: disease.probability,
          severity: disease.probability > 0.7 ? 'high' : disease.probability > 0.4 ? 'medium' : 'low',
          description: disease.details?.description || 'Disease detected in plant',
          treatment: disease.details?.treatment?.chemical || disease.details?.treatment?.biological
        });
      });
    }
    
    return diseases;
  }

  // Extract risk factors from Plant.id response
  private extractRiskFactors(plantIdResponse: any): string[] {
    const risks: string[] = [];
    
    if (plantIdResponse.result?.is_healthy_probability < 0.5) {
      risks.push('Plant shows signs of poor health');
    }
    
    if (plantIdResponse.result?.disease?.suggestions?.length > 0) {
      risks.push('Disease symptoms detected');
    }
    
    return risks;
  }

  // Extract recommendations from Plant.id response
  private extractRecommendations(plantIdResponse: any): string[] {
    const recommendations: string[] = [];

    if (plantIdResponse.result?.disease?.suggestions) {
      plantIdResponse.result.disease.suggestions.forEach((disease: any) => {
        if (disease.details?.treatment?.chemical) {
          recommendations.push(`Chemical treatment: ${disease.details.treatment.chemical}`);
    }
        if (disease.details?.treatment?.biological) {
          recommendations.push(`Biological treatment: ${disease.details.treatment.biological}`);
    }
        if (disease.details?.treatment?.prevention) {
          recommendations.push(`Prevention: ${disease.details.treatment.prevention}`);
        }
      });
    }

    if (recommendations.length === 0) {
      recommendations.push('Monitor plant health regularly');
      recommendations.push('Ensure proper watering and nutrition');
    }

    return recommendations;
  }

  // Get analysis history (simplified)
  async getAnalysisHistory(_userId: string, _limit: number, _offset: number) {
    // For now, return empty - implement database storage later if needed
    return {
      analyses: [],
      total: 0
    };
  }

  // Get pest statistics (simplified) 
  async getPestStatistics(_county: string, _subCounty?: string) {
    // For now, return empty - implement database aggregation later if needed
    return {
      totalAnalyses: 0,
      commonPests: [],
      commonDiseases: []
    };
  }
} 