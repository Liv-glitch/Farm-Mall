import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/environment';
import { redisClient } from '../config/redis';
import { UserModel } from '../models';
import { FarmModel } from '../models/Farm.model';
import { ProductionCycleModel } from '../models/ProductionCycle.model';
import { ActivityModel } from '../models/Activity.model';
import { FarmCollaboratorModel } from '../models/FarmCollaborator.model';
import {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  JWTPayload,
  RefreshTokenPayload,
  ChangePasswordRequest,
  PasswordResetRequest,
} from '../types/auth.types';
import { ERROR_CODES } from '../utils/constants';
import logger, { logError, logInfo } from '../utils/logger';
import { Op } from 'sequelize';

export class AuthService {
  // Register new user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      // Check if user already exists (optimized single query)
      const existingUser = await UserModel.findOne({
        where: {
          [Op.or]: [
            ...(userData.email ? [{ email: userData.email.toLowerCase() }] : []),
            ...(userData.phoneNumber ? [{ phoneNumber: userData.phoneNumber }] : [])
          ]
        }
      });
      
      if (existingUser) {
        console.error('User already exists:', {
          existingUser: {
            id: existingUser.id,
            email: existingUser.email,
            phoneNumber: existingUser.phoneNumber
          },
          newUserData: {
            email: userData.email,
            phoneNumber: userData.phoneNumber
          }
        });
        
        // Check which field conflicts and throw appropriate error
        if (existingUser.email === userData.email?.toLowerCase()) {
          throw new Error(ERROR_CODES.EMAIL_ALREADY_EXISTS);
        }
        if (existingUser.phoneNumber === userData.phoneNumber) {
          throw new Error(ERROR_CODES.PHONE_ALREADY_EXISTS);
        }
      }

      // Hash password
      const passwordHash = await this.hashPassword(userData.password);

      // Create user
      const user = await UserModel.create({
        ...userData,
        email: userData.email?.toLowerCase(),
        role: userData.role ?? 'user',
        passwordHash,
        subscriptionType: 'free',
        emailVerified: false,
        phoneVerified: false,
      });

      // Create default farm for the user
      await FarmModel.create({
        ownerId: user.id,
        name: `${userData.fullName}'s Farm`,
        location: `${userData.county}, ${userData.subCounty}`,
      });

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Cache user session
      await this.cacheUserSession(user.id, tokens.refreshToken);

      logInfo('User registered successfully', { userId: user.id, email: userData.email });

      const userResponse = user.toJSON() as any;
      delete userResponse.passwordHash;
      
