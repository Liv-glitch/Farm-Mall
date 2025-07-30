import crypto from 'crypto';
import path from 'path';
import sharp from 'sharp';
import ExifReader from 'exifreader';
import { FileStorageService } from './fileStorage.service';
import { Media, MediaAttributes, MediaVariant, MediaMetadata } from '../models/Media.model';
import { MediaAssociation } from '../models/MediaAssociation.model';
import { logInfo, logError } from '../utils/logger';
import { Op } from 'sequelize';

export interface UploadOptions {
  generateVariants?: boolean;
  isPublic?: boolean;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  aiAnalysis?: boolean;
}

export interface AssociationOptions {
  associatableType: 'plant_identification' | 'plant_health' | 'soil_test' | 'production_cycle' | 'user_profile' | 'pest_analysis';
  associatableId: string;
  role?: 'primary' | 'thumbnail' | 'attachment' | 'comparison' | 'before' | 'after';
  order?: number;
}

export class EnterpriseMediaService {
  private storageService: FileStorageService;

  constructor() {
    this.storageService = new FileStorageService();
  }

  async uploadMedia(
    userId: string,
    file: Express.Multer.File,
    options: UploadOptions = {}
  ): Promise<MediaAttributes> {
    const startTime = Date.now();

    try {
      // Generate file hash
      const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

      // Check for duplicate
      const existingMedia = await Media.findOne({ where: { hash } });
      if (existingMedia) {
        logInfo('Returning existing media for duplicate hash', { hash, existingMediaId: existingMedia.id });
        return existingMedia.toJSON();
      }

      // Extract metadata
      const metadata = await this.extractMetadata(file.buffer, file.mimetype);

      // Generate unique filename
      const ext = path.extname(file.originalname);
      const fileName = `${hash}${ext}`;
      
      // Determine storage path
      const category = this.getCategoryFromMimeType(file.mimetype);
      const storagePath = `${category}/${userId}/${fileName}`;

      // Create media record
      const media = await Media.create({
        userId,
        fileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.buffer.length,
        hash,
        status: 'uploading',
        storageProvider: 'supabase',
        storagePath,
        variants: [],
        metadata,
        analytics: {
          uploadTime: new Date(),
          downloadCount: 0,
        },
        isPublic: options.isPublic || false,
        expiresAt: options.expiresAt,
      });

      // Upload to storage
      const uploadResult = await this.storageService.uploadFile(
        userId,
        file,
        category as any,
        {
          generateThumbnail: false, // We'll handle this in processing
          isPublic: options.isPublic || false,
          metadata: options.metadata,
        }
      );

      // Update media record with storage info
      await media.update({
        publicUrl: uploadResult.url,
        status: 'processing',
      });

      // Process variants if needed (for now, do it synchronously)
      if (options.generateVariants !== false && this.isProcessableMedia(file.mimetype)) {
        try {
          await this.generateVariants(media.id);
        } catch (error) {
          logError('Failed to generate variants during upload', error as Error, { mediaId: media.id });
          await media.update({ status: 'ready' }); // Still mark as ready even if variants failed
        }
      } else {
        await media.update({ status: 'ready' });
      }

      const processingTime = Date.now() - startTime;
      await media.update({
        analytics: {
          ...media.analytics,
          processingTime,
        },
      });

      logInfo('Media uploaded successfully', {
        mediaId: media.id,
        fileName,
        size: file.buffer.length,
        processingTime,
      });

      return media.toJSON();
    } catch (error) {
      logError('Failed to upload media', error as Error, { userId, originalName: file.originalname });
      throw new Error('Failed to upload media');
    }
  }

  async associateMedia(
    mediaId: string,
    association: AssociationOptions
  ): Promise<void> {
    try {
      await MediaAssociation.create({
        mediaId,
        associatableType: association.associatableType,
        associatableId: association.associatableId,
        role: association.role || 'primary',
        order: association.order || 0,
      });

      logInfo('Media association created', { mediaId, association });
    } catch (error) {
      logError('Failed to create media association', error as Error, { mediaId, association });
      throw new Error('Failed to associate media');
    }
  }

