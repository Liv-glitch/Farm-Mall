import { Queue, Worker, Job } from 'bullmq';
import { redisClient } from '../config/redis';
import { logInfo, logError } from '../utils/logger';

export interface MediaProcessingJobData {
  mediaId: string;
  options: {
    generateVariants?: boolean;
    aiAnalysis?: boolean;
    customSizes?: Array<{ width: number; height: number; name: string }>;
  };
}

export class MediaProcessorQueue {
  private queue: Queue<MediaProcessingJobData> | null = null;
  private worker: Worker<MediaProcessingJobData> | null = null;
  private isRedisAvailable: boolean = false;

  constructor() {
    this.initializeIfRedisAvailable();
  }

  private async initializeIfRedisAvailable(): Promise<void> {
    try {
      // Check if Redis is connected
      if (redisClient.isClientConnected()) {
        this.isRedisAvailable = true;
        this.initializeQueue();
      } else {
        logInfo('Redis not available, media processing queue disabled - will process synchronously');
        this.isRedisAvailable = false;
      }
    } catch (error) {
      logError('Failed to initialize media processor queue - continuing without queue', error as Error);
      this.isRedisAvailable = false;
    }
  }

  private initializeQueue(): void {
    try {
      const connection = redisClient.getClient();

      // Initialize queue
      this.queue = new Queue<MediaProcessingJobData>('media-processing', {
        connection: connection as any,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      // Initialize worker
      this.worker = new Worker<MediaProcessingJobData>(
        'media-processing',
        this.processMediaJob.bind(this),
        {
          connection: connection as any,
          concurrency: 5,
          limiter: {
            max: 10,
            duration: 60000, // 10 jobs per minute
          },
        }
      );

      this.setupEventHandlers();
      logInfo('Media processor queue initialized successfully');
    } catch (error) {
      logError('Failed to initialize media processor queue - disabling queue functionality', error as Error);
      this.isRedisAvailable = false;
      this.queue = null;
      this.worker = null;
    }
  }

  async addProcessingJob(
    mediaId: string,
    options: MediaProcessingJobData['options'],
    priority: number = 0
  ): Promise<Job<MediaProcessingJobData> | null> {
    try {
      if (!this.isRedisAvailable || !this.queue) {
        logInfo('Redis not available, processing media synchronously', { mediaId });
        // Process synchronously when Redis is not available
        await this.processSynchronously(mediaId, options);
        return null;
      }

      const job = await this.queue.add(
        'process-media',
        { mediaId, options },
        {
          priority,
          delay: 1000, // Small delay to ensure database consistency
        }
      );

      logInfo('Media processing job added', { mediaId, jobId: job.id, options });
      return job;
    } catch (error) {
      logError('Failed to add media processing job, falling back to synchronous processing', error as Error, { mediaId, options });
      // Fallback to synchronous processing if queue fails
      try {
        await this.processSynchronously(mediaId, options);
      } catch (syncError) {
        logError('Synchronous media processing also failed', syncError as Error, { mediaId });
      }
      return null;
    }
  }

  // Process media synchronously when Redis/queue is not available
  private async processSynchronously(mediaId: string, options: MediaProcessingJobData['options']): Promise<void> {
    try {
      logInfo('Processing media synchronously', { mediaId, options });
      
      // Import service dynamically to avoid circular dependency
      const { EnterpriseMediaService } = await import('../services/enterprise-media.service');
      const mediaService = new EnterpriseMediaService();

      // Generate variants if requested
      if (options.generateVariants) {
        await mediaService.generateVariants(mediaId);
      }

      // AI analysis if requested
      if (options.aiAnalysis) {
        await this.performAIAnalysis(mediaId);
      }

      logInfo('Synchronous media processing completed', { mediaId });
    } catch (error) {
      logError('Synchronous media processing failed', error as Error, { mediaId });
      throw error;
    }
  }

  private async processMediaJob(job: Job<MediaProcessingJobData>): Promise<void> {
    const { mediaId, options } = job.data;

    try {
      logInfo('Processing media job started', { mediaId, jobId: job.id, options });

      // Import service dynamically to avoid circular dependency
      const { EnterpriseMediaService } = await import('../services/enterprise-media.service');
      const mediaService = new EnterpriseMediaService();

      // Generate variants if requested
      if (options.generateVariants) {
        await mediaService.generateVariants(mediaId);
      }

      // AI analysis if requested
      if (options.aiAnalysis) {
        await this.performAIAnalysis(mediaId);
      }

      logInfo('Media processing job completed', { mediaId, jobId: job.id });
    } catch (error) {
      logError('Media processing job failed', error as Error, { mediaId, jobId: job.id });
      throw error;
    }
  }

  private async performAIAnalysis(mediaId: string): Promise<void> {
    try {
      // This would integrate with AI services for image analysis
      // For now, it's a placeholder that could integrate with:
      // - Plant.id API for plant identification
      // - Custom ML models for disease detection
      // - OpenAI Vision API for general image analysis
      
      logInfo('AI analysis placeholder', { mediaId });
      
      // Example integration would look like:
      /*
      const media = await Media.findByPk(mediaId);
      if (media && media.mimeType.startsWith('image/')) {
        const analysisResults = await plantIdService.identifyPlant(media.publicUrl);
        await media.update({
          metadata: {
            ...media.metadata,
            aiGenerated: {
              confidence: analysisResults.confidence,
              predictions: analysisResults.predictions,
            },
          },
        });
      }
      */
    } catch (error) {
      logError('AI analysis failed', error as Error, { mediaId });
      // Don't throw error for AI analysis failures, as it's supplementary
    }
  }

  private setupEventHandlers(): void {
    if (!this.worker || !this.queue) return;

    this.worker.on('completed', (job: Job<MediaProcessingJobData>) => {
      logInfo('Media processing job completed', { 
        mediaId: job.data.mediaId, 
        jobId: job.id,
        duration: job.finishedOn ? job.finishedOn - job.processedOn! : 0,
      });
    });

    this.worker.on('failed', (job: Job<MediaProcessingJobData> | undefined, error: Error) => {
      logError('Media processing job failed', error, { 
        mediaId: job?.data.mediaId, 
        jobId: job?.id,
        attempts: job?.attemptsMade,
      });
    });

    this.worker.on('stalled', (jobId: string) => {
      logError('Media processing job stalled', new Error('Job stalled'), { jobId });
    });

    this.queue.on('error', (error: Error) => {
      logError('Media processing queue error', error);
    });
  }

  async getQueueStats(): Promise<any> {
    try {
      if (!this.isRedisAvailable || !this.queue) {
        return { status: 'Redis not available' };
      }

      const waiting = await this.queue.getWaiting();
      const active = await this.queue.getActive();
      const completed = await this.queue.getCompleted();
      const failed = await this.queue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        stats: await this.queue.getJobCounts(),
      };
    } catch (error) {
      logError('Failed to get queue stats', error as Error);
      return { error: 'Failed to get queue stats' };
    }
  }

  async close(): Promise<void> {
    try {
      if (this.worker) {
        await this.worker.close();
      }
      if (this.queue) {
        await this.queue.close();
      }
      logInfo('Media processor queue closed');
    } catch (error) {
      logError('Error closing media processor queue', error as Error);
    }
  }
}