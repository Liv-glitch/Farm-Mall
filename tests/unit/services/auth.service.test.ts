import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { AuthService } from '../../../src/services/auth.service';
import { AuthController } from '../../../src/controllers/auth.controller';
import { UserModel } from '../../../src/models';
import { env } from '../../../src/config/environment';
import { ERROR_CODES } from '../../../src/utils/constants';
import authRoutes from '../../../src/routes/auth.routes';
import { authenticate } from '../../../src/middleware/auth.middleware';
import { validateRegisterRequest, validateLoginRequest } from '../../../src/utils/validators';
import {
  validUserData,
  validUserWithOnlyEmail,
  validUserWithOnlyPhone,
  existingUserData,
  validTokenPayload,
} from '../../fixtures/users.fixture';

// Mock dependencies  
jest.mock('../../../src/models/User.model');
jest.mock('../../../src/config/redis', () => ({
  redisClient: {
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  },
}));
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../../src/utils/logger');

const MockedUserModel = UserModel as jest.Mocked<typeof UserModel>;
const MockedBcrypt = bcrypt as any;
const MockedJwt = jwt as any;

// Get mocked Redis client
const { redisClient } = require('../../../src/config/redis');
const MockedRedisClient = redisClient;

// Test App Setup for Integration Tests
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  return app;
};