      return {
        user: userResponse,
        tokens,
      };
    } catch (error: any) {
      console.error('Detailed registration error:', {
        error: error.message,
        stack: error.stack,
        errorType: error.constructor.name,
        userData: { ...userData, password: '[REDACTED]' }
      });
      
      // Handle Sequelize unique constraint violations
      if (error.name === 'SequelizeUniqueConstraintError') {
        const fields = error.fields || {};
        
        if (fields.email) {
          throw new Error(ERROR_CODES.EMAIL_ALREADY_EXISTS);
        }
        if (fields.phone_number) {
          throw new Error(ERROR_CODES.PHONE_ALREADY_EXISTS);
        }
        if (fields.phoneNumber) {
          throw new Error(ERROR_CODES.PHONE_ALREADY_EXISTS);
        }
        
        // Generic unique constraint error
        throw new Error('A user with this information already exists');
      }
      
      // Handle other Sequelize validation errors
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors?.map((err: any) => err.message) || [];
        throw new Error(`Validation error: ${validationErrors.join(', ')}`);
      }
      
      logError('Registration failed', error as Error, {
        ...userData,
        password: '[REDACTED]',
        errorMessage: error.message,
        errorStack: error.stack,
        errorType: error.constructor.name
      });
      throw error;
    }
  }

  // Login user
  async login(loginData: LoginRequest): Promise<AuthResponse> {
    try {
      // Find user by email or phone number
      const user = await UserModel.findOne({
        where: {
          ...(loginData.identifier.includes('@')
            ? { email: loginData.identifier.toLowerCase() }
            : { phoneNumber: loginData.identifier }),
        },
      });

      if (!user) {
        throw new Error(ERROR_CODES.INVALID_CREDENTIALS);
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(
        loginData.password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        throw new Error(ERROR_CODES.INVALID_CREDENTIALS);
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Cache user session
      await this.cacheUserSession(user.id, tokens.refreshToken);

      logInfo('User logged in successfully', { userId: user.id });

      const userResponse = user.toJSON() as any;
      delete userResponse.passwordHash;
      
      return {
        user: userResponse,
        tokens,
      };
    } catch (error: any) {
      console.error('Auth service login error:', {
        error: error.message,
        stack: error.stack,
        identifier: loginData.identifier,
        errorType: error.constructor.name
      });
      
      logError('Login failed', error as Error, { 
        identifier: loginData.identifier,
        errorMessage: error.message,
        errorStack: error.stack,
        errorType: error.constructor.name
      });
      throw error;
    }
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;

      // Check if token exists in cache (optional - if Redis fails, skip this check)
      try {
        const cachedToken = await redisClient.get(`session:${payload.userId}`);
        if (cachedToken && cachedToken !== refreshToken) {
          throw new Error(ERROR_CODES.REFRESH_TOKEN_INVALID);
        }
        // If cachedToken is null (Redis failed), we'll rely on JWT verification only
      } catch (redisError) {
        logError('Redis check failed during token refresh, relying on JWT verification only', redisError as Error);
      }

      // Get user
      const user = await UserModel.findByPk(payload.userId);
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Update cached session
      await this.cacheUserSession(user.id, tokens.refreshToken);

      // Blacklist old refresh token
      await this.blacklistToken(refreshToken);

      logInfo('Token refreshed successfully', { userId: user.id });

      const userResponse = user.toJSON() as any;
      delete userResponse.passwordHash;
      
      return {
        user: userResponse,
        tokens,
      };
    } catch (error) {
      logError('Token refresh failed', error as Error);
      throw new Error(ERROR_CODES.REFRESH_TOKEN_INVALID);
    }
  }

  // Logout user
  async logout(userId: string, accessToken: string, refreshToken?: string): Promise<void> {
    try {
      // Blacklist access token (Redis failures are handled in blacklistToken method)
      await this.blacklistToken(accessToken);

      // Blacklist refresh token if provided
      if (refreshToken) {
        await this.blacklistToken(refreshToken);
      }

      // Remove user session from cache (handle Redis failures gracefully)
      try {
        await redisClient.del(`session:${userId}`);
      } catch (redisError) {
        logError('Failed to remove session from Redis during logout', redisError as Error, { userId });
        // Continue logout process even if Redis fails
      }

      logInfo('User logged out successfully', { userId });
    } catch (error) {
      logError('Logout failed', error as Error, { userId });
      // Don't throw error to prevent logout failures from crashing the app
      logInfo('Logout completed with errors', { userId });
    }
  }

  // Change password
  async changePassword(
    userId: string,
    passwordData: ChangePasswordRequest
  ): Promise<void> {
    try {
      const user = await UserModel.findByPk(userId);
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      // Verify current password
      const isCurrentPasswordValid = await this.verifyPassword(
        passwordData.currentPassword,
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        throw new Error(ERROR_CODES.INVALID_CREDENTIALS);
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(passwordData.newPassword);

      // Update user password
      await user.update({ passwordHash: newPasswordHash });

      // Invalidate all user sessions (force re-login)
      await this.invalidateAllUserSessions(userId);

      logInfo('Password changed successfully', { userId });
    } catch (error) {
      logError('Password change failed', error as Error, { userId });
      throw error;
    }
  }

  // Request password reset
  async requestPasswordReset(requestData: PasswordResetRequest): Promise<void> {
    try {
      // Find user
      const user = await UserModel.findOne({
        where: {
          ...(requestData.identifier.includes('@')
            ? { email: requestData.identifier.toLowerCase() }
            : { phoneNumber: requestData.identifier }),
        },
      });

      if (!user) {
        // Don't reveal if user exists or not
        logInfo('Password reset requested for non-existent user', {
          identifier: requestData.identifier,
        });
        return;
      }

      // Generate reset token
      const resetToken = uuidv4();
      // const resetTokenExpiry = new Date(Date.now() + TIME.HOUR); // 1 hour expiry

      // Cache reset token (handle Redis failures gracefully)
      try {
        await redisClient.set(
          `password_reset:${resetToken}`,
          user.id,
          3600 // 1 hour in seconds
        );
      } catch (redisError) {
        logError('Failed to cache password reset token', redisError as Error, { userId: user.id });
        // For password reset, Redis is critical - we need to throw an error if we can't cache the token
        throw new Error('Unable to process password reset request at this time');
      }

      // TODO: Send reset email/SMS
      // await emailService.sendPasswordResetEmail(user, resetToken);

      logInfo('Password reset requested', { userId: user.id });
    } catch (error) {
      logError('Password reset request failed', error as Error, requestData);
      throw error;
    }
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Verify reset token
      const userId = await redisClient.get(`password_reset:${token}`);
      if (!userId) {
        throw new Error(ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID);
      }

      // Get user
      const user = await UserModel.findByPk(userId);
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      // Hash new password
      const passwordHash = await this.hashPassword(newPassword);

      // Update password
      await user.update({ passwordHash });

      // Delete reset token
      await redisClient.del(`password_reset:${token}`);

      // Invalidate all user sessions
      await this.invalidateAllUserSessions(userId);

      logInfo('Password reset successfully', { userId });
    } catch (error) {
      logError('Password reset failed', error as Error, { token });
      throw error;
    }
  }

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    try {
      // Verify email token
      const userId = await redisClient.get(`email_verification:${token}`);
      if (!userId) {
        throw new Error(ERROR_CODES.TOKEN_INVALID);
      }

      // Get user
      const user = await UserModel.findByPk(userId);
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      // Update email verification status
      await user.update({ emailVerified: true });

      // Delete verification token
      await redisClient.del(`email_verification:${token}`);

      logInfo('Email verified successfully', { userId });
    } catch (error) {
      logError('Email verification failed', error as Error, { token });
      throw error;
    }
  }

  // Verify phone number
  async verifyPhone(phoneNumber: string, verificationCode: string): Promise<void> {
    try {
      // Verify code
      const cachedCode = await redisClient.get(`phone_verification:${phoneNumber}`);
      if (!cachedCode || cachedCode !== verificationCode) {
        throw new Error(ERROR_CODES.TOKEN_INVALID);
      }

      // Find user by phone number
      const user = await UserModel.findOne({
        where: { phoneNumber },
      });

      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      // Update phone verification status
      await user.update({ phoneVerified: true });

      // Delete verification code
      await redisClient.del(`phone_verification:${phoneNumber}`);

      logInfo('Phone verified successfully', { userId: user.id, phoneNumber });
    } catch (error) {
      logError('Phone verification failed', error as Error, { phoneNumber });
      throw error;
    }
  }

  // Hash password
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
  }

  // Verify password
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate JWT tokens
  private async generateTokens(user: UserModel): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
  }> {
    const tokenId = uuidv4();

    // Access token payload
    const accessPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      subscriptionType: user.subscriptionType,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    };

    // Refresh token payload
    const refreshPayload: RefreshTokenPayload = {
      userId: user.id,
      tokenId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    };

    // Generate tokens
    const accessToken = jwt.sign(accessPayload, env.JWT_SECRET);
    const refreshToken = jwt.sign(refreshPayload, env.JWT_REFRESH_SECRET);

    return {
      accessToken,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
      tokenType: 'Bearer',
    };
  }

  // Cache user session
  private async cacheUserSession(userId: string, refreshToken: string): Promise<void> {
    try {
      await redisClient.set(
        `session:${userId}`,
        refreshToken,
        7 * 24 * 60 * 60 // 7 days in seconds
      );
      logInfo('User session cached', { userId });
    } catch (error) {
      logError('Failed to cache user session', error as Error, { userId });
      // Continue without Redis caching - authentication will still work
    }
  }

  // Blacklist token
  private async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redisClient.set(`blacklist:${token}`, 'blacklisted', ttl);
          logInfo('Token blacklisted', { tokenLength: token.length });
        }
      }
    } catch (error) {
      logger.warn('Failed to blacklist token - continuing without Redis blacklisting', { 
        error, 
        token: token.substring(0, 20) 
      });
      // Continue without Redis blacklisting - auth will still work
    }
  }

  // Check if token is blacklisted
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const exists = await redisClient.exists(`blacklist:${token}`);
      return exists === 1;
    } catch (error) {
      logger.warn('Failed to check token blacklist - assuming token is valid', { error });
      // If Redis fails, assume token is not blacklisted to avoid blocking users
      return false;
    }
  }

  // Invalidate all user sessions
  private async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      // Get all session keys for user
      const sessionKey = `session:${userId}`;
      const refreshToken = await redisClient.get(sessionKey);
      
      if (refreshToken) {
        // Blacklist the refresh token
        await this.blacklistToken(refreshToken);
        // Delete session
        await redisClient.del(sessionKey);
        logInfo('User sessions invalidated', { userId });
      }
    } catch (error) {
      logger.warn('Failed to invalidate user sessions - continuing without Redis cleanup', { error, userId });
      // Continue without Redis cleanup - password change will still work
    }
  }

  // Verify JWT token
  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error(ERROR_CODES.TOKEN_INVALID);
      }

      // Verify token
      const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error(ERROR_CODES.TOKEN_EXPIRED);
      }
      throw new Error(ERROR_CODES.TOKEN_INVALID);
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<UserModel | null> {
    try {
      return await UserModel.findByPk(userId);
    } catch (error) {
      logError('Failed to get user by ID', error as Error, { userId });
      return null;
    }
  }

  // Update user profile
  async updateUserProfile(userId: string, updateData: {
    fullName?: string;
    phoneNumber?: string;
    county?: string;
    subCounty?: string;
    profilePictureUrl?: string;
  }): Promise<UserModel | null> {
    try {
      const user = await UserModel.findByPk(userId);
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      // Check if phone number is being updated and if it already exists
      if (updateData.phoneNumber && updateData.phoneNumber !== user.phoneNumber) {
        const existingUser = await UserModel.findOne({
          where: { 
            phoneNumber: updateData.phoneNumber,
            id: { [Op.ne]: userId }
          }
        });
        
        if (existingUser) {
          throw new Error(ERROR_CODES.PHONE_ALREADY_EXISTS);
        }
      }

      // Update user with provided data
      await user.update(updateData);
      
      logInfo('User profile updated successfully', { userId, updatedFields: Object.keys(updateData) });
      
      return user;
    } catch (error) {
      logError('Failed to update user profile', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Get the current usage count for a specific feature
   * @param userId The ID of the user
   * @param featureType The type of feature to check usage for
   * @returns The current usage count
   */
  async getFeatureUsage(userId: string, featureType: 'production_cycles' | 'pest_analyses' | 'weather_requests'): Promise<number> {
    try {
      const user = await UserModel.findByPk(userId);
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      // Get current date range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Different features have different time windows for limits
      let count = 0;
      switch (featureType) {
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

      return count;
    } catch (error) {
      logError('Failed to get feature usage', error as Error);
      throw error;
    }
  }

  // Get user by phone number with all related data for bot authentication
  async getUserByPhoneWithAllData(phoneNumber: string): Promise<{
    user: any;
    farms: any[];
    productionCycles: any[];
    activities: any[];
  } | null> {
    try {
        // Normalize phone number
      phoneNumber = phoneNumber.trim();
      if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+' + phoneNumber;
      }

      logInfo('Starting bot auth data retrieval', { 
        phone: phoneNumber.substring(0, 8) + '***' 
      });

      console.log('Retrieving user data for bot authentication', {
        phone: phoneNumber
      });
      // Find user by phone number
      const user = await UserModel.findOne({
        where: { phoneNumber },
        attributes: { exclude: ['passwordHash'] },
      });

      if (!user) {
        logInfo('User not found in database', { 
          phone: phoneNumber.substring(0, 8) + '***' 
        });
        return null;
      }

      logInfo('User found, fetching related data', { 
        userId: user.id,
        phone: phoneNumber.substring(0, 8) + '***' 
      });

      // Get user's farms with collaborators
      logInfo('Fetching farms for user', { userId: user.id });
      const farms = await FarmModel.findAll({
        where: { ownerId: user.id },
        include: [
          {
            model: FarmCollaboratorModel,
            as: 'collaborators',
            required: false,
            include: [
              {
                model: UserModel,
                as: 'collaborator',
                attributes: ['id', 'fullName', 'email', 'phoneNumber'],
                required: false,
              },
            ],
          },
        ],
      });
      logInfo('Farms fetched successfully', { userId: user.id, farmCount: farms.length });

      // Get production cycles with detailed information
      logInfo('Fetching production cycles for user', { userId: user.id });
      const productionCycles = await ProductionCycleModel.findAll({
        where: { userId: user.id },
        include: [
          {
            model: FarmModel,
            as: 'farm',
            attributes: ['id', 'name', 'location', 'locationLat', 'locationLng', 'sizeAcres'],
            required: false,
          },
          {
            model: ActivityModel,
            as: 'activities',
            attributes: [
              'id',
              'type',
              'description',
              'scheduledDate',
              'completedDate',
              'cost',
              'laborHours',
              'laborType',
              'inputs',
              'notes',
              'status',
            ],
            required: false,
          },
        ],
        order: [
          ['createdAt', 'DESC'],
          [{ model: ActivityModel, as: 'activities' }, 'scheduledDate', 'ASC'],
        ],
      });
      logInfo('Production cycles fetched successfully', { userId: user.id, cycleCount: productionCycles.length });

      // Get all activities for the user (including those not tied to specific cycles)
      logInfo('Fetching activities for user', { userId: user.id });
      const activities = await ActivityModel.findAll({
        where: { userId: user.id },
        include: [
          {
            model: ProductionCycleModel,
            as: 'productionCycle',
            attributes: ['id', 'status', 'cropVarietyId', 'landSizeAcres'],
            required: false,
            include: [
              {
                model: FarmModel,
                as: 'farm',
                attributes: ['id', 'name'],
                required: false,
              },
            ],
          },
        ],
        order: [['scheduledDate', 'DESC']],
        limit: 50, // Limit to most recent 50 activities
      });
      logInfo('Activities fetched successfully', { userId: user.id, activityCount: activities.length });

      // Calculate summary statistics
      logInfo('Calculating user statistics', { userId: user.id });
      const userStats = {
        totalFarms: farms.length,
        totalProductionCycles: productionCycles.length,
        activeProductionCycles: productionCycles.filter(cycle => cycle.status === 'active').length,
        completedProductionCycles: productionCycles.filter(cycle => cycle.status === 'harvested').length,
        totalActivities: activities.length,
        completedActivities: activities.filter(activity => activity.status === 'completed').length,
        pendingActivities: activities.filter(activity => activity.status === 'planned').length,
        subscriptionStatus: user.getSubscriptionStatus(),
        isPremiumUser: user.isPremiumUser(),
      };
      logInfo('User statistics calculated', { userId: user.id, stats: userStats });

      logInfo('Preparing response data', { userId: user.id });
      const response = {
        user: {
          ...user.toJSON(),
          stats: userStats,
        },
        farms: farms.map(farm => ({
          ...farm.toJSON(),
          collaboratorCount: farm.collaborators?.length || 0,
        })),
        productionCycles: productionCycles.map(cycle => ({
          ...cycle.toJSON(),
          activityCount: cycle.activities?.length || 0,
          daysToHarvest: cycle.getDaysToHarvest(),
          daysFromPlanting: cycle.getDaysFromPlanting(),
          yieldPerAcre: cycle.getYieldPerAcre(),
          costPerAcre: cycle.getCostPerAcre(),
          profitability: cycle.getProfitability(),
        })),
        activities: activities.map(activity => ({
          ...activity.toJSON(),
          isCompleted: activity.isCompleted(),
          isOverdue: activity.isOverdue(),
          daysUntilScheduled: activity.getDaysUntilScheduled(),
          totalCost: activity.getTotalCost(),
        })),
      };
      
      logInfo('Bot auth data retrieval completed successfully', { 
        userId: user.id,
        phone: phoneNumber.substring(0, 8) + '***',
        responseSize: {
          farms: response.farms.length,
          productionCycles: response.productionCycles.length,
          activities: response.activities.length
        }
      });
      
      return response;
    } catch (error) {
      logError('Failed to get user data by phone', error as Error, { 
        phone: phoneNumber.substring(0, 8) + '***' 
      });
      throw error;
    }
  }

  // Bot authentication with tokens - get user data and generate authentication tokens
  async botAuthWithTokens(phoneNumber: string): Promise<{
    user: any;
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      tokenType: 'Bearer';
    };
    farms: any[];
    productionCycles: any[];
    activities: any[];
  } | null> {
    try {
      // Get user with all data using existing method
      const userData = await this.getUserByPhoneWithAllData(phoneNumber);

      if (!userData) {
        return null;
      }

      // Find the user model instance to generate tokens
      const user = await UserModel.findOne({
        where: { phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : '+' + phoneNumber.trim() },
      });

      if (!user) {
        logError('User found in getUserByPhoneWithAllData but not in botAuthWithTokens', new Error('User not found'));
        return null;
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Cache user session
      await this.cacheUserSession(user.id, tokens.refreshToken);

      logInfo('Bot authentication with tokens successful', { 
        userId: user.id,
        phone: phoneNumber.substring(0, 8) + '***' 
      });

      return {
        user: userData.user,
        tokens,
        farms: userData.farms,
        productionCycles: userData.productionCycles,
        activities: userData.activities,
      };
    } catch (error: any) {
      logError('Bot authentication with tokens failed', error, {
        phone: phoneNumber.substring(0, 8) + '***' 
      });
      throw error;
    }
  }
}

export const authService = new AuthService();
export default authService; 