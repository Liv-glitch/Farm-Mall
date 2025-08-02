import { GoogleGenAI } from '@google/genai';
import { logInfo, logError } from '../../utils/logger';

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
  protected genAI: GoogleGenAI;
  protected modelName: string;
  protected config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = config;
    this.modelName = config.model || 'gemini-2.5-flash';
    
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    // Initialize using the official @google/genai pattern
    this.genAI = new GoogleGenAI({
      apiKey: config.apiKey
    });

    logInfo('🤖 Gemini service initialized', {
      model: this.modelName,
      temperature: config.temperature || 0.3
    });
  }

  /**
   * Process image with Gemini using official docs pattern
   */
  protected async processImageWithPrompt<T>(
    imageBuffer: Buffer,
    prompt: string,
    mimeType: string = 'image/jpeg',
    options: AnalysisOptions = {}
  ): Promise<StructuredResponse<T>> {
    const startTime = Date.now();

    try {
      logInfo('🔍 Processing image with Gemini', {
        model: this.modelName,
        promptLength: prompt.length,
        imageSize: imageBuffer.length,
        mimeType
      });

      // Convert buffer to base64 - exact pattern from official docs
      const base64ImageData = imageBuffer.toString('base64');

      // Create contents array exactly as shown in the official docs
      const contents = [
        {
          inlineData: {
            mimeType,
            data: base64ImageData,
          },
        },
        { text: prompt },
      ];

      // Generate content using the official @google/genai API
      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: contents,
      });

      const processingTime = Date.now() - startTime;

      if (!response.text) {
        throw new Error('No response text received from Gemini');
      }

      logInfo('✅ Gemini analysis completed', {
        model: this.modelName,
        processingTime,
        responseLength: response.text.length
      });

      // Parse JSON response
      let parsedData: T;
      try {
        const cleanText = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        parsedData = JSON.parse(cleanText);
      } catch (parseError) {
        parsedData = response.text as unknown as T;
      }

      return {
        success: true,
        data: parsedData,
        modelVersion: this.modelName,
        processingTime,
        metadata: {
          imageFormat: mimeType,
          imageSize: imageBuffer.length,
          location: options.location,
          timestamp: new Date()
        }
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      logError('❌ Gemini image processing failed', error, {
        model: this.modelName,
        processingTime,
        errorType: error.constructor.name
      });

      return {
        success: false,
        error: error.message || 'Image processing failed',
        modelVersion: this.modelName,
        processingTime
      };
    }
  }

  /**
   * Process document using File API as shown in official docs
   */
  protected async processDocumentWithPrompt<T>(
    documentBuffer: Buffer,
    prompt: string,
    mimeType: string = 'application/pdf',
    options: AnalysisOptions = {}
  ): Promise<StructuredResponse<T>> {
    const startTime = Date.now();

    try {
      logInfo('📄 Processing document with Gemini', {
        model: this.modelName,
        promptLength: prompt.length,
        documentSize: documentBuffer.length,
        mimeType
      });

      // Upload file using File API as shown in docs
      // Convert Buffer to Blob for file upload
      const blob = new Blob([documentBuffer], { type: mimeType });
      const uploadedFile = await this.genAI.files.upload({
        file: blob,
        config: { mimeType }
      });

      logInfo('📤 Document uploaded to Gemini', {
        fileUri: uploadedFile.uri,
        fileName: uploadedFile.name
      });

      // Generate content with uploaded file - following docs pattern
      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: [
          { text: prompt },
          {
            fileData: {
              mimeType: uploadedFile.mimeType,
              fileUri: uploadedFile.uri
            }
          }
        ],
      });

      const processingTime = Date.now() - startTime;

      if (!response.text) {
        throw new Error('No response text received from Gemini');
      }

      logInfo('✅ Gemini document analysis completed', {
        model: this.modelName,
        processingTime,
        responseLength: response.text.length
      });

      // Clean up the uploaded file
      try {
        if (uploadedFile.name) {
          await this.genAI.files.delete({ name: uploadedFile.name });
          logInfo('🗑️ Temporary file cleaned up', { fileName: uploadedFile.name });
        }
      } catch (cleanupError) {
        logError('⚠️ Failed to clean up temporary file', cleanupError as Error);
      }

      // Parse response
      let parsedData: T;
      try {
        const cleanText = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        parsedData = JSON.parse(cleanText);
      } catch (parseError) {
        parsedData = response.text as unknown as T;
      }

      return {
        success: true,
        data: parsedData,
        modelVersion: this.modelName,
        processingTime,
        metadata: {
          imageFormat: mimeType,
          imageSize: documentBuffer.length,
          location: options.location,
          timestamp: new Date()
        }
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      logError('❌ Gemini document processing failed', error, {
        model: this.modelName,
        processingTime,
        errorType: error.constructor.name
      });

      return {
        success: false,
        error: error.message || 'Document processing failed',
        modelVersion: this.modelName,
        processingTime
      };
    }
  }

  /**
   * Process text-only prompts following official docs
   */
  protected async processTextPrompt<T>(
    prompt: string,
    _options: AnalysisOptions = {}
  ): Promise<StructuredResponse<T>> {
    const startTime = Date.now();

    try {
      logInfo('💭 Processing text prompt with Gemini', {
        model: this.modelName,
        promptLength: prompt.length
      });

      // Simple text generation as per official docs
      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: [{ text: prompt }],
      });

      const processingTime = Date.now() - startTime;

      if (!response.text) {
        throw new Error('No response text received from Gemini');
      }

      logInfo('✅ Gemini text analysis completed', {
        model: this.modelName,
        processingTime,
        responseLength: response.text.length
      });

      // Parse response
      let parsedData: T;
      try {
        const cleanText = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        parsedData = JSON.parse(cleanText);
      } catch (parseError) {
        parsedData = response.text as unknown as T;
      }

      return {
        success: true,
        data: parsedData,
        modelVersion: this.modelName,
        processingTime,
        metadata: {
          timestamp: new Date()
        }
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      logError('❌ Gemini text processing failed', error, {
        model: this.modelName,
        processingTime,
        errorType: error.constructor.name
      });

      return {
        success: false,
        error: error.message || 'Text processing failed',
        modelVersion: this.modelName,
        processingTime
      };
    }
  }

  /**
   * Health check for the Gemini service
   */
  async healthCheck(): Promise<{ available: boolean; model: string; error?: string }> {
    try {
      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: [{ text: 'Hello, reply with "OK"' }],
      });

      return {
        available: !!response.text,
        model: this.modelName
      };
    } catch (error: any) {
      return {
        available: false,
        model: this.modelName,
        error: error.message
      };
    }
  }
}