  async getMediaByAssociation(
    associatableType: string,
    associatableId: string,
    role?: string
  ): Promise<MediaAttributes[]> {
    try {
      const whereClause: any = {
        associatableType,
        associatableId,
      };

      if (role) {
        whereClause.role = role;
      }

      const associations = await MediaAssociation.findAll({
        where: whereClause,
        include: [
          {
            model: Media,
            required: true,
          },
        ],
        order: [['order', 'ASC'], ['createdAt', 'ASC']],
      });

      return associations.map((assoc: any) => assoc.Media.toJSON());
    } catch (error) {
      logError('Failed to get media by association', error as Error, { associatableType, associatableId, role });
      return [];
    }
  }

  async getUserMedia(
    userId: string,
    options: {
      mimeType?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ media: MediaAttributes[]; total: number }> {
    try {
      const whereClause: any = { userId };

      if (options.mimeType) {
        whereClause.mimeType = { [Op.like]: `${options.mimeType}%` };
      }

      if (options.status) {
        whereClause.status = options.status;
      }

      const { count, rows } = await Media.findAndCountAll({
        where: whereClause,
        limit: options.limit || 50,
        offset: options.offset || 0,
        order: [['createdAt', 'DESC']],
      });

      return {
        media: rows.map(row => row.toJSON()),
        total: count,
      };
    } catch (error) {
      logError('Failed to get user media', error as Error, { userId, options });
      return { media: [], total: 0 };
    }
  }

  async generateVariants(mediaId: string): Promise<void> {
    try {
      const media = await Media.findByPk(mediaId);
      if (!media) {
        throw new Error('Media not found');
      }

      if (!this.isProcessableMedia(media.mimeType)) {
        logInfo('Media type not processable for variants', { mediaId, mimeType: media.mimeType });
        return;
      }

      // Download original file
      const originalUrl = media.publicUrl;
      if (!originalUrl) {
        throw new Error('No public URL available for media');
      }

      const response = await fetch(originalUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Generate variants
      const variants: MediaVariant[] = [];
      const sizes = [
        { name: 'thumbnail' as const, width: 150, height: 150 },
        { name: 'small' as const, width: 400, height: 400 },
        { name: 'medium' as const, width: 800, height: 600 },
        { name: 'large' as const, width: 1200, height: 900 },
      ];

      for (const size of sizes) {
        const processedBuffer = await sharp(buffer)
          .resize(size.width, size.height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85 })
          .toBuffer();

        // Upload variant
        const variantFileName = `${media.fileName.replace(/\.[^/.]+$/, '')}_${size.name}.jpg`;

        const uploadResult = await this.storageService.uploadFile(
          media.userId,
          {
            buffer: processedBuffer,
            originalname: variantFileName,
            mimetype: 'image/jpeg',
          } as Express.Multer.File,
          'processed' as any,
          { isPublic: media.isPublic }
        );

        const metadata = await sharp(processedBuffer).metadata();
        variants.push({
          size: size.name,
          url: uploadResult.url,
          width: metadata.width,
          height: metadata.height,
          fileSize: processedBuffer.length,
        });
      }

      // Add original as variant
      variants.push({
        size: 'original',
        url: originalUrl,
        width: media.metadata.width,
        height: media.metadata.height,
        fileSize: media.size,
      });

      await media.update({
        variants,
        status: 'ready',
      });

      logInfo('Variants generated successfully', { mediaId, variantCount: variants.length });
    } catch (error) {
      logError('Failed to generate variants', error as Error, { mediaId });
      
      // Update media status to failed
      await Media.update(
        { status: 'failed' },
        { where: { id: mediaId } }
      );
      
      throw error;
    }
  }

  async deleteMedia(mediaId: string, userId: string): Promise<void> {
    try {
      const media = await Media.findOne({
        where: { id: mediaId, userId },
      });

      if (!media) {
        throw new Error('Media not found or access denied');
      }

      // Delete from storage
      try {
        await this.storageService.deleteFile(media.storagePath);
      } catch (storageError) {
        logError('Failed to delete from storage', storageError as Error, { mediaId, storagePath: media.storagePath });
      }

      // Delete associations
      await MediaAssociation.destroy({
        where: { mediaId },
      });

      // Delete media record
      await media.destroy();

      logInfo('Media deleted successfully', { mediaId, userId });
    } catch (error) {
      logError('Failed to delete media', error as Error, { mediaId, userId });
      throw error;
    }
  }

  async getMediaAnalytics(userId: string): Promise<any> {
    try {
      const analytics = await Media.findAll({
        where: { userId },
        attributes: [
          'mimeType',
          'status',
          'storageProvider',
          'analytics',
          'createdAt',
        ],
      });

      const stats = {
        totalFiles: analytics.length,
        totalSize: analytics.reduce((sum, media) => sum + media.size, 0),
        byMimeType: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        uploadTrend: {} as Record<string, number>,
        averageProcessingTime: 0,
      };

      let totalProcessingTime = 0;
      let processedCount = 0;

      analytics.forEach(media => {
        // By mime type
        const mimeCategory = media.mimeType.split('/')[0];
        stats.byMimeType[mimeCategory] = (stats.byMimeType[mimeCategory] || 0) + 1;

        // By status
        stats.byStatus[media.status] = (stats.byStatus[media.status] || 0) + 1;

        // Upload trend (by month)
        const month = media.createdAt.toISOString().slice(0, 7);
        stats.uploadTrend[month] = (stats.uploadTrend[month] || 0) + 1;

        // Processing time
        if (media.analytics.processingTime) {
          totalProcessingTime += media.analytics.processingTime;
          processedCount++;
        }
      });

      if (processedCount > 0) {
        stats.averageProcessingTime = totalProcessingTime / processedCount;
      }

      return stats;
    } catch (error) {
      logError('Failed to get media analytics', error as Error, { userId });
      return null;
    }
  }

  private async extractMetadata(buffer: Buffer, mimeType: string): Promise<MediaMetadata> {
    const metadata: MediaMetadata = {};

    try {
      if (mimeType.startsWith('image/')) {
        // Extract EXIF data
        try {
          const exifData = ExifReader.load(buffer);
          
          // Basic image info from EXIF
          if (exifData['Image Width']) {
            metadata.width = Number(exifData['Image Width'].value);
          }
          if (exifData['Image Height']) {
            metadata.height = Number(exifData['Image Height'].value);
          }

          // Camera info
          if (exifData.Make || exifData.Model) {
            metadata.camera = {
              make: exifData.Make?.description,
              model: exifData.Model?.description,
            };
          }

          // GPS info
          if (exifData.GPSLatitude && exifData.GPSLongitude) {
            metadata.location = {
              latitude: Number(exifData.GPSLatitude.value),
              longitude: Number(exifData.GPSLongitude.value),
              altitude: exifData.GPSAltitude ? Number(exifData.GPSAltitude.value) : undefined,
            };
          }
        } catch (exifError) {
          // EXIF extraction failed, use Sharp for basic metadata
          const sharpMetadata = await sharp(buffer).metadata();
          metadata.width = sharpMetadata.width;
          metadata.height = sharpMetadata.height;
          metadata.colorProfile = sharpMetadata.icc ? 'ICC Profile Present' : undefined;
        }
      }
    } catch (error) {
      logError('Failed to extract metadata', error as Error, { mimeType });
    }

    return metadata;
  }

  private getCategoryFromMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'plant-image';
    if (mimeType.startsWith('video/')) return 'plant-video';
    if (mimeType === 'application/pdf') return 'soil-test';
    return 'document';
  }

  private isProcessableMedia(mimeType: string): boolean {
    return mimeType.startsWith('image/') && !mimeType.includes('svg');
  }
}