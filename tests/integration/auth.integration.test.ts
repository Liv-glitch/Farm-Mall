import request from 'supertest';
import app from '../../src/app';
import { testDb } from '../setup';
import { UserModel } from '../../src/models';
import { validUserData, validUserWithOnlyEmail, validUserWithOnlyPhone } from '../fixtures/users.fixture';
import { ERROR_CODES, HTTP_STATUS } from '../../src/utils/constants';

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database
    await testDb.sync({ force: true });
  });

  afterEach(async () => {
    // Clean up database after each test - skip if no table exists
    try {
      await UserModel.destroy({ where: {}, force: true });
    } catch (error) {
      // Ignore table doesn't exist errors during cleanup
    }
  });

  afterAll(async () => {
    await testDb.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with email and phone', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData)
        .expect(HTTP_STATUS.CREATED);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.user.fullName).toBe(validUserData.fullName);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should register a new user with only email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserWithOnlyEmail)
        .expect(HTTP_STATUS.CREATED);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(validUserWithOnlyEmail.email);
      expect(response.body.data.user).not.toHaveProperty('phoneNumber');
    });

    it('should register a new user with only phone', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserWithOnlyPhone)
        .expect(HTTP_STATUS.CREATED);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.phoneNumber).toBe(validUserWithOnlyPhone.phoneNumber);
      expect(response.body.data.user).not.toHaveProperty('email');
    });

    it('should return error for duplicate email', async () => {
      // Create user first
      await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData);

      // Try to register with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUserData,
          phoneNumber: '+254700000000', // different phone
        })
        .expect(HTTP_STATUS.CONFLICT);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe(ERROR_CODES.EMAIL_ALREADY_EXISTS);
    });

    it('should return error for duplicate phone number', async () => {
      // Create user first
      await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData);

      // Try to register with same phone
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUserData,
          email: 'different@example.com', // different email
        })
        .expect(HTTP_STATUS.CONFLICT);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe(ERROR_CODES.PHONE_ALREADY_EXISTS);
    });

    it('should return validation error for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          // missing fullName, county, subCounty
        })
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
    });

    it('should return validation error for invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validUserData,
          email: 'invalid-email',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return validation error when both email and phone are missing', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Test User',
          password: 'Password123!',
          county: 'Nairobi',
          subCounty: 'Westlands',
          // missing both email and phoneNumber
        })
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let registeredUser: any;

    beforeEach(async () => {
      // Register a user for login tests
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData);
      
      registeredUser = registerResponse.body.data;
    });

    it('should login with email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: validUserData.email,
          password: validUserData.password,
        })
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user.id).toBe(registeredUser.user.id);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should login with phone number', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: validUserData.phoneNumber,
          password: validUserData.password,
        })
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(registeredUser.user.id);
    });

    it('should return error for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: validUserData.email,
          password: 'WrongPassword!',
        })
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
    });

    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
    });

    it('should return validation error for missing fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: validUserData.email,
          // missing password
        })
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let tokens: any;

    beforeEach(async () => {
      // Register and login to get tokens
      await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData);
      
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: validUserData.email,
          password: validUserData.password,
        });
      
      tokens = loginResponse.body.data.tokens;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: tokens.refreshToken,
        })
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data.tokens.accessToken).not.toBe(tokens.accessToken);
    });

    it('should return error for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe(ERROR_CODES.MISSING_REQUIRED_FIELD);
    });

    it('should return error for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe(ERROR_CODES.REFRESH_TOKEN_INVALID);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let tokens: any;

    beforeEach(async () => {
      // Register and login to get tokens
      await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData);
      
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: validUserData.email,
          password: validUserData.password,
        });
      
      tokens = loginResponse.body.data.tokens;
    });

    it('should logout user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          refreshToken: tokens.refreshToken,
        })
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });

    it('should logout user without refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({})
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
    });

    it('should return error for missing authorization header', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({
          refreshToken: tokens.refreshToken,
        })
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    let tokens: any;

    beforeEach(async () => {
      // Register and login to get tokens
      await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData);
      
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: validUserData.email,
          password: validUserData.password,
        });
      
      tokens = loginResponse.body.data.tokens;
    });

    it('should change password successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          currentPassword: validUserData.password,
          newPassword: 'NewPassword123!',
        })
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');
    });

    it('should return error for invalid current password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          currentPassword: 'WrongPassword!',
          newPassword: 'NewPassword123!',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
    });

    it('should return validation error for missing fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          currentPassword: validUserData.password,
          // missing newPassword
        })
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    let user: any;
    let tokens: any;

    beforeEach(async () => {
      // Register and login to get user and tokens
      await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData);
      
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: validUserData.email,
          password: validUserData.password,
        });
      
      user = loginResponse.body.data.user;
      tokens = loginResponse.body.data.tokens;
    });

    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(HTTP_STATUS.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile retrieved successfully');
      expect(response.body.data.user.id).toBe(user.id);
      expect(response.body.data.user.email).toBe(user.email);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should return error for missing authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
    });

    it('should return error for invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(response.body.success).toBe(false);
    });
  });
}); 