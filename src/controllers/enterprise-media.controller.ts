import { Request, Response } from 'express';
import { EnterpriseMediaService } from '../services/enterprise-media.service';
import { FileStorageService } from '../services/fileStorage.service';
import { logInfo, logError } from '../utils/logger';
import { MediaContext } from '../models/Media.model';

export class EnterpriseMediaController {
  private mediaService: EnterpriseMediaService;

  constructor() {
    this.mediaService = new EnterpriseMediaService();
  }

  async uploadMedia(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided',
        });
      }

      const userId = (req as any).user.id;
      
      // Extract context from request body
      if (!req.body.category || !req.body.contextId) {
        return res.status(400).json({
          success: false,
          message: 'category and contextId are required for media context',
        });
      }

      const context: MediaContext = {
        category: req.body.category,
        subcategory: req.body.subcategory || undefined,
        contextId: req.body.contextId,
        entityId: req.body.entityId || undefined,
      };

      const options = {
        generateVariants: req.body.generateVariants !== 'false',
        isPublic: req.body.isPublic === 'true',
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : undefined,
        aiAnalysis: req.body.aiAnalysis === 'true',
        context,
      };

      const media = await this.mediaService.uploadMedia(userId, req.file, options);

      logInfo('Media uploaded via API', { mediaId: media.id, userId });

      return res.status(201).json({
        success: true,
        data: media,
      });
    } catch (error: any) {
      logError('Media upload failed via API', error, { userId: (req as any).user?.id });
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload media',
      });
    }
  }

  async associateMedia(req: Request, res: Response): Promise<Response> {
    try {
      const { mediaId } = req.params;
      const { associatableType, associatableId, role, order, category, subcategory, contextId, entityId } = req.body;

      if (!associatableType || !associatableId || !category || !contextId) {
        return res.status(400).json({
          success: false,
          message: 'associatableType, associatableId, category, and contextId are required',
        });
      }

      const context: MediaContext = {
        category,
        subcategory,
        contextId,
        entityId,
      };

      await this.mediaService.associateMedia(mediaId, {
        associatableType,
        associatableId,
        role,
        context,
        order,
      });

      return res.json({
        success: true,
        message: 'Media associated successfully',
      });
    } catch (error: any) {
      logError('Media association failed', error, { mediaId: req.params.mediaId });
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to associate media',
      });
    }
  }

  async getMediaByAssociation(req: Request, res: Response): Promise<Response> {
    try {
      const { associatableType, associatableId } = req.params;
      const { role } = req.query;

      const media = await this.mediaService.getMediaByAssociation(
        associatableType,
        associatableId,
        role as string
      );

      return res.json({
        success: true,
        data: media,
      });
    } catch (error: any) {
      logError('Failed to get media by association', error, {
        associatableType: req.params.associatableType,
        associatableId: req.params.associatableId,
      });
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get media',
      });
    }
  }

  async getUserMedia(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user.id;
      const { mimeType, status, limit, offset } = req.query;

      const options = {
        mimeType: mimeType as string,
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      };

      const result = await this.mediaService.getUserMedia(userId, options);

      return res.json({
        success: true,
        data: result.media,
        pagination: {
          total: result.total,
          limit: options.limit || 50,
          offset: options.offset || 0,
        },
      });
    } catch (error: any) {
      logError('Failed to get user media', error, { userId: (req as any).user?.id });
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get media',
      });
    }
  }

  async deleteMedia(req: Request, res: Response): Promise<Response> {
    try {
      const { mediaId } = req.params;
      const userId = (req as any).user.id;

      await this.mediaService.deleteMedia(mediaId, userId);

      return res.json({
        success: true,
        message: 'Media deleted successfully',
      });
    } catch (error: any) {
      logError('Failed to delete media', error, { mediaId: req.params.mediaId, userId: (req as any).user?.id });
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete media',
      });
    }
  }

  async getMediaAnalytics(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user.id;
      const analytics = await this.mediaService.getMediaAnalytics(userId);

      return res.json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      logError('Failed to get media analytics', error, { userId: (req as any).user?.id });
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get analytics',
      });
    }
  }

  async generateVariants(req: Request, res: Response): Promise<Response> {
    try {
      const { mediaId } = req.params;
      
      await this.mediaService.generateVariants(mediaId);

      return res.json({
        success: true,
        message: 'Variants generated successfully',
      });
    } catch (error: any) {
      logError('Failed to generate variants', error, { mediaId: req.params.mediaId });
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate variants',
      });
    }
  }

  // Helper endpoints for quick context creation
  async uploadUserProfile(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
      }

      const userId = (req as any).user.id;
      const context = FileStorageService.createUserProfileContext(userId);
      
      const options = {
        generateVariants: true,
        isPublic: req.body.isPublic === 'true',
        context,
      };

      const media = await this.mediaService.uploadMedia(userId, req.file, options);
      return res.status(201).json({ success: true, data: media });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async uploadLivestockMedia(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
      }

      const { farmId, animalType, recordId } = req.body;
      if (!farmId || !animalType || !recordId) {
        return res.status(400).json({
          success: false, 
          message: 'farmId, animalType, and recordId are required'
        });
      }

      const userId = (req as any).user.id;
      const context = FileStorageService.createLivestockContext(farmId, animalType, recordId);
      
      const options = {
        generateVariants: req.body.generateVariants !== 'false',
        isPublic: false,
        context,
      };

      const media = await this.mediaService.uploadMedia(userId, req.file, options);
      return res.status(201).json({ success: true, data: media });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async uploadCropMedia(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
      }

      const { farmId, purpose, fieldId, entityId } = req.body;
      if (!farmId || !purpose || !fieldId) {
        return res.status(400).json({
          success: false, 
          message: 'farmId, purpose, and fieldId are required'
        });
      }

      const userId = (req as any).user.id;
      const context = FileStorageService.createCropContext(farmId, purpose, fieldId, entityId);
      
      const options = {
        generateVariants: req.body.generateVariants !== 'false',
        isPublic: false,
        context,
      };

      const media = await this.mediaService.uploadMedia(userId, req.file, options);
      return res.status(201).json({ success: true, data: media });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async uploadSoilAnalysis(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
      }

      const { farmId, analysisType, locationId } = req.body;
      if (!farmId || !analysisType || !locationId) {
        return res.status(400).json({
          success: false, 
          message: 'farmId, analysisType, and locationId are required'
        });
      }

      const userId = (req as any).user.id;
      const context = FileStorageService.createSoilAnalysisContext(farmId, analysisType, locationId);
      
      const options = {
        generateVariants: false, // Usually documents
        isPublic: false,
        context,
      };

      const media = await this.mediaService.uploadMedia(userId, req.file, options);
      return res.status(201).json({ success: true, data: media });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}