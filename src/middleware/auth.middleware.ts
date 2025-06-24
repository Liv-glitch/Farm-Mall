import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { SUBSCRIPTION_FEATURES } from '../types/auth.types';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants';
import { logError } from '../utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
      token?: string;
    }
  }
}

// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: ERROR_CODES.TOKEN_INVALID,
          message: 'Access token is required',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const payload = await authService.verifyAccessToken(token);
    
    // Get user details
    const user = await authService.getUserById(payload.userId);
    if (!user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: ERROR_CODES.USER_NOT_FOUND,
          message: 'User not found',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
      return;
    }

    // Attach user and token to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    logError('Authentication failed', error as Error, {
      path: req.path,
      method: req.method,
    });

    const errorMessage = (error as Error).message;
    
    let statusCode = HTTP_STATUS.UNAUTHORIZED;
    let errorCode = ERROR_CODES.TOKEN_INVALID;
    
    if (errorMessage === ERROR_CODES.TOKEN_EXPIRED) {
      errorCode = ERROR_CODES.TOKEN_EXPIRED as typeof ERROR_CODES.TOKEN_INVALID;
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: 'Authentication failed',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuthenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    try {
      // Verify token
      const payload = await authService.verifyAccessToken(token);
      
      // Get user details
      const user = await authService.getUserById(payload.userId);
      if (user) {
        req.user = user;
        req.token = token;
      }
    } catch (tokenError) {
      // Token is invalid, but we continue without authentication
      // This allows endpoints to work for both authenticated and unauthenticated users
    }
    
    next();
  } catch (error) {
    // If there's an unexpected error, continue without authentication
    next();
  }
};

// Premium subscription middleware
export const requirePremium = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: {
        code: ERROR_CODES.TOKEN_INVALID,
        message: 'Authentication required',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
    return;
  }

  const user = req.user;

  // Check if user has premium features
  if (user.subscriptionType !== 'premium') {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: {
        code: ERROR_CODES.PREMIUM_FEATURE_REQUIRED,
        message: 'Premium subscription required for this feature',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
    return;
  }

  // Check if premium subscription is still active
  if (user.subscriptionExpiresAt && user.subscriptionExpiresAt < new Date()) {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: {
        code: ERROR_CODES.SUBSCRIPTION_EXPIRED,
        message: 'Premium subscription has expired',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
    return;
  }

  next();
};

// Subscription feature check middleware factory
export const requireFeature = (feature: keyof typeof SUBSCRIPTION_FEATURES.free) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: ERROR_CODES.TOKEN_INVALID,
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
      return;
    }

    const user = req.user;
    const userFeatures = SUBSCRIPTION_FEATURES[user.subscriptionType as keyof typeof SUBSCRIPTION_FEATURES];

    // Check if user has access to the specific feature
    if (!userFeatures[feature]) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: {
          code: ERROR_CODES.PREMIUM_FEATURE_REQUIRED,
          message: `This feature requires a premium subscription`,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
      return;
    }

    // For premium users, check if subscription is still active
    if (user.subscriptionType === 'premium' && 
        user.subscriptionExpiresAt && 
        user.subscriptionExpiresAt < new Date()) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: {
          code: ERROR_CODES.SUBSCRIPTION_EXPIRED,
          message: 'Premium subscription has expired',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
      return;
    }

    next();
  };
};

// Email verification middleware
export const requireEmailVerification = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: {
        code: ERROR_CODES.TOKEN_INVALID,
        message: 'Authentication required',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
    return;
  }

  if (!req.user.emailVerified && req.user.email) {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: {
        code: ERROR_CODES.EMAIL_NOT_VERIFIED,
        message: 'Email verification required',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
    return;
  }

  next();
};

// Phone verification middleware
export const requirePhoneVerification = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: {
        code: ERROR_CODES.TOKEN_INVALID,
        message: 'Authentication required',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
    return;
  }

  if (!req.user.phoneVerified && req.user.phoneNumber) {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: {
        code: ERROR_CODES.PHONE_NOT_VERIFIED,
        message: 'Phone verification required',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
    return;
  }

  next();
};

// Owner or admin access middleware
export const requireOwnership = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: {
        code: ERROR_CODES.TOKEN_INVALID,
        message: 'Authentication required',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
    return;
  }

  // Check if user is accessing their own resources
  const userId = req.params.userId || req.params.id;
  if (userId && userId !== req.user.id) {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: {
        code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        message: 'Access denied: insufficient permissions',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
    return;
  }

  next();
};

// Rate limiting check for subscription limits
export const checkSubscriptionLimits = (limitType: 'production_cycles' | 'pest_analyses' | 'weather_requests') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: ERROR_CODES.TOKEN_INVALID,
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
      return;
    }

    const user = req.user;

    // Premium users have unlimited access
    if (user.subscriptionType === 'premium') {
      next();
      return;
    }

    // Check specific limits for free users
    try {
      // This would typically involve checking current usage against limits
      // For now, we'll implement basic checks
      
      switch (limitType) {
        case 'production_cycles':
          // Check current production cycle count
          // TODO: Implement actual count check
          break;
        case 'pest_analyses':
          // Check current month's pest analysis count
          // TODO: Implement actual count check
          break;
        case 'weather_requests':
          // Check today's weather request count
          // TODO: Implement actual count check
          break;
      }

      next();
    } catch (error) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: {
          code: ERROR_CODES.SUBSCRIPTION_LIMIT_REACHED,
          message: 'Subscription limit reached for this feature',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  };
};

export default {
  authenticate,
  optionalAuthenticate,
  requirePremium,
  requireFeature,
  requireEmailVerification,
  requirePhoneVerification,
  requireOwnership,
  checkSubscriptionLimits,
}; 