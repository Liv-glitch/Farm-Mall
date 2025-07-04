import { Sequelize } from 'sequelize';

// Test database configuration
export const testDb = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

// Mock Redis for tests
jest.mock('../src/config/redis', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    setex: jest.fn(),
    exists: jest.fn(),
  },
}));

// Test utilities
export const createTestUser = (overrides: any = {}) => ({
  id: 'test-user-id',
  fullName: 'Test User',
  email: 'test@example.com',
  phoneNumber: '+254712345678',
  passwordHash: '$2b$10$hashedpassword',
  county: 'Nairobi',
  subCounty: 'Westlands',
  subscriptionType: 'free' as const,
  emailVerified: false,
  phoneVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestRegisterRequest = (overrides: any = {}) => ({
  fullName: 'Test User',
  email: 'test@example.com',
  phoneNumber: '+254712345678',
  password: 'Password123!',
  county: 'Nairobi',
  subCounty: 'Westlands',
  ...overrides,
});

export const createTestLoginRequest = (overrides: any = {}) => ({
  identifier: 'test@example.com',
  password: 'Password123!',
  ...overrides,
});

// Test environment setup
export const setupTestEnvironment = async () => {
  await testDb.authenticate();
};

export const cleanupTestEnvironment = async () => {
  await testDb.close();
}; 