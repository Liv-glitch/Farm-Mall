import { createClient, RedisClientType } from 'redis';
import { env } from './environment';
import { logError, logInfo } from '../utils/logger';

// Cache TTL values (in seconds)
const CACHE_TTL = {
  IDENTIFICATION: 7 * 24 * 60 * 60, // 7 days
  HEALTH: 7 * 24 * 60 * 60,        // 7 days
  HISTORY: 30 * 24 * 60 * 60,      // 30 days
  RECENT: 24 * 60 * 60             // 1 day
};

// Redis key patterns
const REDIS_KEYS = {
  PLANT_ID: (userId: string, imageHash: string) => `plant_id:${userId}:${imageHash}`,
  HEALTH_ASSESSMENT: (userId: string, imageHash: string) => `health:${userId}:${imageHash}`,
  USER_HISTORY: (userId: string) => `history:${userId}`,
  RECENT_SEARCHES: 'recent_searches'
};

class RedisClient {
  private client: RedisClientType;
  private isConnected: boolean = false;
  private readonly maxRetries = 20;

  constructor() {
    const isProduction = env.NODE_ENV === 'production';

    this.client = createClient({
      url: env.REDIS_URL,
      socket: {
        // More aggressive reconnection for Render's environment
        reconnectStrategy: (retries) => {
          if (retries > this.maxRetries) {
            logError(`Redis max retries (${this.maxRetries}) reached, giving up`);
            return new Error('Redis max retries reached');
          }
          const delay = Math.min(retries * 200, 5000); // Increased delay between retries
          logInfo(`Redis reconnecting`, { attempt: retries, maxAttempts: this.maxRetries, delayMs: delay });
          return delay;
        },
        connectTimeout: 30000, // 30 seconds
        keepAlive: 30000, // Send keepalive every 30 seconds
        noDelay: true, // Disable Nagle's algorithm
        timeout: 30000, // Socket timeout
        tls: isProduction,
        rejectUnauthorized: false // Required for Render Redis
      },
      // Add command timeout
      commandsQueueMaxLength: 100,
      readonly: false, // Ensure we're not in readonly mode
      legacyMode: false // Ensure we're using the new API
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.client.on('connect', () => {
      try {
        const redisUrl = env.REDIS_URL.replace(/\/\/.*@/, '//***:***@');
        logInfo('Redis connecting', { 
          env: env.NODE_ENV,
          url: redisUrl,
          tls: env.NODE_ENV === 'production'
        });
      } catch (error) {
        // Prevent any errors in event handler from crashing the app
        console.error('Error in Redis connect handler:', error);
      }
    });

    this.client.on('ready', () => {
      try {
        logInfo('Redis ready and connected');
        this.isConnected = true;
      } catch (error) {
        console.error('Error in Redis ready handler:', error);
      }
    });

    this.client.on('error', (error: Error) => {
      try {
        logError('Redis error', error, {
          isConnected: this.isConnected
        });
        this.isConnected = false;
      } catch (handlerError) {
        // Fallback to console if logger fails
        console.error('Redis error:', error);
        console.error('Error in Redis error handler:', handlerError);
        this.isConnected = false;
      }
    });

    this.client.on('end', () => {
      try {
        logInfo('Redis disconnected');
        this.isConnected = false;
      } catch (error) {
        console.error('Error in Redis end handler:', error);
        this.isConnected = false;
      }
    });

    this.client.on('reconnecting', () => {
      try {
        logInfo('Redis reconnecting', {
          isConnected: this.isConnected,
          env: env.NODE_ENV
        });
      } catch (error) {
        console.error('Error in Redis reconnecting handler:', error);
      }
    });
  }

  async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        logInfo('Attempting Redis connection');
        // Add timeout to connection attempt
        const connectPromise = this.client.connect();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Redis connection timeout after 10s')), 10000);
        });
        
