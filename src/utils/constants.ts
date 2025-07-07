// API Response Constants
export const API_RESPONSES = {
  SUCCESS: 'success',
  ERROR: 'error',
  VALIDATION_ERROR: 'validation_error',
  AUTHENTICATION_ERROR: 'authentication_error',
  AUTHORIZATION_ERROR: 'authorization_error',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  INTERNAL_SERVER_ERROR: 'internal_server_error',
} as const;

// Error Codes
export const ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  PHONE_ALREADY_EXISTS: 'PHONE_ALREADY_EXISTS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  PHONE_NOT_VERIFIED: 'PHONE_NOT_VERIFIED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',
  PASSWORD_RESET_TOKEN_INVALID: 'PASSWORD_RESET_TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  TOKEN_BLACKLISTED: 'TOKEN_BLACKLISTED',
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',
  INVALID_RESET_TOKEN: 'INVALID_RESET_TOKEN',
  RESET_TOKEN_EXPIRED: 'RESET_TOKEN_EXPIRED',
  VERIFICATION_CODE_INVALID: 'VERIFICATION_CODE_INVALID',
  VERIFICATION_CODE_EXPIRED: 'VERIFICATION_CODE_EXPIRED',
  
  // Authorization errors
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_LIMIT_REACHED: 'SUBSCRIPTION_LIMIT_REACHED',
  PREMIUM_FEATURE_REQUIRED: 'PREMIUM_FEATURE_REQUIRED',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  INVALID_SUBSCRIPTION_TYPE: 'INVALID_SUBSCRIPTION_TYPE',
  
  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT_FORMAT: 'INVALID_INPUT_FORMAT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_EMAIL_FORMAT: 'INVALID_EMAIL_FORMAT',
  INVALID_PHONE_NUMBER: 'INVALID_PHONE_NUMBER',
  INVALID_PASSWORD_FORMAT: 'INVALID_PASSWORD_FORMAT',
  PASSWORDS_DO_NOT_MATCH: 'PASSWORDS_DO_NOT_MATCH',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_ACCESS_DENIED: 'RESOURCE_ACCESS_DENIED',
  RESOURCE_LIMIT_EXCEEDED: 'RESOURCE_LIMIT_EXCEEDED',
  PRODUCTION_CYCLE_NOT_FOUND: 'PRODUCTION_CYCLE_NOT_FOUND',
  ACTIVITY_NOT_FOUND: 'ACTIVITY_NOT_FOUND',
  CROP_VARIETY_NOT_FOUND: 'CROP_VARIETY_NOT_FOUND',
  PEST_ANALYSIS_NOT_FOUND: 'PEST_ANALYSIS_NOT_FOUND',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  
  // Farm collaboration errors
  FARM_NOT_FOUND: 'FARM_NOT_FOUND',
  NO_FARM_ACCESS: 'NO_FARM_ACCESS',
  NOT_FARM_OWNER: 'NOT_FARM_OWNER',
  INVALID_INVITE_DATA: 'INVALID_INVITE_DATA',
  INVALID_INVITE_TOKEN: 'INVALID_INVITE_TOKEN',
  COLLABORATOR_NOT_FOUND: 'COLLABORATOR_NOT_FOUND',
  COLLABORATOR_ALREADY_EXISTS: 'COLLABORATOR_ALREADY_EXISTS',
  INVALID_COLLABORATION_STATUS: 'INVALID_COLLABORATION_STATUS',
  
  // Business logic errors
  HARVEST_DATE_BEFORE_PLANTING: 'HARVEST_DATE_BEFORE_PLANTING',
  PRODUCTION_CYCLE_ALREADY_HARVESTED: 'PRODUCTION_CYCLE_ALREADY_HARVESTED',
  INVALID_CROP_STAGE: 'INVALID_CROP_STAGE',
  WEATHER_DATA_UNAVAILABLE: 'WEATHER_DATA_UNAVAILABLE',
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  
  // Rate limiting
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  DAILY_LIMIT_EXCEEDED: 'DAILY_LIMIT_EXCEEDED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  API_RATE_LIMIT_EXCEEDED: 'API_RATE_LIMIT_EXCEEDED',
  
  // General errors
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // External service errors
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  PAYMENT_PROCESSING_ERROR: 'PAYMENT_PROCESSING_ERROR',
  EMAIL_SENDING_FAILED: 'EMAIL_SENDING_FAILED',
  SMS_SENDING_FAILED: 'SMS_SENDING_FAILED',
  WHATSAPP_SERVICE_ERROR: 'WHATSAPP_SERVICE_ERROR',
  EMAIL_SERVICE_ERROR: 'EMAIL_SERVICE_ERROR',
  SMS_SERVICE_ERROR: 'SMS_SERVICE_ERROR',
  PUSH_NOTIFICATION_FAILED: 'PUSH_NOTIFICATION_FAILED',
  WEATHER_SERVICE_ERROR: 'WEATHER_SERVICE_ERROR',
  PEST_ANALYSIS_ERROR: 'PEST_ANALYSIS_ERROR',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Crop and Agricultural Constants
