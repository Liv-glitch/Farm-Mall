import { Queue, Worker, ConnectionOptions } from 'bullmq';
import { SoilTestModel } from '../models/SoilTest.model';
import { FileStorageService } from './fileStorage.service';
import { MediaContext } from '../models/Media.model';
import { CropVarietyModel } from '../models/CropVariety.model';
import OpenAI from 'openai';

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
  private queue: Queue;
  private fileStorage: FileStorageService;
  private openai: OpenAI;

  constructor() {
    const connection: ConnectionOptions = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    };

    this.queue = new Queue('soil-analysis', { connection });
    this.fileStorage = new FileStorageService();
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize worker
    this.initializeWorker(connection);
  }

  private initializeWorker(connection: ConnectionOptions) {
    const worker = new Worker('soil-analysis', async (job) => {
      const { soilTestId } = job.data;
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
    }, { connection });

    worker.on('completed', (job) => {
      console.log(`Soil analysis completed for job ${job.id}`);
    });

    worker.on('failed', (job, error) => {
      console.error(`Soil analysis failed for job ${job?.id}:`, error);
    });
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

    // Queue analysis job
    await this.queue.add('analyze-soil-test', {
      soilTestId: soilTest.id
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });

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