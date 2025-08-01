import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';
import sharp from 'sharp';
import { env } from '../config/environment';
import { MediaContext } from '../models/Media.model';

export class FileStorageService {
  private supabase: SupabaseClient<any, 'public', any>;
  private bucketName: string;

  constructor() {
    if (!env.SUPABASE_URL) {
      throw new Error('SUPABASE_URL environment variable is required');
    }
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    }

    this.supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    );
    this.bucketName = env.SUPABASE_STORAGE_BUCKET;
    this.initializeBucket();
  }

  private async initializeBucket() {
    try {
      // Check if bucket exists
      const { data: buckets } = await this.supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        // Create bucket if it doesn't exist
        const { error } = await this.supabase.storage.createBucket(this.bucketName, {
          public: false, // Set to true if you want files to be publicly accessible
          fileSizeLimit: 52428800, // 50MB in bytes
          allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          ]
        });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error initializing storage bucket:', error);
      throw new Error('Failed to initialize storage bucket');
    }
  }

  /**
   * Dynamic hierarchical file upload
   * Path format: {category}/{subcategory?}/{contextId}/{entityId?}/{filename}
   */
  async uploadFile(
    file: Express.Multer.File, 
    context: MediaContext,
    options?: {
      generateThumbnail?: boolean;
      metadata?: Record<string, any>;
      isPublic?: boolean;
      customFileName?: string;
    }
  ) {
    try {
      const fileExt = file.originalname.split('.').pop();
      const customFileName = options?.customFileName || `${uuid()}.${fileExt}`;
      
      // Build hierarchical path
      const pathParts = [context.category];
      if (context.subcategory) pathParts.push(context.subcategory);
      pathParts.push(context.contextId);
      if (context.entityId) pathParts.push(context.entityId);
      pathParts.push(customFileName);
      
      const fileName = pathParts.join('/');
      let thumbnailUrl: string | undefined;

      // Generate thumbnail for images if requested
      if (options?.generateThumbnail && file.mimetype.startsWith('image/')) {
        const thumbnailBuffer = await sharp(file.buffer)
          .resize(300, 300, { fit: 'inside' })
          .toBuffer();
        
        const thumbnailName = `processed/thumbnails/${fileName}`;
        const { error: thumbnailError } = await this.supabase.storage
          .from(this.bucketName)
          .upload(thumbnailName, thumbnailBuffer, {
            contentType: file.mimetype,
            upsert: true,
            cacheControl: '3600',
            ...(options.metadata && { customMetadata: options.metadata })
          });

        if (thumbnailError) throw thumbnailError;

        if (options?.isPublic) {
          const { data: thumbnailData } = await this.supabase.storage
            .from(this.bucketName)
            .getPublicUrl(thumbnailName);
          thumbnailUrl = thumbnailData.publicUrl;
        } else {
          const { data: signedUrl } = await this.supabase.storage
            .from(this.bucketName)
            .createSignedUrl(thumbnailName, 3600); // 1 hour expiry
          thumbnailUrl = signedUrl?.signedUrl;
        }
      }

      // Upload original file
      const { error: uploadError } = await this.supabase.storage
        .from(this.bucketName)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
          cacheControl: '3600',
          ...(options?.metadata && { customMetadata: options.metadata })
        });

      if (uploadError) throw uploadError;

      let fileUrl: string;
      if (options?.isPublic) {
        const { data } = await this.supabase.storage
          .from(this.bucketName)
          .getPublicUrl(fileName);
        fileUrl = data.publicUrl;
      } else {
        const { data: signedUrl } = await this.supabase.storage
          .from(this.bucketName)
          .createSignedUrl(fileName, 3600); // 1 hour expiry
        fileUrl = signedUrl?.signedUrl || '';
      }

      return {
        url: fileUrl,
        thumbnailUrl,
        fileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }

  async deleteFile(filePath: string) {
    try {
      // Also try to delete thumbnail if it exists
      const thumbnailPath = `thumbnails/${filePath}`;
      await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath, thumbnailPath]);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  async moveFile(fromPath: string, toPath: string) {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .move(fromPath, toPath);

      if (error) throw error;
    } catch (error) {
      console.error('Error moving file:', error);
      throw new Error('Failed to move file');
    }
  }

  async copyFile(fromPath: string, toPath: string) {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .copy(fromPath, toPath);

      if (error) throw error;
    } catch (error) {
      console.error('Error copying file:', error);
      throw new Error('Failed to copy file');
    }
  }

  async listFiles(prefix?: string) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(prefix || '');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error('Failed to list files');
    }
  }

  async generateSignedUrl(filePath: string, expiresIn = 3600) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  async getPublicUrl(filePath: string) {
    try {
      const { data } = await this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error getting public URL:', error);
      throw new Error('Failed to get public URL');
    }
  }

  // Helper methods for creating media contexts
  static createUserProfileContext(userId: string): MediaContext {
    return {
      category: 'users',
      subcategory: 'profiles',
      contextId: userId,
    };
  }

  static createLivestockContext(farmId: string, animalType: string, recordId: string): MediaContext {
    return {
      category: 'livestock',
      subcategory: animalType, // cattle, poultry, swine, etc.
      contextId: farmId,
      entityId: recordId,
    };
  }

  static createCropContext(farmId: string, purpose: string, fieldId: string, entityId?: string): MediaContext {
    return {
      category: 'crops',
      subcategory: purpose, // identification, health, harvest, etc.
      contextId: farmId,
      entityId: entityId || fieldId,
    };
  }

  static createSoilAnalysisContext(farmId: string, analysisType: string, locationId: string): MediaContext {
    return {
      category: 'soil-analysis',
      subcategory: analysisType, // tests, sand-analysis, composition, etc.
      contextId: farmId,
      entityId: locationId,
    };
  }

  static createInfrastructureContext(farmId: string, infrastructureType: string, entityId: string): MediaContext {
    return {
      category: 'infrastructure',
      subcategory: infrastructureType, // buildings, equipment, irrigation, etc.
      contextId: farmId,
      entityId: entityId,
    };
  }

  static createDocumentationContext(farmId: string, docType: string, entityId: string): MediaContext {
    return {
      category: 'documentation',
      subcategory: docType, // procedures, compliance, reports, etc.
      contextId: farmId,
      entityId: entityId,
    };
  }

  // S3 compatibility methods
  async getS3Credentials() {
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials are not configured');
    }

    return {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      bucket: this.bucketName,
      endpoint: `${env.SUPABASE_URL}/storage/v1`,
    };
  }
} 