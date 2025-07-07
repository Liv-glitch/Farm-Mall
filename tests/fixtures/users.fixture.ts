import { RegisterRequest, User } from '../../src/types/auth.types';

export const validUserData: RegisterRequest = {
  fullName: 'John Doe',
  email: 'john.doe@example.com',
  phoneNumber: '+254712345678',
  password: 'SecurePassword123!',
  county: 'Nairobi',
  subCounty: 'Westlands',
  locationLat: -1.2921,
  locationLng: 36.8219,
};

export const validUserWithOnlyEmail: RegisterRequest = {
  fullName: 'Jane Smith',
  email: 'jane.smith@example.com',
  password: 'SecurePassword123!',
  county: 'Mombasa',
  subCounty: 'Mvita',
};

export const validUserWithOnlyPhone: RegisterRequest = {
  fullName: 'Bob Wilson',
  phoneNumber: '+254787654321',
  password: 'SecurePassword123!',
  county: 'Kisumu',
  subCounty: 'Kisumu Central',
};

export const existingUserData: Omit<User, 'passwordHash'> = {
  id: 'existing-user-id',
  fullName: 'Existing User',
  email: 'existing@example.com',
  phoneNumber: '+254700000000',
  county: 'Nakuru',
  subCounty: 'Nakuru Town East',
  subscriptionType: 'free',
  emailVerified: true,
  phoneVerified: true,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  role: 'user'
};

export const premiumUserData: Omit<User, 'passwordHash'> = {
  id: 'premium-user-id',
  fullName: 'Premium User',
  email: 'premium@example.com',
  phoneNumber: '+254711111111',
  county: 'Nairobi',
  subCounty: 'Westlands',
  subscriptionType: 'premium',
  subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  emailVerified: true,
  phoneVerified: true,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  role: 'user'
};

export const invalidUserData = {
  missingRequired: {
    email: 'test@example.com',
    password: 'Password123!',
    // missing fullName, county, subCounty
  },
  invalidEmail: {
    fullName: 'Test User',
    email: 'invalid-email',
    password: 'Password123!',
    county: 'Nairobi',
    subCounty: 'Westlands',
  },
  invalidPhone: {
    fullName: 'Test User',
    phoneNumber: 'invalid-phone',
    password: 'Password123!',
    county: 'Nairobi',
    subCounty: 'Westlands',
  },
  weakPassword: {
    fullName: 'Test User',
    email: 'test@example.com',
    password: '123',
    county: 'Nairobi',
    subCounty: 'Westlands',
  },
  bothEmailAndPhoneMissing: {
    fullName: 'Test User',
    password: 'Password123!',
    county: 'Nairobi',
    subCounty: 'Westlands',
  },
};

export const validTokenPayload = {
  userId: 'test-user-id',
  email: 'test@example.com',
  subscriptionType: 'free' as const,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
};

export const expiredTokenPayload = {
  userId: 'test-user-id',
  email: 'test@example.com',
  subscriptionType: 'free' as const,
  iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
  exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
}; 