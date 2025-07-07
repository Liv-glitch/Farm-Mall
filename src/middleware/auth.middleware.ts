import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { SUBSCRIPTION_FEATURES } from '../types/auth.types';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants';
import { logError } from '../utils/logger';
import { UserModel } from '../models/User.model';
import { Op } from 'sequelize';
import { FarmCollaboratorModel } from '../models/FarmCollaborator.model';
import { FarmModel } from '../models/Farm.model';

// Create auth service instance
const authService = new AuthService();

// Extend Request interface to include user and farm access
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        email?: string;
        phoneNumber?: string;
        emailVerified: boolean;
        phoneVerified: boolean;
        subscriptionType: string;
        subscriptionExpiresAt?: Date;
      };
      token?: string;
      farmAccess?: {
        role: 'viewer' | 'manager' | 'worker' | 'family_member' | 'admin';
        permissions: {
          canCreateCycles: boolean;
          canEditCycles: boolean;
          canDeleteCycles: boolean;
          canAssignTasks: boolean;
          canViewFinancials: boolean;
        };
      };
    }
  }
}

// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: ERROR_CODES.UNAUTHORIZED });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // Use the auth service to verify token
      const payload = await authService.verifyAccessToken(token);
      
      const user = await UserModel.findByPk(payload.userId);
      if (!user) {
        res.status(401).json({ error: ERROR_CODES.USER_NOT_FOUND });
        return;
      }

      req.user = {
        id: user.id,
        role: user.role,
        email: user.email,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        subscriptionType: user.subscriptionType,
        subscriptionExpiresAt: user.subscriptionExpiresAt
      };
      req.token = token;

      next();
    } catch (tokenError: any) {
      // If access token is expired, try to refresh using refresh token
      if (tokenError.message === ERROR_CODES.TOKEN_EXPIRED) {
        const refreshToken = req.headers['x-refresh-token'] as string;
        if (refreshToken) {
          try {
            // Try to refresh the token
            const authResponse = await authService.refreshToken(refreshToken);
            
            // Set the new tokens in the response headers
            res.setHeader('Authorization', `Bearer ${authResponse.tokens.accessToken}`);
            res.setHeader('X-Refresh-Token', authResponse.tokens.refreshToken);

            // Set user in request
            req.user = {
              id: authResponse.user.id,
              role: authResponse.user.role,
              email: authResponse.user.email,
              phoneNumber: authResponse.user.phoneNumber,
              emailVerified: authResponse.user.emailVerified,
              phoneVerified: authResponse.user.phoneVerified,
              subscriptionType: authResponse.user.subscriptionType,
              subscriptionExpiresAt: authResponse.user.subscriptionExpiresAt
            };
            req.token = authResponse.tokens.accessToken;

            next();
            return;
          } catch (refreshError) {
            // If refresh token is invalid/expired, require re-login
            res.status(401).json({ error: ERROR_CODES.TOKEN_EXPIRED, message: 'Please login again' });
            return;
          }
        }
      }
      res.status(401).json({ error: ERROR_CODES.TOKEN_INVALID });
      return;
    }
  } catch (error) {
    logError('Authentication failed', error as Error);
    res.status(401).json({ error: ERROR_CODES.UNAUTHORIZED });
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
        req.user = {
          id: user.id,
          role: user.role,
          email: user.email,
          phoneNumber: user.phoneNumber,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          subscriptionType: user.subscriptionType,
          subscriptionExpiresAt: user.subscriptionExpiresAt
        };
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

  const user = req.user;

  if (!user.emailVerified) {
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

  const user = req.user;

  if (!user.phoneVerified) {
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

// Resource ownership middleware
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

  // Check if the resource belongs to the user
  const resourceUserId = req.params.userId || req.body.userId;
  if (resourceUserId !== req.user.id) {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED_ACCESS,
        message: 'You do not have permission to access this resource',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
    return;
  }

  next();
};

// Subscription limits middleware factory
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

    try {
      const user = await UserModel.findByPk(req.user.id);
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

      // Get current date range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Different features have different time windows for limits
      let count = 0;
      switch (limitType) {
        case 'production_cycles':
          // Count active production cycles
          count = await user.countProductionCycles({
            where: {
              status: {
                [Op.ne]: 'completed'
              }
            }
          });
          break;

        case 'pest_analyses':
          // Count pest analyses for current month
          count = await user.countPestAnalyses({
            where: {
              createdAt: {
                [Op.gte]: startOfMonth
              }
            }
          });
          break;

        case 'weather_requests':
          // Count weather requests for current day
          count = await user.countWeatherRequests({
            where: {
              createdAt: {
                [Op.gte]: startOfDay
              }
            }
          });
          break;
      }

      const limits = SUBSCRIPTION_FEATURES[user.subscriptionType as keyof typeof SUBSCRIPTION_FEATURES];
      const limit = limits[`${limitType}_limit`];
      
      if (count >= limit) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: {
            code: ERROR_CODES.SUBSCRIPTION_LIMIT_REACHED,
            message: `You have reached your ${limitType} limit for your subscription tier`,
          },
          timestamp: new Date().toISOString(),
          path: req.path,
        });
        return;
      }

      next();
    } catch (error) {
      logError('Failed to check subscription limits', error as Error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: 'Failed to check subscription limits',
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  };
};