export const CROP_TYPES = {
  POTATO: 'potato',
  MAIZE: 'maize',
  BEANS: 'beans',
  TOMATO: 'tomato',
} as const;

export const PRODUCTION_CYCLE_STATUS = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  HARVESTED: 'harvested',
  ARCHIVED: 'archived',
} as const;

export const ACTIVITY_TYPES = {
  LAND_PREPARATION: 'Land Preparation',
  PLANTING: 'Planting',
  FERTILIZER_APPLICATION: 'Fertilizer Application',
  WEEDING: 'Weeding',
  PEST_CONTROL: 'Pest Control',
  DISEASE_CONTROL: 'Disease Control',
  IRRIGATION: 'Irrigation',
  HARVESTING: 'Harvesting',
  POST_HARVEST: 'Post Harvest',
  STORAGE: 'Storage',
  MARKETING: 'Marketing',
} as const;

export const LABOR_TYPES = {
  MANUAL: 'manual',
  MECHANIZED: 'mechanized',
} as const;

// Potato Varieties Data for Kenya
export const POTATO_VARIETIES = {
  MARKIES: {
    name: 'Markies',
    maturityDays: 120,
    yieldPerAcre: 10000, // kg
    seedSize1Bags: 16,
    seedSize2Bags: 20,
    seedCostPerBag: 4000, // KES
    characteristics: ['High yielding', 'Good storage', 'Processing variety'],
  },
  SHANGI: {
    name: 'Shangi',
    maturityDays: 90,
    yieldPerAcre: 8000,
    seedSize1Bags: 16,
    seedSize2Bags: 20,
    seedCostPerBag: 3500,
    characteristics: ['Early maturing', 'Good for home consumption', 'Red skin'],
  },
  TIGONI: {
    name: 'Tigoni',
    maturityDays: 105,
    yieldPerAcre: 9000,
    seedSize1Bags: 15,
    seedSize2Bags: 18,
    seedCostPerBag: 3800,
    characteristics: ['Medium maturing', 'White flesh', 'Good for chips'],
  },
  ROYAL: {
    name: 'Royal',
    maturityDays: 110,
    yieldPerAcre: 9500,
    seedSize1Bags: 16,
    seedSize2Bags: 20,
    seedCostPerBag: 4200,
    characteristics: ['High yielding', 'Purple skin', 'Good storage'],
  },
} as const;

// Cost Estimation Constants (in KES)
export const COST_ESTIMATES = {
  LABOR_COSTS: {
    LAND_PREPARATION: 3000, // per acre
    PLANTING: 2000,
    WEEDING: 2500,
    HARVESTING: 4000,
  },
  FERTILIZER_COSTS: {
    DAP: 6000, // per 50kg bag
    CAN: 4500,
    NPK: 5500,
  },
  PESTICIDE_COSTS: {
    FUNGICIDE: 1500, // per liter
    INSECTICIDE: 2000,
    HERBICIDE: 1200,
  },
  OTHER_COSTS: {
    TRANSPORT: 500, // per acre
    STORAGE: 300,
    IRRIGATION: 2000,
  },
} as const;

