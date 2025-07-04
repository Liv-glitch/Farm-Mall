import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { AuthController } from '../src/controllers/auth.controller';
import { AuthService } from '../src/services/auth.service';
import authRoutes from '../src/routes/auth.routes';

// Simple test app setup
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/v1/auth', authRoutes);
  return app;
};

describe('🚀 Auth System - Basic Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('System Setup', () => {
    it('should create AuthService instance', () => {
      const authService = new AuthService();
      expect(authService).toBeInstanceOf(AuthService);
    });

    it('should create AuthController instance', () => {
      const authController = new AuthController();
      expect(authController).toBeInstanceOf(AuthController);
    });

    it('should have auth routes configured', () => {
      expect(authRoutes).toBeDefined();
    });
  });

  describe('API Endpoints', () => {
    it('should handle POST /api/v1/auth/register', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Test User',
          email: 'test@example.com',
          password: 'Password123!',
          county: 'Nairobi',
          subCounty: 'Westlands',
        });

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404);
      // Should return some validation response
      expect(response.body).toBeDefined();
    });

    it('should handle POST /api/v1/auth/login', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'Password123!',
        });

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404);
      // Should return some response
      expect(response.body).toBeDefined();
    });

    it('should handle POST /api/v1/auth/refresh', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'some-token',
        });

      // Should not return 404 (route exists)
      expect(response.status).not.toBe(404);
      // Should return some response
      expect(response.body).toBeDefined();
    });

    it('should require auth for protected routes', async () => {
      // Test POST endpoints
      const postEndpoints = [
        '/api/v1/auth/logout',
        '/api/v1/auth/change-password',
      ];

      for (const endpoint of postEndpoints) {
        const response = await request(app)
          .post(endpoint)
          .send({});

        // Should return 401 (unauthorized) for protected routes
        expect(response.status).toBe(401);
      }

      // Test GET endpoint
      const profileResponse = await request(app)
        .get('/api/v1/auth/profile');

      expect(profileResponse.status).toBe(401);
    });
  });

  describe('Validation', () => {
    it('should validate registration data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate login data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: 'test@example.com',
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Environment', () => {
    it('should have test environment configured', () => {
      expect(process.env.NODE_ENV).toBe('test');
    });

    it('should have JWT secrets configured', () => {
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.JWT_REFRESH_SECRET).toBeDefined();
    });
  });
}); 