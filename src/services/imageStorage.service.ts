import sharp from 'sharp';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { env } from '../config/environment';
import { logError, logInfo } from '../utils/logger';

export interface ImageMetadata {
  originalName: string;
  mimeType: string;
  size: number;
  dimensions: {
    width: number;
    height: number;
  };
  hash: string;
}

export class ImageStorageService {
  private readonly uploadDir: string;
  private readonly thumbnailDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'images');
    this.thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails');
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    await fs.mkdir(this.thumbnailDir, { recursive: true });
  }

  private async generateHash(buffer: Buffer): Promise<string> {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  public async uploadImage(buffer: Buffer, metadata: Partial<ImageMetadata>): Promise<{ url: string; metadata: ImageMetadata }> {
    try {
      // Process image with sharp
      const image = sharp(buffer);
      const imageInfo = await image.metadata();
      
      // Generate hash
      const hash = await this.generateHash(buffer);
      
      // Create filename
      const ext = path.extname(metadata.originalName || '').toLowerCase() || '.jpg';
      const filename = `${hash}${ext}`;
      
      // Save original image
      const imagePath = path.join(this.uploadDir, filename);
      await image.toFile(imagePath);
      
      // Generate and save thumbnail
      const thumbnailPath = path.join(this.thumbnailDir, filename);
      await image
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFile(thumbnailPath);
      
      // Construct URLs (in production these would be CDN URLs)
      const baseUrl = env.NODE_ENV === 'production' 
        ? env.CDN_URL || `https://${env.HOST}/uploads`
        : `http://localhost:${env.PORT}/uploads`;
      
      const imageUrl = `${baseUrl}/images/${filename}`;
      const thumbnailUrl = `${baseUrl}/thumbnails/${filename}`;
      
      const fullMetadata: ImageMetadata = {
        originalName: metadata.originalName || filename,
        mimeType: imageInfo.format || 'jpeg',
        size: buffer.length,
        dimensions: {
          width: imageInfo.width || 0,
          height: imageInfo.height || 0
        },
        hash
      };

      logInfo('Image uploaded successfully', {
        filename,
        size: buffer.length,
        dimensions: fullMetadata.dimensions
      });

      return {
        url: imageUrl,
        metadata: fullMetadata
      };
    } catch (error) {
      logError('Failed to upload image', error as Error);
      throw new Error('Failed to process and store image');
    }
  }

  public async deleteImage(filename: string): Promise<void> {
    try {
      const imagePath = path.join(this.uploadDir, filename);
      const thumbnailPath = path.join(this.thumbnailDir, filename);
      
      await Promise.all([
        fs.unlink(imagePath).catch(() => {}),
        fs.unlink(thumbnailPath).catch(() => {})
      ]);

      logInfo('Image deleted successfully', { filename });
    } catch (error) {
      logError('Failed to delete image', error as Error);
      throw new Error('Failed to delete image');
    }
  }

  public async createThumbnail(imageUrl: string): Promise<string> {
    try {
      const filename = path.basename(imageUrl);
      const thumbnailPath = path.join(this.thumbnailDir, filename);
      
      // Check if thumbnail already exists
      try {
        await fs.access(thumbnailPath);
        const baseUrl = env.NODE_ENV === 'production'
          ? env.CDN_URL || `https://${env.HOST}/uploads`
          : `http://localhost:${env.PORT}/uploads`;
        return `${baseUrl}/thumbnails/${filename}`;
      } catch {
        // Thumbnail doesn't exist, create it
      }
      
      // Download image
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      
      // Create thumbnail
      await sharp(Buffer.from(buffer))
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFile(thumbnailPath);
      
      const baseUrl = env.NODE_ENV === 'production'
        ? env.CDN_URL || `https://${env.HOST}/uploads`
        : `http://localhost:${env.PORT}/uploads`;
      
      return `${baseUrl}/thumbnails/${filename}`;
    } catch (error) {
      logError('Failed to create thumbnail', error as Error);
      throw new Error('Failed to create thumbnail');
    }
  }
} 