// Admin role middleware
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
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

  if (req.user.role !== 'admin') {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED_ACCESS,
        message: 'Admin access required',
      },
      timestamp: new Date().toISOString(),
      path: req.path,
    });
    return;
  }

  next();
};

// Farm access middleware
export const checkFarmAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: ERROR_CODES.TOKEN_INVALID,
          message: 'Authentication required',
        }
      });
      return;
    }

    const farmId = req.params.farmId || req.body.farmId;
    if (!farmId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_REQUEST,
          message: 'Farm ID is required',
        }
      });
      return;
    }

    // Check if user is farm owner
    const farm = await FarmModel.findByPk(farmId);
    if (!farm) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
          code: ERROR_CODES.FARM_NOT_FOUND,
          message: 'Farm not found',
        }
      });
      return;
    }

    if (farm.ownerId === req.user.id) {
      // Farm owner has full access
      req.farmAccess = {
        role: 'admin',
        permissions: {
          canCreateCycles: true,
          canEditCycles: true,
          canDeleteCycles: true,
          canAssignTasks: true,
          canViewFinancials: true
        }
      };
      next();
      return;
    }

    // Check collaborator access
    const collaboration = await FarmCollaboratorModel.findOne({
      where: {
        farmId,
        collaboratorId: req.user.id,
        status: 'active'
      }
    });

    if (!collaboration) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: {
          code: ERROR_CODES.NO_FARM_ACCESS,
          message: 'No access to this farm',
        }
      });
      return;
    }

    req.farmAccess = {
      role: collaboration.role,
      permissions: collaboration.permissions
    };

    next();
  } catch (error) {
    logError('Farm access check failed', error as Error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.SERVER_ERROR,
        message: 'Failed to check farm access',
      }
    });
  }
};

// Farm permission middleware factory
export const requireFarmPermission = (permission: keyof FarmCollaboratorModel['permissions']) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.farmAccess) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: {
          code: ERROR_CODES.NO_FARM_ACCESS,
          message: 'Farm access not verified',
        }
      });
      return;
    }

    if (!req.farmAccess.permissions[permission]) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: {
          code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          message: `Insufficient permissions: ${permission} required`,
        }
      });
      return;
    }

    next();
  };
};

// Farm owner check middleware
export const requireFarmOwnership = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: ERROR_CODES.TOKEN_INVALID,
          message: 'Authentication required',
        }
      });
      return;
    }

    const farmId = req.params.farmId || req.body.farmId;
    if (!farmId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_REQUEST,
          message: 'Farm ID is required',
        }
      });
      return;
    }

    const farm = await FarmModel.findByPk(farmId);
    if (!farm) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
          code: ERROR_CODES.FARM_NOT_FOUND,
          message: 'Farm not found',
        }
      });
      return;
    }

    if (farm.ownerId !== req.user.id) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FARM_OWNER,
          message: 'Only farm owner can perform this action',
        }
      });
      return;
    }

    next();
  } catch (error) {
    logError('Farm ownership check failed', error as Error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.SERVER_ERROR,
        message: 'Failed to check farm ownership',
      }
    });
  }
};

// Export as RequestHandler to fix Express type issues
export default authenticate as (req: Request, res: Response, next: NextFunction) => Promise<void>; 