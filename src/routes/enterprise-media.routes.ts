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
 *               category:
 *                 type: string
 *                 description: Media category (livestock, crops, soil-analysis, etc.)
 *               subcategory:
 *                 type: string
 *                 description: Media subcategory (cattle, identification, tests, etc.)
 *               contextId:
 *                 type: string
 *                 description: Context ID (farmId, userId, etc.)
 *               entityId:
 *                 type: string
 *                 description: Entity ID (specific record/entity)
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
 *               - category
 *               - contextId
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
 *                 description: Dynamic association type (livestock_record, crop_cycle, soil_test, etc.)
 *               associatableId:
 *                 type: string
 *                 format: uuid
 *               role:
 *                 type: string
 *                 enum: [primary, thumbnail, attachment, comparison, before, after, profile, documentation, evidence, diagnostic, treatment, progress]
 *                 default: primary
 *               category:
 *                 type: string
 *                 description: Context category
 *               subcategory:
 *                 type: string
 *                 description: Context subcategory
 *               contextId:
 *                 type: string
 *                 description: Context ID
 *               entityId:
 *                 type: string
 *                 description: Entity ID
 *               order:
 *                 type: number
 *                 default: 0
 *             required:
 *               - associatableType
 *               - associatableId
 *               - category
 *               - contextId
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
 *           enum: [primary, thumbnail, attachment, comparison, before, after, profile, documentation, evidence, diagnostic, treatment, progress]
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

// Specialized upload endpoints for easier frontend integration

/**
 * @swagger
 * /api/v1/media/upload/user-profile:
 *   post:
 *     summary: Upload user profile picture
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
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *             required:
 *               - file
 *     responses:
 *       201:
 *         description: Profile picture uploaded successfully
 */
router.post('/upload/user-profile',
  authenticate,
  upload.single('file'),
  mediaController.uploadUserProfile.bind(mediaController)
);

/**
 * @swagger
 * /api/v1/media/upload/livestock:
 *   post:
 *     summary: Upload livestock media
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
 *               farmId:
 *                 type: string
 *                 format: uuid
 *               animalType:
 *                 type: string
 *                 enum: [cattle, poultry, swine, sheep, goats, other]
 *               recordId:
 *                 type: string
 *                 format: uuid
 *               generateVariants:
 *                 type: boolean
 *                 default: true
 *             required:
 *               - file
 *               - farmId
 *               - animalType
 *               - recordId
 *     responses:
 *       201:
 *         description: Livestock media uploaded successfully
 */
router.post('/upload/livestock',
  authenticate,
  upload.single('file'),
  mediaController.uploadLivestockMedia.bind(mediaController)
);

/**
 * @swagger
 * /api/v1/media/upload/crops:
 *   post:
 *     summary: Upload crop media
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
 *               farmId:
 *                 type: string
 *                 format: uuid
 *               purpose:
 *                 type: string
 *                 enum: [identification, health, harvest, treatment, progress]
 *               fieldId:
 *                 type: string
 *                 format: uuid
 *               entityId:
 *                 type: string
 *                 format: uuid
 *                 description: Specific crop/plant ID
 *               generateVariants:
 *                 type: boolean
 *                 default: true
 *             required:
 *               - file
 *               - farmId
 *               - purpose
 *               - fieldId
 *     responses:
 *       201:
 *         description: Crop media uploaded successfully
 */
router.post('/upload/crops',
  authenticate,
  upload.single('file'),
  mediaController.uploadCropMedia.bind(mediaController)
);

/**
 * @swagger
 * /api/v1/media/upload/soil-analysis:
 *   post:
 *     summary: Upload soil analysis documents
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
 *               farmId:
 *                 type: string
 *                 format: uuid
 *               analysisType:
 *                 type: string
 *                 enum: [soil-test, sand-analysis, composition, ph-test, nutrient-analysis]
 *               locationId:
 *                 type: string
 *                 format: uuid
 *             required:
 *               - file
 *               - farmId
 *               - analysisType
 *               - locationId
 *     responses:
 *       201:
 *         description: Soil analysis document uploaded successfully
 */
router.post('/upload/soil-analysis',
  authenticate,
  upload.single('file'),
  mediaController.uploadSoilAnalysis.bind(mediaController)
);

export default router;