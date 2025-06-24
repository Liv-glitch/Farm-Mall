import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import { APIError } from './error.middleware';
import { HTTP_STATUS, ERROR_CODES } from '../utils/constants';

interface RateLimitOptions {
  windowMs: number;  // Window time in milliseconds
  maxRequests: number;  // Maximum requests per window
  message?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Rate limiting middleware factory
 */
export const createRateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    keyGenerator = (req: Request) => req.ip || 'unknown'
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = keyGenerator(req);
      const identifier = `ratelimit:${key}`;

      // Get current count for this identifier
      const currentCount = await redisClient.incrementRateLimit(identifier, windowMs);

      // Check if limit exceeded
      if (currentCount > maxRequests) {
        const ttl = await redisClient.getClient().ttl(identifier);
        
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + (ttl * 1000)).toISOString(),
        });

        throw new APIError(
          message,
          HTTP_STATUS.TOO_MANY_REQUESTS,
          ERROR_CODES.RATE_LIMIT_EXCEEDED,
          {
            limit: maxRequests,
            windowMs,
            retryAfter: ttl,
          }
        );
      }

      // Set success rate limit headers
      const remaining = Math.max(0, maxRequests - currentCount);
      const ttl = await redisClient.getClient().ttl(identifier);
      
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(Date.now() + (ttl * 1000)).toISOString(),
      });

      next();
    } catch (error) {
      if (error instanceof APIError) {
        next(error);
      } else {
        // If Redis is down, log error but allow request to continue
        console.error('Rate limiting error:', error);
        next();
      }
    }
  };
};

// Common rate limit configurations
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 login attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later',
  keyGenerator: (req: Request) => `auth:${req.ip}:${req.body.email || req.body.phoneNumber || 'unknown'}`
});

export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'Too many API requests, please try again later',
});

export const calculatorRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 calculations per minute
  message: 'Too many calculator requests, please try again later',
});

export const aiRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50, // 50 AI requests per hour (premium users might have higher limits)
  message: 'Too many AI requests, please try again later',
});

// Premium user rate limits (higher limits)
export const premiumApiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 500, // 500 requests per 15 minutes for premium users
  message: 'Rate limit exceeded for premium account',
});

export const premiumAiRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 200, // 200 AI requests per hour for premium users
  message: 'AI rate limit exceeded for premium account',
});

export default apiRateLimit; 