import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { FileStorageService } from '../services/fileStorage.service';
import multer from 'multer';

const router = Router();
const fileStorage = new FileStorageService();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

/**
 * Upload file
 * POST /api/v1/storage/upload
 */
router.post('/upload', 
  authenticate,
  upload.single('file'),
  async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'No file provided' 
        });
      }

      const type = req.body?.type || 'document';
      const generateThumbnail = req.body?.generateThumbnail === 'true';
      const isPublic = req.body?.isPublic === 'true';
      const metadata = req.body?.metadata ? JSON.parse(req.body.metadata) : undefined;
      const userId = (req as any).user.id;

      const result = await fileStorage.uploadFile(
        userId,
        req.file,
        type as any,
        {
          generateThumbnail,
          metadata,
          isPublic
        }
      );

      return res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload file'
      });
    }
  }
);

/**
 * List files
 * GET /api/v1/storage/list/:prefix?
 */
router.get('/list/:prefix?',
  authenticate,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const prefix = req.params.prefix;
      const files = await fileStorage.listFiles(prefix);
      return res.json({
        success: true,
        data: files
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to list files'
      });
    }
  }
);

/**
 * Delete file
 * DELETE /api/v1/storage/:path
 */
router.delete('/:path',
  authenticate,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      await fileStorage.deleteFile(req.params.path);
      return res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete file'
      });
    }
  }
);

/**
 * Get signed URL
 * GET /api/v1/storage/signed-url/:path
 */
router.get('/signed-url/:path',
  authenticate,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const expiresIn = req.query.expiresIn ? parseInt(req.query.expiresIn as string) : 3600;
      const url = await fileStorage.generateSignedUrl(req.params.path, expiresIn);
      return res.json({
        success: true,
        data: { url }
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate signed URL'
      });
    }
  }
);

/**
 * Get public URL
 * GET /api/v1/storage/public-url/:path
 */
router.get('/public-url/:path',
  authenticate,
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const url = await fileStorage.getPublicUrl(req.params.path);
      return res.json({
        success: true,
        data: { url }
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get public URL'
      });
    }
  }
);

export default router; 