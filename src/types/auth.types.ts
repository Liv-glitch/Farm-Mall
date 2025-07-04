export interface User {
  id: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  passwordHash: string;
  county: string;
  subCounty: string;
  profilePictureUrl?: string;
  locationLat?: number;
  locationLng?: number;
  subscriptionType: 'free' | 'premium';
  subscriptionExpiresAt?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterRequest {
  fullName: string;
  email?: string;
  phoneNumber?: string;
  password: string;
  county: string;
  subCounty: string;
  locationLat?: number;
  locationLng?: number;
  role?: 'user' | 'admin';
}

export interface LoginRequest {
  identifier: string; // email or phone number
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  tokens: AuthTokens;
}

export interface JWTPayload {
  userId: string;
  email?: string;
  phoneNumber?: string;
  subscriptionType: 'free' | 'premium';
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat: number;
  exp: number;
}

export interface PasswordResetRequest {
  identifier: string; // email or phone number
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyPhoneRequest {
  phoneNumber: string;
  verificationCode: string;
}

export interface AuthenticatedRequest extends Request {
  user: User;
}

// Subscription types
export interface SubscriptionFeatures {
  canAccessWeatherData: boolean;
  canExportData: boolean;
  canAccessAdvancedAnalytics: boolean;
  canAccessSoilRecommendations: boolean;
  maxProductionCycles: number;
  maxPestAnalysesPerMonth: number;
  canAccessMarketplace: boolean;
}

export const SUBSCRIPTION_FEATURES: Record<'free' | 'premium', SubscriptionFeatures> = {
  free: {
    canAccessWeatherData: false,
    canExportData: false,
    canAccessAdvancedAnalytics: false,
    canAccessSoilRecommendations: false,
    maxProductionCycles: 3,
    maxPestAnalysesPerMonth: 5,
    canAccessMarketplace: false,
  },
  premium: {
    canAccessWeatherData: true,
    canExportData: true,
    canAccessAdvancedAnalytics: true,
    canAccessSoilRecommendations: true,
    maxProductionCycles: -1, // unlimited
    maxPestAnalysesPerMonth: -1, // unlimited
    canAccessMarketplace: true,
  },
}; 