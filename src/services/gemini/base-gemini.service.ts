import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { logInfo, logError } from '../../utils/logger';
import fs from 'fs/promises';

export interface GeminiConfig {
  apiKey: string;
  model?: 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-1.5-flash' | 'gemini-1.5-pro';
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

export interface AnalysisOptions {
  includeMetadata?: boolean;
  confidence?: boolean;
  location?: {
    latitude: number;
    longitude: number;
  };
  additionalContext?: string;
}

export interface StructuredResponse<T = any> {
  success: boolean;
  data?: T;
  confidence?: number;
  modelVersion: string;
  processingTime: number;
  error?: string;
  metadata?: {
    imageFormat?: string;
    imageSize?: number;
    location?: {
      latitude: number;
      longitude: number;
    };
    timestamp: Date;
  };
}

export abstract class BaseGeminiService {
  protected genAI: GoogleGenerativeAI;
  protected model: GenerativeModel;
  protected config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = {
      model: 'gemini-2.5-flash',
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
      ...config
    };

    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: this.config.model!,
      generationConfig: {
        temperature: this.config.temperature,
        topK: this.config.topK,
        topP: this.config.topP,
        maxOutputTokens: this.config.maxOutputTokens,
      },
    });
  }

  protected async processImageWithPrompt<T>(
    imagePath: string | Buffer,
    prompt: string,
    options: AnalysisOptions = {}
  ): Promise<StructuredResponse<T>> {
    const startTime = Date.now();
    
    try {
      let imageData: Buffer;
      let mimeType: string;

      if (typeof imagePath === 'string') {
        imageData = await fs.readFile(imagePath);
        mimeType = this.getMimeType(imagePath);
      } else {
        imageData = imagePath;
        mimeType = 'image/jpeg'; // Default fallback
      }

      // Prepare the image part
      const imagePart = {
        inlineData: {
          data: imageData.toString('base64'),
          mimeType: mimeType,
        },
      };

      // Enhanced prompt with context
      const enhancedPrompt = this.buildEnhancedPrompt(prompt, options);

      logInfo('🔍 Processing image with Gemini', {
        model: this.config.model,
        imageSize: imageData.length,
        mimeType,
        hasLocation: !!options.location,
        promptLength: enhancedPrompt.length
      });

      const result = await this.model.generateContent([enhancedPrompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      const processingTime = Date.now() - startTime;

      // Try to parse as JSON, fallback to raw text
      let parsedData: T;
      try {
        parsedData = JSON.parse(text) as T;
      } catch {
        // If not valid JSON, wrap in a generic structure
        parsedData = { content: text } as T;
      }

      const structuredResponse: StructuredResponse<T> = {
        success: true,
        data: parsedData,
        modelVersion: this.config.model!,
        processingTime,
        metadata: {
          imageFormat: mimeType,
          imageSize: imageData.length,
          location: options.location,
          timestamp: new Date()
        }
      };

      logInfo('✅ Gemini analysis completed', {
        processingTime,
        responseLength: text.length,
        model: this.config.model
      });

      return structuredResponse;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      logError('❌ Gemini analysis failed', error, {
        model: this.config.model,
        processingTime,
        promptLength: prompt.length
      });

      return {
        success: false,
        error: error.message || 'Analysis failed',
        modelVersion: this.config.model!,
        processingTime,
        metadata: {
          timestamp: new Date()
        }
      };
    }
  }

  protected async processDocumentWithPrompt<T>(
    documentBuffer: Buffer,
    prompt: string,
    options: AnalysisOptions = {}
  ): Promise<StructuredResponse<T>> {
    // For PDF/document processing, we'll convert to image first
    // This is a simplified approach - in production you might want to use PDF parsing
    return this.processImageWithPrompt<T>(documentBuffer, prompt, options);
  }

  private buildEnhancedPrompt(basePrompt: string, options: AnalysisOptions): string {
    let enhancedPrompt = basePrompt;

    if (options.location) {
      enhancedPrompt += `\n\nLocation context: Latitude ${options.location.latitude}, Longitude ${options.location.longitude}. Consider regional factors that might be relevant to the analysis.`;
    }

    if (options.additionalContext) {
      enhancedPrompt += `\n\nAdditional context: ${options.additionalContext}`;
    }

    if (options.confidence) {
      enhancedPrompt += `\n\nPlease include a confidence score (0-1) for your analysis.`;
    }

    enhancedPrompt += `\n\nPlease provide your response in valid JSON format for easy parsing.`;

    return enhancedPrompt;
  }

  private getMimeType(filePath: string): string {
    const extension = filePath.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'heic': 'image/heic',
      'heif': 'image/heif',
      'pdf': 'application/pdf'
    };
    return mimeTypes[extension || ''] || 'image/jpeg';
  }

  protected createCacheKey(prompt: string, imageHash: string, options: AnalysisOptions): string {
    const optionsStr = JSON.stringify(options);
    return `gemini:${this.config.model}:${Buffer.from(`${prompt}:${imageHash}:${optionsStr}`).toString('base64')}`;
  }

  // Helper method for backward compatibility - converts Gemini response to Plant.id-like format
  protected convertToPlantIdFormat(geminiResponse: any, type: 'identification' | 'health'): any {
    if (type === 'identification') {
      return {
        result: {
          is_plant: {
            probability: geminiResponse.confidence || 0.8,
            binary: true,
            threshold: 0.5
          },
          classification: {
            suggestions: geminiResponse.plants?.map((plant: any, index: number) => ({
              id: `gemini-${index}`,
              name: plant.scientificName || plant.commonName,
              probability: plant.confidence || 0.7,
              confirmed: false,
              similar_images: [],
              details: {
                common_names: plant.commonNames || [plant.commonName],
                taxonomy: plant.taxonomy || {},
                description: plant.description || {},
                synonyms: plant.synonyms || [],
                image: plant.image || {},
                edible_parts: plant.edibleParts || [],
                watering: plant.watering || {},
                propagation_methods: plant.propagationMethods || []
              }
            })) || []
          }
        },
        model_version: this.config.model,
        input: {
          latitude: geminiResponse.metadata?.location?.latitude,
          longitude: geminiResponse.metadata?.location?.longitude,
          similar_images: true,
          datetime: new Date().toISOString()
        },
        status: 'COMPLETED',
        sla_compliant_client: true,
        sla_compliant_system: true,
        created: Math.floor(Date.now() / 1000),
        completed: Math.floor(Date.now() / 1000)
      };
    } else {
      return {
        result: {
          is_healthy: {
            probability: geminiResponse.healthStatus?.isHealthy ? 0.9 : 0.1,
            binary: geminiResponse.healthStatus?.isHealthy || false,
            threshold: 0.5
          },
          disease: {
            suggestions: geminiResponse.diseases?.map((disease: any, index: number) => ({
              id: `gemini-disease-${index}`,
              name: disease.name,
              probability: disease.confidence || 0.7,
              similar_images: [],
              details: {
                description: disease.description,
                treatment: disease.treatment || {},
                classification: disease.classification || {},
                common_names: [disease.name],
                url: disease.url || '',
                language: 'en'
              }
            })) || []
          }
        },
        model_version: this.config.model,
        input: {
          latitude: geminiResponse.metadata?.location?.latitude,
          longitude: geminiResponse.metadata?.location?.longitude,
          similar_images: true,
          datetime: new Date().toISOString()
        },
        status: 'COMPLETED'
      };
    }
  }
}