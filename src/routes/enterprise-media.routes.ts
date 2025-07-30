import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { EnterpriseMediaController } from '../controllers/enterprise-media.controller';

const router = Router();
const mediaController = new EnterpriseMediaController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Allow images, videos, and documents
    const allowedMimes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Media:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         fileName:
 *           type: string
 *         originalName:
 *           type: string
 *         mimeType:
 *           type: string
 *         size:
 *           type: number
 *         status:
 *           type: string
 *           enum: [uploading, processing, ready, failed]
 *         publicUrl:
 *           type: string
 *         variants:
 *           type: array
 *           items:
 *             type: object
 *         metadata:
 *           type: object
 *         isPublic:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/media/upload:
 *   post:
 *     summary: Upload media file
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Media file to upload
 *               generateVariants:
 *                 type: boolean
 *                 default: true
 *                 description: Generate image variants (thumbnails, etc.)
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *                 description: Make file publicly accessible
 *               aiAnalysis:
 *                 type: boolean
 *                 default: false
 *                 description: Perform AI analysis on the media
 *               metadata:
 *                 type: string
 *                 description: Additional metadata as JSON string
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Expiration date for the media
 *             required:
 *               - file
 *     responses:
 *       201:
 *         description: Media uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Media'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/upload', 
  authenticate,
  upload.single('file'),
  mediaController.uploadMedia.bind(mediaController)
);

/**
 * @swagger
 * /api/v1/media/{mediaId}/associate:
 *   post:
 *     summary: Associate media with an entity
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               associatableType:
 *                 type: string
 *                 enum: [plant_identification, plant_health, soil_test, production_cycle, user_profile, pest_analysis]
 *               associatableId:
 *                 type: string
 *                 format: uuid
 *               role:
 *                 type: string
 *                 enum: [primary, thumbnail, attachment, comparison, before, after]
 *                 default: primary
 *               order:
 *                 type: number
 *                 default: 0
 *             required:
 *               - associatableType
 *               - associatableId
 *     responses:
 *       200:
 *         description: Media associated successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/:mediaId/associate',
  authenticate,
  mediaController.associateMedia.bind(mediaController)
);

/**
 * @swagger
 * /api/v1/media/by-association/{associatableType}/{associatableId}:
 *   get:
 *     summary: Get media by association
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: associatableType
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: associatableId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [primary, thumbnail, attachment, comparison, before, after]
 *     responses:
 *       200:
 *         description: Media retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Media'
 *       500:
 *         description: Internal server error
 */
router.get('/by-association/:associatableType/:associatableId',
  authenticate,
  mediaController.getMediaByAssociation.bind(mediaController)
);

/**
 * @swagger
 * /api/v1/media/my-media:
 *   get:
 *     summary: Get user's media
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mimeType
 *         schema:
 *           type: string
 *           description: Filter by MIME type (e.g., 'image', 'video', 'application')
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [uploading, processing, ready, failed]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *           default: 0
 *     responses:
 *       200:
 *         description: User media retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Media'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     offset:
 *                       type: number
 *       500:
 *         description: Internal server error
 */
router.get('/my-media',
  authenticate,
  mediaController.getUserMedia.bind(mediaController)
);

/**
 * @swagger
 * /api/v1/media/{mediaId}/variants:
 *   post:
 *     summary: Generate variants for existing media
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Variants generated successfully
 *       500:
 *         description: Internal server error
 */
router.post('/:mediaId/variants',
  authenticate,
  mediaController.generateVariants.bind(mediaController)
);

/**
 * @swagger
 * /api/v1/media/analytics:
 *   get:
 *     summary: Get user's media analytics
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalFiles:
 *                       type: number
 *                     totalSize:
 *                       type: number
 *                     byMimeType:
 *                       type: object
 *                     byStatus:
 *                       type: object
 *                     uploadTrend:
 *                       type: object
 *                     averageProcessingTime:
 *                       type: number
 *       500:
 *         description: Internal server error
 */
router.get('/analytics',
  authenticate,
  mediaController.getMediaAnalytics.bind(mediaController)
);

/**
 * @swagger
 * /api/v1/media/{mediaId}:
 *   delete:
 *     summary: Delete media
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Media deleted successfully
 *       404:
 *         description: Media not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:mediaId',
  authenticate,
  mediaController.deleteMedia.bind(mediaController)
);

export default router;