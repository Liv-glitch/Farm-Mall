import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/environment';
import { redisClient } from '../config/redis';
import { UserModel } from '../models';
import { FarmModel } from '../models/Farm.model';
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
            ...(userData.email ? [{ email: userData.email }] : []),
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
        if (existingUser.email === userData.email) {
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
            ? { email: loginData.identifier }
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

      // Check if token exists in cache
      const cachedToken = await redisClient.get(`session:${payload.userId}`);
      if (!cachedToken || cachedToken !== refreshToken) {
        throw new Error(ERROR_CODES.REFRESH_TOKEN_INVALID);
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
      // Blacklist access token
      await this.blacklistToken(accessToken);

      // Blacklist refresh token if provided
      if (refreshToken) {
        await this.blacklistToken(refreshToken);
      }

      // Remove user session from cache
      await redisClient.del(`session:${userId}`);

      logInfo('User logged out successfully', { userId });
    } catch (error) {
      logError('Logout failed', error as Error, { userId });
      throw error;
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
            ? { email: requestData.identifier }
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

      // Cache reset token
      await redisClient.set(
        `password_reset:${resetToken}`,
        user.id,
        3600 // 1 hour in seconds
      );

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
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
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
      expiresIn: 15 * 60, // 15 minutes in seconds
      tokenType: 'Bearer',
    };
  }

  // Cache user session
  private async cacheUserSession(userId: string, refreshToken: string): Promise<void> {
    await redisClient.set(
      `session:${userId}`,
      refreshToken,
      7 * 24 * 60 * 60 // 7 days in seconds
    );
  }

  // Blacklist token
  private async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redisClient.set(`blacklist:${token}`, 'blacklisted', ttl);
        }
      }
    } catch (error) {
      logger.warn('Failed to blacklist token', { error, token: token.substring(0, 20) });
    }
  }

  // Check if token is blacklisted
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const exists = await redisClient.exists(`blacklist:${token}`);
      return exists === 1;
    } catch (error) {
      logger.warn('Failed to check token blacklist', { error });
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
      }
    } catch (error) {
      logger.warn('Failed to invalidate user sessions', { error, userId });
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
}

export const authService = new AuthService();
export default authService; 