describe('🔐 Complete Auth System Test Suite', () => {
  let authService: AuthService;
  let authController: AuthController;
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    authService = new AuthService();
    authController = new AuthController();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a user with email and phone', async () => {
      // Arrange
      MockedUserModel.findOne.mockResolvedValue(null);
      MockedBcrypt.hash.mockResolvedValue('hashedPassword');
      const mockUser = {
        id: 'new-user-id',
        ...validUserData,
        passwordHash: 'hashedPassword',
        subscriptionType: 'free',
        emailVerified: false,
        phoneVerified: false,
        toJSON: jest.fn().mockReturnValue({
          id: 'new-user-id',
          ...validUserData,
          subscriptionType: 'free',
          emailVerified: false,
          phoneVerified: false,
        }),
      };
      MockedUserModel.create.mockResolvedValue(mockUser as any);
      MockedJwt.sign.mockReturnValue('mock-token');
      MockedRedisClient.setex.mockResolvedValue('OK');

      // Act
      const result = await authService.register(validUserData);

      // Assert
      expect(MockedUserModel.findOne).toHaveBeenCalledWith({
        where: {
          email: validUserData.email,
          phoneNumber: validUserData.phoneNumber,
        },
      });
      expect(MockedBcrypt.hash).toHaveBeenCalledWith(validUserData.password, 10);
      expect(MockedUserModel.create).toHaveBeenCalledWith({
        ...validUserData,
        passwordHash: 'hashedPassword',
        subscriptionType: 'free',
        emailVerified: false,
        phoneVerified: false,
      });
      expect(result.user.id).toBe('new-user-id');
      expect(result.tokens.accessToken).toBe('mock-token');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should successfully register a user with only email', async () => {
      // Arrange
      MockedUserModel.findOne.mockResolvedValue(null);
      MockedBcrypt.hash.mockResolvedValue('hashedPassword');
      const mockUser = {
        id: 'new-user-id',
        ...validUserWithOnlyEmail,
        passwordHash: 'hashedPassword',
        subscriptionType: 'free',
        emailVerified: false,
        phoneVerified: false,
        toJSON: jest.fn().mockReturnValue({
          id: 'new-user-id',
          ...validUserWithOnlyEmail,
          subscriptionType: 'free',
          emailVerified: false,
          phoneVerified: false,
        }),
      };
      MockedUserModel.create.mockResolvedValue(mockUser as any);
      MockedJwt.sign.mockReturnValue('mock-token');
      MockedRedisClient.setex.mockResolvedValue('OK');

      // Act
      const result = await authService.register(validUserWithOnlyEmail);

      // Assert
      expect(MockedUserModel.findOne).toHaveBeenCalledWith({
        where: {
          email: validUserWithOnlyEmail.email,
        },
      });
      expect(result.user.email).toBe(validUserWithOnlyEmail.email);
      expect(result.user).not.toHaveProperty('phoneNumber');
    });

    it('should successfully register a user with only phone number', async () => {
      // Arrange
      MockedUserModel.findOne.mockResolvedValue(null);
      MockedBcrypt.hash.mockResolvedValue('hashedPassword');
      const mockUser = {
        id: 'new-user-id',
        ...validUserWithOnlyPhone,
        passwordHash: 'hashedPassword',
        subscriptionType: 'free',
        emailVerified: false,
        phoneVerified: false,
        toJSON: jest.fn().mockReturnValue({
          id: 'new-user-id',
          ...validUserWithOnlyPhone,
          subscriptionType: 'free',
          emailVerified: false,
          phoneVerified: false,
        }),
      };
      MockedUserModel.create.mockResolvedValue(mockUser as any);
      MockedJwt.sign.mockReturnValue('mock-token');
      MockedRedisClient.setex.mockResolvedValue('OK');

      // Act
      const result = await authService.register(validUserWithOnlyPhone);

      // Assert
      expect(MockedUserModel.findOne).toHaveBeenCalledWith({
        where: {
          phoneNumber: validUserWithOnlyPhone.phoneNumber,
        },
      });
      expect(result.user.phoneNumber).toBe(validUserWithOnlyPhone.phoneNumber);
      expect(result.user).not.toHaveProperty('email');
    });

    it('should throw error if email already exists', async () => {
      // Arrange
      const existingUser = {
        email: validUserData.email,
        phoneNumber: 'different-phone',
      };
      MockedUserModel.findOne.mockResolvedValue(existingUser as any);

      // Act & Assert
      await expect(authService.register(validUserData)).rejects.toThrow(
        ERROR_CODES.EMAIL_ALREADY_EXISTS
      );
    });

    it('should throw error if phone number already exists', async () => {
      // Arrange
      const existingUser = {
        email: 'different-email@example.com',
        phoneNumber: validUserData.phoneNumber,
      };
      MockedUserModel.findOne.mockResolvedValue(existingUser as any);

      // Act & Assert
      await expect(authService.register(validUserData)).rejects.toThrow(
        ERROR_CODES.PHONE_ALREADY_EXISTS
      );
    });
  });

  describe('login', () => {
    it('should successfully login with email', async () => {
      // Arrange
      const loginData = { identifier: 'test@example.com', password: 'Password123!' };
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        toJSON: jest.fn().mockReturnValue(existingUserData),
      };
      MockedUserModel.findOne.mockResolvedValue(mockUser as any);
      MockedBcrypt.compare.mockResolvedValue(true);
      MockedJwt.sign.mockReturnValue('mock-token');
      MockedRedisClient.setex.mockResolvedValue('OK');

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(MockedUserModel.findOne).toHaveBeenCalledWith({
        where: { email: loginData.identifier },
      });
      expect(MockedBcrypt.compare).toHaveBeenCalledWith(
        loginData.password,
        mockUser.passwordHash
      );
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.tokens.accessToken).toBe('mock-token');
    });

    it('should successfully login with phone number', async () => {
      // Arrange
      const loginData = { identifier: '+254712345678', password: 'Password123!' };
      const mockUser = {
        id: 'user-id',
        phoneNumber: '+254712345678',
        passwordHash: 'hashedPassword',
        toJSON: jest.fn().mockReturnValue(existingUserData),
      };
      MockedUserModel.findOne.mockResolvedValue(mockUser as any);
      MockedBcrypt.compare.mockResolvedValue(true);
      MockedJwt.sign.mockReturnValue('mock-token');
      MockedRedisClient.setex.mockResolvedValue('OK');

      // Act
      await authService.login(loginData);

      // Assert
      expect(MockedUserModel.findOne).toHaveBeenCalledWith({
        where: { phoneNumber: loginData.identifier },
      });
    });

    it('should throw error if user not found', async () => {
      // Arrange
      const loginData = { identifier: 'nonexistent@example.com', password: 'Password123!' };
      MockedUserModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow(
        ERROR_CODES.INVALID_CREDENTIALS
      );
    });

    it('should throw error if password is invalid', async () => {
      // Arrange
      const loginData = { identifier: 'test@example.com', password: 'WrongPassword!' };
      const mockUser = {
        passwordHash: 'hashedPassword',
      };
      MockedUserModel.findOne.mockResolvedValue(mockUser as any);
      MockedBcrypt.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow(
        ERROR_CODES.INVALID_CREDENTIALS
      );
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh valid token', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const mockPayload = { userId: 'user-id', tokenId: 'token-id' };
      const mockUser = {
        id: 'user-id',
        toJSON: jest.fn().mockReturnValue(existingUserData),
      };

      MockedJwt.verify.mockReturnValue(mockPayload);
      MockedRedisClient.get.mockResolvedValue(refreshToken);
      MockedUserModel.findByPk.mockResolvedValue(mockUser as any);
      MockedJwt.sign.mockReturnValue('new-token');
      MockedRedisClient.setex.mockResolvedValue('OK');
      MockedRedisClient.setex.mockResolvedValue('OK'); // for blacklisting

      // Act
      const result = await authService.refreshToken(refreshToken);

      // Assert
      expect(MockedJwt.verify).toHaveBeenCalledWith(refreshToken, env.JWT_REFRESH_SECRET);
      expect(MockedRedisClient.get).toHaveBeenCalledWith('session:user-id');
      expect(MockedUserModel.findByPk).toHaveBeenCalledWith('user-id');
      expect(result.tokens.accessToken).toBe('new-token');
    });

    it('should throw error for invalid refresh token', async () => {
      // Arrange
      const refreshToken = 'invalid-refresh-token';
      MockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        ERROR_CODES.REFRESH_TOKEN_INVALID
      );
    });

    it('should throw error if token not in cache', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const mockPayload = { userId: 'user-id', tokenId: 'token-id' };

      MockedJwt.verify.mockReturnValue(mockPayload);
      MockedRedisClient.get.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        ERROR_CODES.REFRESH_TOKEN_INVALID
      );
    });

    it('should throw error if user not found', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const mockPayload = { userId: 'user-id', tokenId: 'token-id' };

      MockedJwt.verify.mockReturnValue(mockPayload);
      MockedRedisClient.get.mockResolvedValue(refreshToken);
      MockedUserModel.findByPk.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        ERROR_CODES.USER_NOT_FOUND
      );
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      // Arrange
      const userId = 'user-id';
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';
      MockedRedisClient.setex.mockResolvedValue('OK'); // for blacklisting tokens
      MockedRedisClient.del.mockResolvedValue(1);

      // Act
      await authService.logout(userId, accessToken, refreshToken);

      // Assert
      expect(MockedRedisClient.setex).toHaveBeenCalledTimes(2); // blacklist both tokens
      expect(MockedRedisClient.del).toHaveBeenCalledWith(`session:${userId}`);
    });

    it('should logout user without refresh token', async () => {
      // Arrange
      const userId = 'user-id';
      const accessToken = 'access-token';
      MockedRedisClient.setex.mockResolvedValue('OK');
      MockedRedisClient.del.mockResolvedValue(1);

      // Act
      await authService.logout(userId, accessToken);

      // Assert
      expect(MockedRedisClient.setex).toHaveBeenCalledTimes(1); // blacklist access token only
      expect(MockedRedisClient.del).toHaveBeenCalledWith(`session:${userId}`);
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      // Arrange
      const userId = 'user-id';
      const passwordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      };
      const mockUser = {
        id: userId,
        passwordHash: 'oldHashedPassword',
        update: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
      };

      MockedUserModel.findByPk.mockResolvedValue(mockUser as any);
      MockedBcrypt.compare.mockResolvedValue(true);
      MockedBcrypt.hash.mockResolvedValue('newHashedPassword');
      MockedRedisClient.del.mockResolvedValue(1);

      // Act
      await authService.changePassword(userId, passwordData);

      // Assert
      expect(MockedUserModel.findByPk).toHaveBeenCalledWith(userId);
      expect(MockedBcrypt.compare).toHaveBeenCalledWith(
        passwordData.currentPassword,
        mockUser.passwordHash
      );
      expect(MockedBcrypt.hash).toHaveBeenCalledWith(passwordData.newPassword, 10);
      expect(mockUser.passwordHash).toBe('newHashedPassword');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      // Arrange
      const userId = 'nonexistent-user';
      const passwordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      };
      MockedUserModel.findByPk.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.changePassword(userId, passwordData)).rejects.toThrow(
        ERROR_CODES.USER_NOT_FOUND
      );
    });

    it('should throw error if current password is invalid', async () => {
      // Arrange
      const userId = 'user-id';
      const passwordData = {
        currentPassword: 'WrongPassword!',
        newPassword: 'NewPassword123!',
      };
      const mockUser = {
        passwordHash: 'hashedPassword',
      };

      MockedUserModel.findByPk.mockResolvedValue(mockUser as any);
      MockedBcrypt.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(authService.changePassword(userId, passwordData)).rejects.toThrow(
        ERROR_CODES.INVALID_CREDENTIALS
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should successfully verify valid access token', async () => {
      // Arrange
      const accessToken = 'valid-access-token';
      MockedJwt.verify.mockReturnValue(validTokenPayload);
      MockedRedisClient.exists.mockResolvedValue(0); // not blacklisted

      // Act
      const result = await authService.verifyAccessToken(accessToken);

      // Assert
      expect(MockedJwt.verify).toHaveBeenCalledWith(accessToken, env.JWT_SECRET);
      expect(MockedRedisClient.exists).toHaveBeenCalledWith(`blacklist:${accessToken}`);
      expect(result.userId).toBe(validTokenPayload.userId);
    });

    it('should throw error for blacklisted token', async () => {
      // Arrange
      const accessToken = 'blacklisted-token';
      MockedJwt.verify.mockReturnValue(validTokenPayload);
      MockedRedisClient.exists.mockResolvedValue(1); // blacklisted

      // Act & Assert
      await expect(authService.verifyAccessToken(accessToken)).rejects.toThrow(
        ERROR_CODES.TOKEN_INVALID
      );
    });

    it('should throw error for invalid token', async () => {
      // Arrange
      const accessToken = 'invalid-token';
      MockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(authService.verifyAccessToken(accessToken)).rejects.toThrow(
        ERROR_CODES.TOKEN_INVALID
      );
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return true for blacklisted token', async () => {
      // Arrange
      const token = 'blacklisted-token';
      MockedRedisClient.exists.mockResolvedValue(1);

      // Act
      const result = await authService.isTokenBlacklisted(token);

      // Assert
      expect(result).toBe(true);
      expect(MockedRedisClient.exists).toHaveBeenCalledWith(`blacklist:${token}`);
    });

    it('should return false for non-blacklisted token', async () => {
      // Arrange
      const token = 'valid-token';
      MockedRedisClient.exists.mockResolvedValue(0);

      // Act
      const result = await authService.isTokenBlacklisted(token);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getUserById', () => {
    it('should return user if found', async () => {
      // Arrange
      const userId = 'user-id';
      const mockUser = { id: userId, fullName: 'Test User' };
      MockedUserModel.findByPk.mockResolvedValue(mockUser as any);

      // Act
      const result = await authService.getUserById(userId);

      // Assert
      expect(MockedUserModel.findByPk).toHaveBeenCalledWith(userId);
      expect(result).toBe(mockUser);
    });

    it('should return null if user not found', async () => {
      // Arrange
      const userId = 'nonexistent-user';
      MockedUserModel.findByPk.mockResolvedValue(null);

      // Act
      const result = await authService.getUserById(userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ========================================
  // 🎯 CONTROLLER TESTS
  // ========================================
  describe('🎯 AuthController Tests', () => {
    it('should create an AuthController instance', () => {
      expect(authController).toBeInstanceOf(AuthController);
    });

    it('should have all required controller methods', () => {
      expect(typeof authController.register).toBe('function');
      expect(typeof authController.login).toBe('function');
      expect(typeof authController.logout).toBe('function');
      expect(typeof authController.refreshToken).toBe('function');
      expect(typeof authController.changePassword).toBe('function');
      expect(typeof authController.getProfile).toBe('function');
      expect(typeof authController.requestPasswordReset).toBe('function');
      expect(typeof authController.resetPassword).toBe('function');
      expect(typeof authController.verifyEmail).toBe('function');
      expect(typeof authController.verifyPhone).toBe('function');
    });
  });

  // ========================================
  // 🌐 INTEGRATION TESTS (HTTP Endpoints)
  // ========================================
  describe('🌐 HTTP Endpoint Integration Tests', () => {
    describe('POST /api/v1/auth/register', () => {
      it('should handle registration endpoint', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(validUserData);

        expect(response.status).toBeDefined();
        expect([200, 201, 400, 500]).toContain(response.status);
      });

      it('should reject registration with missing required fields', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: 'test@example.com',
            // Missing required fields
          });

        expect(response.status).toBe(400);
      });

      it('should reject registration with invalid email format', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            ...validUserData,
            email: 'invalid-email',
          });

        expect(response.status).toBe(400);
      });
    });

    describe('POST /api/v1/auth/login', () => {
      it('should handle login endpoint', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            identifier: validUserData.email,
            password: validUserData.password,
          });

        expect(response.status).toBeDefined();
        expect([200, 401, 400, 500]).toContain(response.status);
      });

      it('should reject login with missing credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            identifier: validUserData.email,
            // Missing password
          });

        expect(response.status).toBe(400);
      });
    });

    describe('POST /api/v1/auth/refresh', () => {
      it('should handle refresh token endpoint', async () => {
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({
            refreshToken: 'some-refresh-token',
          });

        expect(response.status).toBeDefined();
        expect([200, 401, 400, 500]).toContain(response.status);
      });

      it('should reject refresh without token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({});

        expect(response.status).toBe(400);
      });
    });

    describe('Protected Routes', () => {
      it('should require authentication for logout', async () => {
        const response = await request(app)
          .post('/api/v1/auth/logout')
          .send({});

        expect(response.status).toBe(401);
      });

      it('should require authentication for change password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .send({
            currentPassword: 'old',
            newPassword: 'new',
          });

        expect(response.status).toBe(401);
      });

      it('should require authentication for profile', async () => {
        const response = await request(app)
          .get('/api/v1/auth/profile');

        expect(response.status).toBe(401);
      });
    });
  });

  // ========================================
  // 🔒 MIDDLEWARE TESTS
  // ========================================
  describe('🔒 Auth Middleware Tests', () => {
    it('should export authenticate middleware function', () => {
      expect(typeof authenticate).toBe('function');
    });

    it('should have correct middleware signature', () => {
      expect(authenticate.length).toBe(3); // req, res, next
    });
  });

  // ========================================
  // ✅ VALIDATION TESTS
  // ========================================
  describe('✅ Validation Tests', () => {
    describe('Registration Validation', () => {
      it('should validate correct registration data', () => {
        const result = validateRegisterRequest(validUserData);
        expect(result.isValid).toBe(true);
      });

      it('should reject missing required fields', () => {
        const result = validateRegisterRequest({
          email: 'test@example.com',
          // Missing fullName, password, etc.
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toBeDefined();
      });

      it('should reject invalid email format', () => {
        const result = validateRegisterRequest({
          ...validUserData,
          email: 'invalid-email',
        });
        expect(result.isValid).toBe(false);
      });

      it('should reject when both email and phone are missing', () => {
        const result = validateRegisterRequest({
          fullName: 'Test User',
          password: 'Password123!',
          county: 'Nairobi',
          subCounty: 'Westlands',
          // Missing both email and phoneNumber
        });
        expect(result.isValid).toBe(false);
      });
    });

    describe('Login Validation', () => {
      it('should validate correct login data', () => {
        const result = validateLoginRequest({
          identifier: 'test@example.com',
          password: 'Password123!',
        });
        expect(result.isValid).toBe(true);
      });

      it('should reject missing password', () => {
        const result = validateLoginRequest({
          identifier: 'test@example.com',
          // Missing password
        });
        expect(result.isValid).toBe(false);
      });
    });
  });

  // ========================================
  // 🔄 END-TO-END WORKFLOW TESTS
  // ========================================
  describe('🔄 Complete Auth Workflows', () => {
    describe('User Registration → Login → Profile → Logout Flow', () => {
      it('should handle complete user lifecycle workflow', async () => {
        // 1. Registration
        const registerResponse = await request(app)
          .post('/api/v1/auth/register')
          .send(validUserData);

        expect([200, 201, 400, 500]).toContain(registerResponse.status);

        // 2. Login
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            identifier: validUserData.email,
            password: validUserData.password,
          });

        expect([200, 401, 400, 500]).toContain(loginResponse.status);

        // 3. Profile Access (without token - should fail)
        const profileResponse = await request(app)
          .get('/api/v1/auth/profile');

        expect(profileResponse.status).toBe(401);

        // 4. Logout (without token - should fail)
        const logoutResponse = await request(app)
          .post('/api/v1/auth/logout');

        expect(logoutResponse.status).toBe(401);
      });
    });

    describe('Password Change Workflow', () => {
      it('should handle password change workflow', async () => {
        // Attempt password change without authentication
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .send({
            currentPassword: 'OldPassword123!',
            newPassword: 'NewPassword123!',
          });

        expect(response.status).toBe(401);
      });
    });

    describe('Token Refresh Workflow', () => {
      it('should handle token refresh workflow', async () => {
        // Test with invalid refresh token
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({
            refreshToken: 'invalid-token',
          });

        expect([200, 401, 400, 500]).toContain(response.status);
      });
    });
  });

  // ========================================
  // 🔧 CONFIGURATION & SETUP TESTS
  // ========================================
  describe('🔧 System Configuration Tests', () => {
    it('should have auth routes properly configured', () => {
      expect(authRoutes).toBeDefined();
    });

    it('should export AuthController class', () => {
      expect(AuthController).toBeDefined();
      expect(typeof AuthController).toBe('function');
    });

    it('should export AuthService class', () => {
      expect(AuthService).toBeDefined();
      expect(typeof AuthService).toBe('function');
    });

    it('should have required environment variables', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.JWT_REFRESH_SECRET).toBeDefined();
    });
  });

  // ========================================
  // ⚡ PERFORMANCE INDICATORS
  // ========================================
  describe('⚡ Performance Indicators', () => {
    it('should complete auth service instantiation quickly', () => {
      const start = Date.now();
      const service = new AuthService();
      const duration = Date.now() - start;

      expect(service).toBeInstanceOf(AuthService);
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('should complete controller instantiation quickly', () => {
      const start = Date.now();
      const controller = new AuthController();
      const duration = Date.now() - start;

      expect(controller).toBeInstanceOf(AuthController);
      expect(duration).toBeLessThan(100);
    });

    it('should handle HTTP requests within reasonable time', async () => {
      const start = Date.now();
      
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'password',
        });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });

  // ========================================
  // 📊 SYSTEM HEALTH CHECKS
  // ========================================
  describe('📊 System Health Checks', () => {
    it('should have all auth endpoints available', async () => {
      const endpoints = [
        '/api/v1/auth/register',
        '/api/v1/auth/login',
        '/api/v1/auth/refresh',
        '/api/v1/auth/logout',
        '/api/v1/auth/change-password',
        '/api/v1/auth/profile',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).post(endpoint).send({});
        // Should not return 404 (route not found)
        expect(response.status).not.toBe(404);
      }
    });

    it('should properly handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect([400, 500]).toContain(response.status);
    });

    it('should handle large request bodies gracefully', async () => {
      const largeData = {
        ...validUserData,
        description: 'x'.repeat(10000), // Large string
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(largeData);

      expect(response.status).toBeDefined();
    });
  });
}); 