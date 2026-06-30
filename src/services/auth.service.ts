import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes, randomInt } from 'crypto';
import { env } from '../config/environment';
import { sequelize } from '../config/database';
import { redisClient } from '../config/redis';
import { EmailVerificationOtpModel, PasswordResetTokenModel, UserModel } from '../models';
import { FarmModel } from '../models/Farm.model';
import { ProductionCycleModel } from '../models/ProductionCycle.model';
import { ActivityModel } from '../models/Activity.model';
import { FarmCollaboratorModel } from '../models/FarmCollaborator.model';
import { emailService } from './email.service';
import {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  RegisterResponse,
  JWTPayload,
  RefreshTokenPayload,
  ChangePasswordRequest,
  PasswordResetRequest,
} from '../types/auth.types';
import { ERROR_CODES } from '../utils/constants';
import logger, { logError, logInfo } from '../utils/logger';
import { Op } from 'sequelize';

const PASSWORD_RESET_SUCCESS_MESSAGE = 'If an account exists for this email, a reset link has been sent.';
const OTP_RESEND_SUCCESS_MESSAGE = 'If an unverified account exists for this email, a verification code has been sent.';
const PASSWORD_RESET_EXPIRY_MS = 15 * 60 * 1000;
const EMAIL_OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

export class AuthService {
  // Register new user
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    try {
      if (!userData.email) {
        throw new Error(ERROR_CODES.INVALID_EMAIL_FORMAT);
      }

      const normalizedEmail = userData.email.toLowerCase();

      // Check if user already exists (optimized single query)
      const existingUser = await UserModel.findOne({
        where: {
          [Op.or]: [
            { email: normalizedEmail },
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
        if (existingUser.email === normalizedEmail) {
          throw new Error(ERROR_CODES.EMAIL_ALREADY_EXISTS);
        }
        if (existingUser.phoneNumber === userData.phoneNumber) {
          throw new Error(ERROR_CODES.PHONE_ALREADY_EXISTS);
        }
      }

      // Hash password
      const passwordHash = await this.hashPassword(userData.password);

      const user = await sequelize.transaction(async (transaction) => {
        const createdUser = await UserModel.create({
          ...userData,
          email: normalizedEmail,
          role: 'user',
          passwordHash,
          subscriptionType: 'free',
          emailVerified: false,
          phoneVerified: false,
        }, { transaction });

        await FarmModel.create({
          ownerId: createdUser.id,
          name: `${userData.fullName}'s Farm`,
          location: `${userData.county}, ${userData.subCounty}`,
        }, { transaction });

        return createdUser;
      });

      await this.createAndSendVerificationOtp(user);

      logInfo('User registered successfully', { userId: user.id, email: userData.email });

      const userResponse = user.toJSON() as any;
      delete userResponse.passwordHash;
      
      return {
        user: userResponse,
        emailVerificationRequired: true,
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

      if (user.email && !user.emailVerified) {
        throw new Error(ERROR_CODES.EMAIL_NOT_VERIFIED);
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

      if (user.email && !user.emailVerified) {
        throw new Error(ERROR_CODES.EMAIL_NOT_VERIFIED);
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
  async requestPasswordReset(requestData: PasswordResetRequest): Promise<string> {
    try {
      const email = requestData.email.toLowerCase();
      const user = await UserModel.findOne({
        where: { email },
      });

      if (!user) {
        logInfo('Password reset requested for non-existent email');
        return PASSWORD_RESET_SUCCESS_MESSAGE;
      }

      const rawToken = this.generateRawToken();
      const tokenHash = this.hashOpaqueToken(rawToken);
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

      await sequelize.transaction(async (transaction) => {
        await PasswordResetTokenModel.update(
          { usedAt: new Date() },
          {
            where: {
              userId: user.id,
              usedAt: null,
            },
            transaction,
          }
        );

        await PasswordResetTokenModel.create({
          userId: user.id,
          tokenHash,
          expiresAt,
        }, { transaction });
      });

      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
      await emailService.sendPasswordResetEmail(email, resetUrl);

      logInfo('Password reset requested', { userId: user.id });
      return PASSWORD_RESET_SUCCESS_MESSAGE;
    } catch (error) {
      logError('Password reset request failed', error as Error);
      throw error;
    }
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const tokenHash = this.hashOpaqueToken(token);
      const resetToken = await PasswordResetTokenModel.findOne({
        where: {
          tokenHash,
          usedAt: null,
          expiresAt: {
            [Op.gt]: new Date(),
          },
        },
      });

      if (!resetToken) {
        throw new Error(ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID);
      }

      const user = await UserModel.findByPk(resetToken.userId);
      if (!user) {
        throw new Error(ERROR_CODES.USER_NOT_FOUND);
      }

      const passwordHash = await this.hashPassword(newPassword);
      const now = new Date();

      await sequelize.transaction(async (transaction) => {
        await user.update({ passwordHash }, { transaction });
        await resetToken.update({ usedAt: now }, { transaction });
        await PasswordResetTokenModel.update(
          { usedAt: now },
          {
            where: {
              userId: user.id,
              usedAt: null,
            },
            transaction,
          }
        );
      });

      // Invalidate all user sessions
      await this.invalidateAllUserSessions(user.id);

      if (user.email) {
        await emailService.sendPasswordChangedEmail(user.email);
      }

      logInfo('Password reset successfully', { userId: user.id });
    } catch (error) {
      logError('Password reset failed', error as Error);
      throw error;
    }
  }

  async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    try {
      const normalizedEmail = email.toLowerCase();
      const user = await UserModel.findOne({ where: { email: normalizedEmail } });
      if (!user) {
        throw new Error(ERROR_CODES.VERIFICATION_CODE_INVALID);
      }

      if (user.emailVerified) {
        const tokens = await this.generateTokens(user);
        await this.cacheUserSession(user.id, tokens.refreshToken);
        const userResponse = user.toJSON() as any;
        delete userResponse.passwordHash;
        return { user: userResponse, tokens };
      }

      const otpRecord = await EmailVerificationOtpModel.findOne({
        where: {
          userId: user.id,
          usedAt: null,
          expiresAt: {
            [Op.gt]: new Date(),
          },
        },
        order: [['createdAt', 'DESC']],
      });

      if (!otpRecord) {
        throw new Error(ERROR_CODES.VERIFICATION_CODE_EXPIRED);
      }

      if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
        await otpRecord.update({ usedAt: new Date() });
        throw new Error(ERROR_CODES.VERIFICATION_CODE_INVALID);
      }

      const submittedOtpHash = this.hashOpaqueToken(otp);
      if (submittedOtpHash !== otpRecord.otpHash) {
        const attempts = otpRecord.attempts + 1;
        await otpRecord.update({
          attempts,
          usedAt: attempts >= MAX_OTP_ATTEMPTS ? new Date() : otpRecord.usedAt,
        });
        throw new Error(ERROR_CODES.VERIFICATION_CODE_INVALID);
      }

      const now = new Date();
      await sequelize.transaction(async (transaction) => {
        await user.update({ emailVerified: true }, { transaction });
        await EmailVerificationOtpModel.update(
          { usedAt: now },
          {
            where: {
              userId: user.id,
              usedAt: null,
            },
            transaction,
          }
        );
      });

      const tokens = await this.generateTokens(user);
      await this.cacheUserSession(user.id, tokens.refreshToken);

      logInfo('Email verified successfully', { userId: user.id });

      const userResponse = user.toJSON() as any;
      delete userResponse.passwordHash;

      return {
        user: userResponse,
        tokens,
      };
    } catch (error) {
      logError('OTP verification failed', error as Error);
      throw error;
    }
  }

  async resendVerificationOtp(email: string): Promise<string> {
    try {
      const normalizedEmail = email.toLowerCase();
      const user = await UserModel.findOne({ where: { email: normalizedEmail } });

      if (!user || user.emailVerified) {
        return OTP_RESEND_SUCCESS_MESSAGE;
      }

      await this.createAndSendVerificationOtp(user);
      logInfo('Verification OTP resent', { userId: user.id });

      return OTP_RESEND_SUCCESS_MESSAGE;
    } catch (error) {
      logError('Resend verification OTP failed', error as Error);
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
      logError('Email verification failed', error as Error);
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

  private async createAndSendVerificationOtp(user: UserModel): Promise<void> {
    if (!user.email) {
      throw new Error(ERROR_CODES.INVALID_EMAIL_FORMAT);
    }

    const otp = this.generateNumericOtp();
    const otpHash = this.hashOpaqueToken(otp);
    const expiresAt = new Date(Date.now() + EMAIL_OTP_EXPIRY_MS);

    await sequelize.transaction(async (transaction) => {
      await EmailVerificationOtpModel.update(
        { usedAt: new Date() },
        {
          where: {
            userId: user.id,
            usedAt: null,
          },
          transaction,
        }
      );

      await EmailVerificationOtpModel.create({
        userId: user.id,
        otpHash,
        expiresAt,
      }, { transaction });
    });

    await emailService.sendVerificationOtpEmail(user.email, otp);
  }

  private generateRawToken(): string {
    return randomBytes(32).toString('hex');
  }

  private generateNumericOtp(): string {
    return randomInt(0, 1000000).toString().padStart(6, '0');
  }

  private hashOpaqueToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
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
          logInfo('Token blacklisted');
        }
      }
    } catch (error) {
      logger.warn('Failed to blacklist token - continuing without Redis blacklisting', { 
        error,
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
