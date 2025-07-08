import { createClient, RedisClientType } from 'redis';
import { env } from './environment';
import { logError, logInfo } from '../utils/logger';

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
      const redisUrl = env.REDIS_URL.replace(/\/\/.*@/, '//***:***@');
      logInfo('Redis connecting', { 
        env: env.NODE_ENV,
        url: redisUrl,
        tls: env.NODE_ENV === 'production'
      });
    });

    this.client.on('ready', () => {
      logInfo('Redis ready and connected');
      this.isConnected = true;
    });

    this.client.on('error', (error: Error) => {
      logError('Redis error', error, {
        isConnected: this.isConnected
      });
      this.isConnected = false;
    });

    this.client.on('end', () => {
      logInfo('Redis disconnected');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logInfo('Redis reconnecting', {
        isConnected: this.isConnected,
        env: env.NODE_ENV
      });
    });
  }

  async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        logInfo('Attempting Redis connection');
        await this.client.connect();
        logInfo('Redis connection successful');
      }
    } catch (error) {
      logError('Failed to connect to Redis', error as Error, {
        isConnected: this.isConnected,
        env: env.NODE_ENV
      });
      // Don't throw connection errors in production
      if (env.NODE_ENV !== 'production') {
        throw error;
      }
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
      if (expireInSeconds) {
        await this.client.setEx(key, expireInSeconds, value);
        logInfo('Redis SET with expiry', { key, expireInSeconds });
      } else {
        await this.client.set(key, value);
        logInfo('Redis SET', { key });
      }
    } catch (error) {
      logError('Redis SET error', error as Error, { key });
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const value = await this.client.get(key);
      logInfo('Redis GET', { key, exists: value !== null });
      return value;
    } catch (error) {
      logError('Redis GET error', error as Error, { key });
      throw error;
    }
  }

  async del(key: string): Promise<number> {
    try {
      const result = await this.client.del(key);
      logInfo('Redis DEL', { key, deleted: result > 0 });
      return result;
    } catch (error) {
      logError('Redis DEL error', error as Error, { key });
      throw error;
    }
  }

  async exists(key: string): Promise<number> {
    try {
      const result = await this.client.exists(key);
      logInfo('Redis EXISTS', { key, exists: result > 0 });
      return result;
    } catch (error) {
      logError('Redis EXISTS error', error as Error, { key });
      throw error;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      logInfo('Redis EXPIRE', { key, seconds, success: result });
      return result;
    } catch (error) {
      logError('Redis EXPIRE error', error as Error, { key, seconds });
      throw error;
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