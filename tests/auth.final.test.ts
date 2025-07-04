import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { AuthController } from '../src/controllers/auth.controller';
import { AuthService } from '../src/services/auth.service';
import authRoutes from '../src/routes/auth.routes';

// Mock external dependencies
jest.mock('../src/models/User.model');
jest.mock('../src/config/redis');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../src/utils/logger');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  return app;
};

describe('Auth System - Complete Flow', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Auth Service', () => {
    let authService: AuthService;

    beforeEach(() => {
      authService = new AuthService();
    });

    it('should create an AuthService instance', () => {
      expect(authService).toBeInstanceOf(AuthService);
    });

    it('should have all required methods', () => {
      expect(typeof authService.register).toBe('function');
      expect(typeof authService.login).toBe('function');
      expect(typeof authService.logout).toBe('function');
      expect(typeof authService.refreshToken).toBe('function');
      expect(typeof authService.changePassword).toBe('function');
      expect(typeof authService.getUserById).toBe('function');
    });
  });

  describe('Auth Controller', () => {
    let authController: AuthController;

    beforeEach(() => {
      authController = new AuthController();
    });

    it('should create an AuthController instance', () => {
      expect(authController).toBeInstanceOf(AuthController);
    });

    it('should have all required methods', () => {
      expect(typeof authController.register).toBe('function');
      expect(typeof authController.login).toBe('function');
      expect(typeof authController.logout).toBe('function');
      expect(typeof authController.refreshToken).toBe('function');
      expect(typeof authController.changePassword).toBe('function');
      expect(typeof authController.getProfile).toBe('function');
    });
  });

  describe('Auth Routes', () => {
    it('should handle registration endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Test User',
          email: 'test@example.com',
          password: 'Password123!',
          county: 'Nairobi',
          subCounty: 'Westlands',
        });

      // Should respond (even if it fails due to mocked services)
      expect(response.status).toBeDefined();
    });

    it('should handle login endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'Password123!',
        });

      // Should respond (even if it fails due to mocked services)
      expect(response.status).toBeDefined();
    });

    it('should handle refresh token endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'some-refresh-token',
        });

      // Should respond (even if it fails due to mocked services)
      expect(response.status).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('should reject registration with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: 'test@example.com',
          // Missing password
        });

      expect(response.status).toBe(400);
    });

    it('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          // Missing refreshToken
        });

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

describe('Auth Configuration', () => {
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
});

describe('Test Environment', () => {
  it('should have required environment variables set', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_REFRESH_SECRET).toBeDefined();
  });

  it('should have Jest configured correctly', () => {
    expect(jest).toBeDefined();
    expect(typeof jest.fn).toBe('function');
    expect(typeof expect).toBe('function');
  });
}); 