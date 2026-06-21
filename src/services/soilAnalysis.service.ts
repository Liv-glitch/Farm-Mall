import { Queue, Worker, ConnectionOptions } from 'bullmq';
import { SoilTestModel } from '../models/SoilTest.model';
import { FileStorageService } from './fileStorage.service';
import { MediaContext } from '../models/Media.model';
import { CropVarietyModel } from '../models/CropVariety.model';
import OpenAI from 'openai';
import { env } from '../config/environment';
import { logError, logInfo } from '../utils/logger';

interface SoilAnalysisResult {
  ph?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  organicMatter?: number;
  texture?: string;
  recommendations?: Array<{
    type: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  error?: string;
}

export class SoilAnalysisService {
  private queue: Queue | null = null;
  private fileStorage: FileStorageService;
  private _openai: OpenAI | null = null;

  constructor() {
    this.fileStorage = new FileStorageService();

    // Only construct the BullMQ queue/worker when Redis is enabled.
    // On shared hosting (ENABLE_REDIS=false) the analysis runs synchronously.
    if (env.ENABLE_REDIS) {
      const connection: ConnectionOptions = {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD,
      };

      this.queue = new Queue('soil-analysis', { connection });
      this.initializeWorker(connection);
    } else {
      logInfo('SoilAnalysisService: Redis disabled, soil tests processed synchronously');
    }
  }

  // Lazily construct the OpenAI client so the app boots without OPENAI_API_KEY
  // (AI keys are optional on shared hosting). A clear error surfaces only if a
  // soil analysis is actually run without a key — caught and stored as 'failed'.
  private get openai(): OpenAI {
    if (!this._openai) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured; soil analysis is unavailable.');
      }
      this._openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this._openai;
  }

  private initializeWorker(connection: ConnectionOptions) {
    const worker = new Worker('soil-analysis', async (job) => {
      const { soilTestId } = job.data;
      await this.processSoilTest(soilTestId);
    }, { connection });

    worker.on('completed', (job) => {
      logInfo(`Soil analysis completed for job ${job.id}`);
    });

    worker.on('failed', (job, error) => {
      logError(`Soil analysis failed for job ${job?.id}`, error as Error);
    });
  }

  /**
   * Run the full soil-test analysis. Used by both the BullMQ worker (when Redis
   * is enabled) and the synchronous fallback path.
   */
  private async processSoilTest(soilTestId: string): Promise<void> {
    const soilTest = await SoilTestModel.findByPk(soilTestId);

    if (!soilTest) {
      throw new Error('Soil test not found');
    }

    try {
      // Get the document content
      // Use OCR or PDF parsing here depending on document type
      // For this example, we'll simulate getting text content
      const textContent = "Sample soil test results: pH 6.5, Nitrogen 45 ppm, Phosphorus 30 ppm...";

      // Use OpenAI to analyze the soil test
      const analysis = await this.analyzeSoilTest(textContent);

      // Update soil test record with analysis results
      await soilTest.update({
        analysisResult: analysis,
        status: 'analyzed',
        aiModelVersion: 'gpt-4-1106-preview'
      });

      // Get crop recommendations based on soil analysis
      const cropRecommendations = await this.getCropRecommendations(analysis);

      // Update analysis with crop recommendations
      await soilTest.update({
        analysisResult: {
          ...analysis,
          suitableCrops: cropRecommendations
        }
      });

    } catch (err) {
      const failedResult: SoilAnalysisResult = {
        recommendations: [],
        error: err instanceof Error ? err.message : 'Unknown error'
      };

      await soilTest.update({
        status: 'failed',
        analysisResult: failedResult
      });
      throw err;
    }
  }