// Weather and Climate Constants
export const WEATHER_CONDITIONS = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
} as const;

export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

// AI Model Constants
export const AI_MODELS = {
  PEST_DETECTION: {
    CONFIDENCE_THRESHOLD: 0.7,
    MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
    SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
  },
  WEATHER_FORECAST: {
    CACHE_DURATION: 3600, // 1 hour in seconds
    MAX_FORECAST_DAYS: 14,
  },
} as const;

// Subscription Limits
export const SUBSCRIPTION_LIMITS = {
  FREE: {
    MAX_PRODUCTION_CYCLES: 3,
    MAX_PEST_ANALYSES_PER_MONTH: 5,
    MAX_WEATHER_REQUESTS_PER_DAY: 10,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  },
  PREMIUM: {
    MAX_PRODUCTION_CYCLES: -1, // unlimited
    MAX_PEST_ANALYSES_PER_MONTH: -1, // unlimited
    MAX_WEATHER_REQUESTS_PER_DAY: -1, // unlimited
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  },
} as const;

// Rate Limiting Constants
export const RATE_LIMITS = {
  GLOBAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5, // 5 login attempts per 15 minutes
  },
  AI_ANALYSIS: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS: 10, // 10 AI analyses per hour for free users
  },
  WEATHER: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS: 20, // 20 weather requests per hour for free users
  },
} as const;

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  UPLOAD_PATH: 'uploads/',
  IMAGE_SIZES: {
    THUMBNAIL: { width: 150, height: 150 },
    MEDIUM: { width: 500, height: 500 },
    LARGE: { width: 1200, height: 1200 },
  },
} as const;

// Cache Keys
export const CACHE_KEYS = {
  USER_SESSION: 'session:user:',
  WEATHER_DATA: 'weather:',
  CROP_VARIETIES: 'crop_varieties',
  USER_SUBSCRIPTION: 'subscription:user:',
  RATE_LIMIT: 'rate_limit:',
  TOKEN_BLACKLIST: 'blacklist:token:',
} as const;

// Time Constants
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
} as const;

// Email Templates
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  SUBSCRIPTION_EXPIRED: 'subscription_expired',
  HARVEST_REMINDER: 'harvest_reminder',
  PEST_ALERT: 'pest_alert',
} as const;

// Default Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// API Versioning
export const API_VERSION = {
  V1: 'v1',
  CURRENT: 'v1',
} as const;

// Kenya Counties and Sub-counties
export const KENYA_LOCATIONS = {
  COUNTIES: [
    'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
    'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
    'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu',
    'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa',
    'Murang\'a', 'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
    'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi',
    'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
  ],
  POTATO_GROWING_REGIONS: [
    'Nakuru', 'Nyandarua', 'Nyeri', 'Kiambu', 'Meru', 'Laikipia',
    'Elgeyo-Marakwet', 'Trans Nzoia', 'Uasin Gishu', 'Bomet'
  ],
} as const;

export default {
  API_RESPONSES,
  ERROR_CODES,
  HTTP_STATUS,
  CROP_TYPES,
  PRODUCTION_CYCLE_STATUS,
  ACTIVITY_TYPES,
  LABOR_TYPES,
  POTATO_VARIETIES,
  COST_ESTIMATES,
  WEATHER_CONDITIONS,
  RISK_LEVELS,
  AI_MODELS,
  SUBSCRIPTION_LIMITS,
  RATE_LIMITS,
  FILE_UPLOAD,
  CACHE_KEYS,
  TIME,
  EMAIL_TEMPLATES,
  PAGINATION,
  API_VERSION,
  KENYA_LOCATIONS,
}; 