import { Request, Response } from 'express';
import { EnterpriseMediaService } from '../services/enterprise-media.service';
import { logInfo, logError } from '../utils/logger';

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
      const options = {
        generateVariants: req.body.generateVariants !== 'false',
        isPublic: req.body.isPublic === 'true',
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : undefined,
        aiAnalysis: req.body.aiAnalysis === 'true',
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
      const { associatableType, associatableId, role, order } = req.body;

      if (!associatableType || !associatableId) {
        return res.status(400).json({
          success: false,
          message: 'associatableType and associatableId are required',
        });
      }

      await this.mediaService.associateMedia(mediaId, {
        associatableType,
        associatableId,
        role,
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
}