        await Promise.race([connectPromise, timeoutPromise]);
        logInfo('Redis connection successful');
      }
    } catch (error) {
      logError('Failed to connect to Redis', error as Error, {
        isConnected: this.isConnected,
        env: env.NODE_ENV
      });
      // Always throw error to let caller handle it
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.disconnect();
        logInfo('Redis disconnected successfully');
      }
    } catch (error) {
      logError('Error disconnecting from Redis', error as Error);
      throw error;
    }
  }

  // Get the Redis client instance
  getClient(): RedisClientType {
    return this.client;
  }

  // Check if connected
  isClientConnected(): boolean {
    return this.isConnected;
  }

  // Cache methods
  async set(key: string, value: string, expireInSeconds?: number): Promise<void> {
    try {
      if (!this.isConnected) {
        logInfo('Redis not connected, skipping SET operation', { key });
        return;
      }
      
      if (expireInSeconds) {
        await this.client.setEx(key, expireInSeconds, value);
        logInfo('Redis SET with expiry', { key, expireInSeconds });
      } else {
        await this.client.set(key, value);
        logInfo('Redis SET', { key });
      }
    } catch (error) {
      logError('Redis SET error', error as Error, { key });
      // Don't throw error, just log it to prevent server crashes
      this.isConnected = false;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.isConnected) {
        logInfo('Redis not connected, returning null for GET operation', { key });
        return null;
      }
      
      const value = await this.client.get(key);
      logInfo('Redis GET', { key, exists: value !== null });
      return value;
    } catch (error) {
      logError('Redis GET error', error as Error, { key });
      this.isConnected = false;
      return null; // Return null instead of throwing
    }
  }

  async del(key: string): Promise<number> {
    try {
      if (!this.isConnected) {
        logInfo('Redis not connected, skipping DEL operation', { key });
        return 0;
      }
      
      const result = await this.client.del(key);
      logInfo('Redis DEL', { key, deleted: result > 0 });
      return result;
    } catch (error) {
      logError('Redis DEL error', error as Error, { key });
      this.isConnected = false;
      return 0; // Return 0 instead of throwing
    }
  }

  async exists(key: string): Promise<number> {
    try {
      if (!this.isConnected) {
        logInfo('Redis not connected, returning 0 for EXISTS operation', { key });
        return 0;
      }
      
      const result = await this.client.exists(key);
      logInfo('Redis EXISTS', { key, exists: result > 0 });
      return result;
    } catch (error) {
      logError('Redis EXISTS error', error as Error, { key });
      this.isConnected = false;
      return 0; // Return 0 instead of throwing
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        logInfo('Redis not connected, skipping EXPIRE operation', { key, seconds });
        return false;
      }
      
      const result = await this.client.expire(key, seconds);
      logInfo('Redis EXPIRE', { key, seconds, success: result });
      return result;
    } catch (error) {
      logError('Redis EXPIRE error', error as Error, { key, seconds });
      this.isConnected = false;
      return false; // Return false instead of throwing
    }
  }

  // Session management methods
  async setSession(sessionId: string, sessionData: object, expireInSeconds: number = 86400): Promise<void> {
    const key = `session:${sessionId}`;
    await this.set(key, JSON.stringify(sessionData), expireInSeconds);
    logInfo('Redis session stored', { sessionId, expireInSeconds });
  }

  async getSession(sessionId: string): Promise<object | null> {
    const key = `session:${sessionId}`;
    const sessionData = await this.get(key);
    logInfo('Redis session retrieved', { sessionId, exists: sessionData !== null });
    return sessionData ? JSON.parse(sessionData) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.del(key);
    logInfo('Redis session deleted', { sessionId });
  }

  // Token blacklist methods
  async blacklistToken(token: string, expireInSeconds: number): Promise<void> {
    const key = `blacklist:${token}`;
    await this.set(key, 'blacklisted', expireInSeconds);
    logInfo('Token blacklisted', { tokenKey: key, expireInSeconds });
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:${token}`;
    const exists = await this.exists(key);
    logInfo('Token blacklist check', { tokenKey: key, isBlacklisted: exists === 1 });
    return exists === 1;
  }

  // Rate limiting methods
  async incrementRateLimit(identifier: string, windowMs: number): Promise<number> {
    const key = `ratelimit:${identifier}`;
    const current = await this.client.incr(key);
    
    if (current === 1) {
      await this.expire(key, Math.ceil(windowMs / 1000));
    }
    
    logInfo('Rate limit incremented', { identifier, current, windowMs });
    return current;
  }

  async getRateLimitCount(identifier: string): Promise<number> {
    const key = `ratelimit:${identifier}`;
    const count = await this.get(key);
    const result = count ? parseInt(count, 10) : 0;
    logInfo('Rate limit count retrieved', { identifier, count: result });
    return result;
  }

  // Cache plant identification result
  async cachePlantIdentification(userId: string, imageHash: string, result: any): Promise<void> {
    const key = REDIS_KEYS.PLANT_ID(userId, imageHash);
    await this.client.setEx(key, CACHE_TTL.IDENTIFICATION, JSON.stringify(result));
    
    // Add to user's history
    const historyKey = REDIS_KEYS.USER_HISTORY(userId);
    await this.client.zAdd(historyKey, {
      score: Date.now(),
      value: JSON.stringify({
        type: 'identification',
        imageHash,
        timestamp: new Date().toISOString(),
        result: {
          scientificName: result.result?.classification?.suggestions?.[0]?.name,
          confidence: result.result?.classification?.suggestions?.[0]?.probability
        }
      })
    });
    
    // Trim history to last 100 entries
    await this.client.zRemRangeByRank(historyKey, 0, -101);
    
    // Set history expiry
    await this.client.expire(historyKey, CACHE_TTL.HISTORY);
  }

  // Get cached plant identification
  async getCachedPlantIdentification(userId: string, imageHash: string): Promise<any | null> {
    const key = REDIS_KEYS.PLANT_ID(userId, imageHash);
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Cache health assessment result
  async cacheHealthAssessment(userId: string, imageHash: string, result: any): Promise<void> {
    const key = REDIS_KEYS.HEALTH_ASSESSMENT(userId, imageHash);
    await this.client.setEx(key, CACHE_TTL.HEALTH, JSON.stringify(result));
    
    // Add to user's history
    const historyKey = REDIS_KEYS.USER_HISTORY(userId);
    await this.client.zAdd(historyKey, {
      score: Date.now(),
      value: JSON.stringify({
        type: 'health',
        imageHash,
        timestamp: new Date().toISOString(),
        result: {
          isHealthy: result.result?.health_assessment?.is_healthy?.binary,
          diseases: result.result?.health_assessment?.diseases?.map((d: any) => d.name)
        }
      })
    });
    
    // Trim history to last 100 entries
    await this.client.zRemRangeByRank(historyKey, 0, -101);
    
    // Set history expiry
    await this.client.expire(historyKey, CACHE_TTL.HISTORY);
  }

  // Get cached health assessment
  async getCachedHealthAssessment(userId: string, imageHash: string): Promise<any | null> {
    const key = REDIS_KEYS.HEALTH_ASSESSMENT(userId, imageHash);
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Get user's search history
  async getUserHistory(userId: string, page: number = 1, limit: number = 10): Promise<any[]> {
    const historyKey = REDIS_KEYS.USER_HISTORY(userId);
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    
    const results = await this.client.zRange(historyKey, start, end, { REV: true });
    return results.map((result: string) => JSON.parse(result));
  }

  // Add to recent global searches
  async addToRecentSearches(searchData: any): Promise<void> {
    const key = REDIS_KEYS.RECENT_SEARCHES;
    await this.client.zAdd(key, {
      score: Date.now(),
      value: JSON.stringify(searchData)
    });
    
    // Keep only last 1000 searches
    await this.client.zRemRangeByRank(key, 0, -1001);
    
    // Set expiry
    await this.client.expire(key, CACHE_TTL.RECENT);
  }

  // Get recent global searches
  async getRecentSearches(limit: number = 10): Promise<any[]> {
    const key = REDIS_KEYS.RECENT_SEARCHES;
    const results = await this.client.zRange(key, 0, limit - 1, { REV: true });
    return results.map((result: string) => JSON.parse(result));
  }
}

// Create and export Redis client instance
export const redisClient = new RedisClient();

// Export Redis connection functions
export const connectRedis = async (): Promise<void> => {
  await redisClient.connect();
};

export const disconnectRedis = async (): Promise<void> => {
  await redisClient.disconnect();
};

export default redisClient;