  private async analyzeSoilTest(textContent: string): Promise<SoilAnalysisResult> {
    const prompt = `Analyze the following soil test results and provide recommendations:
    ${textContent}
    
    Please provide a structured analysis including:
    1. Soil pH level and its implications
    2. Nutrient levels (N, P, K) and deficiencies/excesses
    3. Organic matter content
    4. Soil texture
    5. Specific recommendations for soil improvement
    
    Format the response as a JSON object with the following structure:
    {
      "ph": number,
      "nitrogen": number,
      "phosphorus": number,
      "potassium": number,
      "organicMatter": number,
      "texture": string,
      "recommendations": [
        {
          "type": string,
          "description": string,
          "priority": "high" | "medium" | "low"
        }
      ]
    }`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [
        { role: 'system', content: 'You are a soil analysis expert. Analyze soil test results and provide recommendations in JSON format.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    return content ? JSON.parse(content) : {};
  }

  private async getCropRecommendations(analysis: SoilAnalysisResult) {
    const crops = await CropVarietyModel.findAll();
    const recommendations = [];

    for (const crop of crops) {
      // Calculate suitability score based on soil analysis
      const score = this.calculateCropSuitability(crop, analysis);
      
      if (score > 0.6) { // Only include crops with good suitability
        recommendations.push({
          cropType: crop.cropType,
          suitabilityScore: score,
          notes: this.generateCropNotes(crop, analysis)
        });
      }
    }

    // Sort by suitability score
    return recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  }

  private calculateCropSuitability(crop: CropVarietyModel, analysis: SoilAnalysisResult): number {
    // Implement crop suitability calculation based on soil parameters
    // This is a simplified example
    let score = 1.0;

    // pH preference ranges for different crops
    const phRanges: Record<string, { min: number; max: number; optimal: number }> = {
      potato: { min: 5.0, max: 6.5, optimal: 6.0 },
      maize: { min: 5.5, max: 7.5, optimal: 6.5 },
      beans: { min: 6.0, max: 7.0, optimal: 6.5 },
      // Add more crops as needed
    };

    const cropRange = phRanges[crop.cropType] || { min: 6.0, max: 7.0, optimal: 6.5 };
    
    // Adjust score based on pH
    if (analysis.ph && (analysis.ph < cropRange.min || analysis.ph > cropRange.max)) {
      score *= 0.5;
    } else if (analysis.ph && Math.abs(analysis.ph - cropRange.optimal) > 0.5) {
      score *= 0.8;
    }

    // Add more factors (nutrients, texture, etc.)
    // This is just an example implementation

    return Math.round(score * 100) / 100;
  }

  private generateCropNotes(crop: CropVarietyModel, analysis: SoilAnalysisResult): string {
    // Generate specific notes about growing this crop in the analyzed soil
    // This is a simplified example
    const notes = [];

    // Add crop-specific pH recommendations
    if (analysis.ph && analysis.ph < 6.0) {
      notes.push(`Consider lime application to raise pH for optimal ${crop.cropType} growth`);
    }

    // Add crop-specific nutrient recommendations
    if (analysis.nitrogen && analysis.nitrogen < 40) {
      notes.push(`Additional nitrogen fertilizer recommended for ${crop.cropType}`);
    }

    // Add crop-specific texture recommendations
    if (analysis.texture === 'clay' && crop.cropType === 'potato') {
      notes.push('Clay soil may restrict tuber growth - consider soil amendments');
    } else if (analysis.texture === 'sandy' && crop.cropType === 'maize') {
      notes.push('Sandy soil may need additional organic matter for better water retention');
    }

    return notes.join('. ');
  }

  async uploadAndAnalyze(userId: string, file: Express.Multer.File, farmId?: string) {
    // Create context for soil analysis upload
    const context: MediaContext = farmId 
      ? FileStorageService.createSoilAnalysisContext(farmId, 'soil-test', userId)
      : {
          category: 'soil-analysis',
          subcategory: 'soil-test',
          contextId: userId,
        };

    // Upload file to Supabase
    const uploadResult = await this.fileStorage.uploadFile(file, context, {
      generateThumbnail: true,
      metadata: {
        farmId,
        type: 'soil-test'
      }
    });

    // Create soil test record
    const soilTest = await SoilTestModel.create({
      userId,
      farmId,
      documentUrl: uploadResult.url,
      thumbnailUrl: uploadResult.thumbnailUrl,
      originalFilename: uploadResult.originalName,
      status: 'pending'
    });

    if (this.queue) {
      // Queue analysis job (Redis enabled)
      await this.queue.add('analyze-soil-test', {
        soilTestId: soilTest.id
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      });
    } else {
      // Synchronous fallback (shared hosting, no Redis). Run inline but don't
      // fail the upload if analysis errors — status is persisted as 'failed'.
      try {
        await this.processSoilTest(soilTest.id);
        await soilTest.reload();
      } catch (err) {
        logError('Synchronous soil analysis failed', err as Error, { soilTestId: soilTest.id });
      }
    }

    return soilTest;
  }

  async getSoilTests(userId: string, farmId?: string) {
    const where: any = { userId };
    if (farmId) {
      where.farmId = farmId;
    }

    return SoilTestModel.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
  }

  async getSoilTest(id: string, userId: string) {
    return SoilTestModel.findOne({
      where: { id, userId }
    });
  }
} 