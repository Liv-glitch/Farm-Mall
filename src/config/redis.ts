import { createClient, RedisClientType } from 'redis';
import { env } from './environment';

class RedisClient {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    const isProduction = env.NODE_ENV === 'production';

    this.client = createClient({
      url: env.REDIS_URL,
      socket: {
        // More aggressive reconnection for Render's environment
        reconnectStrategy: (retries) => {
          if (retries > 50) {
            console.error('❌ Redis max retries reached, giving up');
            return new Error('Redis max retries reached');
          }
          const delay = Math.min(retries * 100, 3000);
          console.log(`Reconnecting to Redis in ${delay}ms... (attempt ${retries})`);
          return delay;
        },
        connectTimeout: 20000, // Increased timeout for Render's environment
        tls: isProduction,
        rejectUnauthorized: false // Required for Render Redis
      }
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.client.on('connect', () => {
      console.log('🔗 Connecting to Redis...', { 
        env: env.NODE_ENV,
        url: env.REDIS_URL.replace(/\/\/.*@/, '//***:***@') // Hide credentials in logs
      });
    });

    this.client.on('ready', () => {
      console.log('✅ Redis client ready');
      this.isConnected = true;
    });

    this.client.on('error', (error: Error) => {
      console.error('❌ Redis client error:', error);
      this.isConnected = false;
      // Don't throw on connection errors, let the retry strategy handle it
      if (!error.message.includes('ECONNREFUSED') && !error.message.includes('Connection timeout')) {
        throw error;
      }
    });

    this.client.on('end', () => {
      console.log('🔌 Redis client disconnected');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis client reconnecting...');
    });
  }

  async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.client.connect();
      }
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
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
      }
    } catch (error) {
      console.error('❌ Error disconnecting from Redis:', error);
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
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error('❌ Redis SET error:', error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('❌ Redis GET error:', error);
      throw error;
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      console.error('❌ Redis DEL error:', error);
      throw error;
    }
  }

  async exists(key: string): Promise<number> {
    try {
      return await this.client.exists(key);
    } catch (error) {
      console.error('❌ Redis EXISTS error:', error);
      throw error;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      return await this.client.expire(key, seconds);
    } catch (error) {
      console.error('❌ Redis EXPIRE error:', error);
      throw error;
    }
  }

  // Session management methods
  async setSession(sessionId: string, sessionData: object, expireInSeconds: number = 86400): Promise<void> {
    const key = `session:${sessionId}`;
    await this.set(key, JSON.stringify(sessionData), expireInSeconds);
  }

  async getSession(sessionId: string): Promise<object | null> {
    const key = `session:${sessionId}`;
    const sessionData = await this.get(key);
    return sessionData ? JSON.parse(sessionData) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.del(key);
  }

  // Token blacklist methods
  async blacklistToken(token: string, expireInSeconds: number): Promise<void> {
    const key = `blacklist:${token}`;
    await this.set(key, 'blacklisted', expireInSeconds);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:${token}`;
    const exists = await this.exists(key);
    return exists === 1;
  }

  // Rate limiting methods
  async incrementRateLimit(identifier: string, windowMs: number): Promise<number> {
    const key = `ratelimit:${identifier}`;
    const current = await this.client.incr(key);
    
    if (current === 1) {
      await this.expire(key, Math.ceil(windowMs / 1000));
    }
    
    return current;
  }

  async getRateLimitCount(identifier: string): Promise<number> {
    const key = `ratelimit:${identifier}`;
    const count = await this.get(key);
    return count ? parseInt(count, 10) : 0;
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