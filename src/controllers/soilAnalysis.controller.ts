import { Request, Response } from 'express';
import multer from 'multer';
import { SoilAnalysisService } from '../services/soilAnalysis.service';
import redisClient from '../config/redis';

export class SoilAnalysisController {
  private soilAnalysisService: SoilAnalysisService;
  public uploadMiddleware: multer.Multer;

  constructor() {
    this.soilAnalysisService = new SoilAnalysisService();
    
    // Configure multer for file uploads
    this.uploadMiddleware = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (_req, file, cb) => {
        // Accept PDF and common image formats
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only PDF and images (JPEG, PNG) are allowed.'));
        }
      },
    });
  }

  async uploadAndAnalyze(req: Request, res: Response): Promise<Response> {
    try {
      const file = req.file;
      const { farmId } = req.body;
      const userId = (req as any).user.id;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const soilTest = await this.soilAnalysisService.uploadAndAnalyze(userId, file, farmId);

      return res.status(201).json({
        success: true,
        message: 'Soil test uploaded and queued for analysis',
        data: soilTest,
      });
    } catch (error) {
      console.error('Error in soil test upload:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process soil test',
        error: (error as Error).message,
      });
    }
  }

  async getSoilTests(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user.id;
      const { farmId } = req.query;

      // Try to get from cache first
      const cacheKey = `soil-tests:${userId}${farmId ? `:${farmId}` : ''}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached),
        });
      }

      // Get from database
      const soilTests = await this.soilAnalysisService.getSoilTests(
        userId,
        farmId as string | undefined
      );

      // Cache for 5 minutes
      await redisClient.set(cacheKey, JSON.stringify(soilTests), 300);

      return res.json({
        success: true,
        data: soilTests,
      });
    } catch (error) {
      console.error('Error fetching soil tests:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch soil tests',
        error: (error as Error).message,
      });
    }
  }

  async getSoilTest(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      // Try to get from cache first
      const cacheKey = `soil-test:${id}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return res.json({
          success: true,
          data: JSON.parse(cached),
        });
      }

      const soilTest = await this.soilAnalysisService.getSoilTest(id, userId);

      if (!soilTest) {
        return res.status(404).json({
          success: false,
          message: 'Soil test not found',
        });
      }

      // Cache for 5 minutes
      await redisClient.set(cacheKey, JSON.stringify(soilTest), 300);

      return res.json({
        success: true,
        data: soilTest,
      });
    } catch (error) {
      console.error('Error fetching soil test:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch soil test',
        error: (error as Error).message,
      });
    }
  }
} 