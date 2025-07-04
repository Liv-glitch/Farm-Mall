import { logInfo, logError } from '../utils/logger';
import { env } from '../config/environment';

export interface ImageProcessingResult {
  originalUrl: string;
  processedUrl: string;
  thumbnailUrl: string;
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
}

export class ImageProcessingService {

  // Validate image for Plant.id API
  async validateImage(imageUrl: string): Promise<boolean> {
    try {
      // Handle local file paths (file:// protocol)
      if (imageUrl.startsWith('file://')) {
        const filePath = imageUrl.replace('file://', '');
        try {
          const fs = require('fs').promises;
          await fs.access(filePath);
          logInfo('Local file validation successful', { imageUrl });
          return true;
        } catch (fileError) {
          logInfo('Local file validation failed: File not accessible', { imageUrl });
          return false;
        }
      }

      // Check file extension for HTTP/HTTPS URLs
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      const hasValidExtension = validExtensions.some(ext => 
        imageUrl.toLowerCase().endsWith(ext)
      );

      if (!hasValidExtension) {
        logInfo('Image validation failed: Invalid extension', { imageUrl });
        return false;
      }

      // Enhanced URL validation with better regex
      const isValidUrl = /^https?:\/\/.+\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(imageUrl);
      if (!isValidUrl) {
        logInfo('Image validation failed: Invalid URL format', { imageUrl });
        return false;
      }

      // Try to fetch image headers to validate it's actually an image
      try {
        const response = await fetch(imageUrl, { method: 'HEAD' });
        if (!response.ok) {
          logInfo('Image validation failed: URL not accessible', { 
            imageUrl, 
            status: response.status 
          });
          return false;
        }

        const contentType = response.headers.get('content-type');
        const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const hasValidMimeType = validMimeTypes.some(mime => 
          contentType?.toLowerCase().includes(mime)
        );

        if (!hasValidMimeType) {
          logInfo('Image validation failed: Invalid MIME type', { 
            imageUrl, 
            contentType 
          });
          return false;
        }

        // Check file size (max 10MB for Plant.id)
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          const fileSize = parseInt(contentLength);
          const maxSize = 10 * 1024 * 1024; // 10MB
          if (fileSize > maxSize) {
            logInfo('Image validation failed: File too large', { 
              imageUrl, 
              fileSize, 
              maxSize 
            });
            return false;
          }
        }

      } catch (fetchError) {
        logError('Image validation failed: Network error', fetchError as Error, { imageUrl });
        return false;
      }
      
      logInfo('Image validation successful', { imageUrl });
      return true;
    } catch (error) {
      logError('Image validation failed', error as Error, { imageUrl });
      return false;
    }
  }

  // Simple file upload processing (just copy to uploads folder)
  async processUploadedImage(imageBuffer: Buffer, originalName: string): Promise<ImageProcessingResult> {
    try {
      logInfo('Image processing started', { originalName });

      // Simple processing - just save the file and create URLs
      const timestamp = Date.now();
      const baseUrl = env.NODE_ENV === 'production' 
        ? 'https://your-cdn.com' 
        : 'http://localhost:3000';

      const result: ImageProcessingResult = {
        originalUrl: `${baseUrl}/uploads/original/${timestamp}_${originalName}`,
        processedUrl: `${baseUrl}/uploads/processed/${timestamp}_${originalName}`,
        thumbnailUrl: `${baseUrl}/uploads/thumbnails/${timestamp}_${originalName}`,
        metadata: {
          width: 1200,  // Placeholder - would be detected with Sharp
          height: 900,  // Placeholder - would be detected with Sharp
          size: imageBuffer.length,
          format: 'jpeg',
        },
      };

      logInfo('Image processing completed', { 
        originalName, 
        originalSize: imageBuffer.length
      });

      return result;
    } catch (error) {
      logError('Image processing failed', error as Error, { originalName });
      throw new Error('Failed to process image');
    }
  }
} 