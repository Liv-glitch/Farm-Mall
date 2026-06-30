import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  API_VERSION: string;
  // Public URL of this backend (used in Swagger + startup logs)
  API_PUBLIC_URL: string;
  API_BASE_PATH: string;

  // Database
  DATABASE_URL: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_SSL: boolean;

  // Redis (optional on shared hosting)
  ENABLE_REDIS: boolean;
  REDIS_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;

  // JWT
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRE: string;
  JWT_REFRESH_EXPIRE: string;

  // AI Services
  GOOGLE_CLOUD_VISION_API_KEY?: string;
  OPENWEATHER_API_KEY?: string;
  WEATHER_API_KEY?: string;
  PLANTID_API_KEY?: string;
  GEMINI_API_KEY?: string;
  USE_HUGGINGFACE: boolean;
  HF_API_TOKEN?: string;
  HF_INFERENCE_BASE_URL: string;
  HF_POTATO_ENDPOINT_URL?: string;
  HF_POTATO_MODEL_ID: string;
  HF_POTATO_MIN_CONFIDENCE: number;
  HF_POTATO_HIGH_CONFIDENCE: number;
  HF_POTATO_TIMEOUT_MS: number;

  // AWS S3
  AWS_S3_BUCKET?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION: string;

  // Supabase / uploads
  ENABLE_UPLOADS: boolean;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_STORAGE_BUCKET: string;

  // WhatsApp
  WHATSAPP_WEBHOOK_TOKEN?: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;

  // Bot Authentication
  BOT_API_KEY?: string;

  // Admin bootstrap
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_FULL_NAME?: string;
  ADMIN_COUNTY?: string;
  ADMIN_SUB_COUNTY?: string;

  // Email
  SMTP_HOST?: string;
  SMTP_PORT: number | undefined;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  RESEND_FROM_NAME: string;
  FRONTEND_URL: string;

  // Security & Performance
  BCRYPT_SALT_ROUNDS: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  CORS_ORIGIN: string;
  CORS_ORIGINS: string;

  // Logging
  LOG_LEVEL: string;
  LOG_FILE: string;
}

const parseBool = (value: string | undefined, defaultValue = false): boolean => {
  if (value === undefined) return defaultValue;
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const normalizeBasePath = (value: string | undefined): string => {
  if (!value) return '';

  const rawPath = value.trim();
  const path = rawPath.startsWith('http://') || rawPath.startsWith('https://')
    ? new URL(rawPath).pathname
    : rawPath;
  const normalized = `/${path.replace(/^\/+|\/+$/g, '')}`;

  return normalized === '/' ? '' : normalized;
};

const validateEnvironment = (): EnvironmentConfig => {
  const apiPublicUrl = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || '3000'}`;

  const config: EnvironmentConfig = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    API_VERSION: process.env.API_VERSION || 'v1',
    API_PUBLIC_URL: apiPublicUrl,
    API_BASE_PATH: normalizeBasePath(process.env.API_BASE_PATH || apiPublicUrl),

    // Database
    DATABASE_URL: process.env.DATABASE_URL || '',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
    DB_NAME: process.env.DB_NAME || 'agriculture_db',
    DB_USER: process.env.DB_USER || 'user',
    DB_PASSWORD: process.env.DB_PASSWORD || 'password',
    DB_SSL: parseBool(process.env.DB_SSL, false),

    // Redis (disabled by default on shared hosting)
    ENABLE_REDIS: parseBool(process.env.ENABLE_REDIS, false),
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,

    // JWT
    JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    JWT_EXPIRE: process.env.JWT_EXPIRE || '15m',
    JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',

    // AI Services
    GOOGLE_CLOUD_VISION_API_KEY: process.env.GOOGLE_CLOUD_VISION_API_KEY,
    OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY,
    WEATHER_API_KEY: process.env.WEATHER_API_KEY,
    PLANTID_API_KEY: process.env.PLANTID_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    USE_HUGGINGFACE: parseBool(process.env.USE_HUGGINGFACE, false),
    HF_API_TOKEN: process.env.HF_API_TOKEN,
    HF_INFERENCE_BASE_URL: process.env.HF_INFERENCE_BASE_URL || 'https://router.huggingface.co/hf-inference/models',
    HF_POTATO_ENDPOINT_URL: process.env.HF_POTATO_ENDPOINT_URL,
    HF_POTATO_MODEL_ID: process.env.HF_POTATO_MODEL_ID || 'linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification',
    HF_POTATO_MIN_CONFIDENCE: parseFloat(process.env.HF_POTATO_MIN_CONFIDENCE || '0.70'),
    HF_POTATO_HIGH_CONFIDENCE: parseFloat(process.env.HF_POTATO_HIGH_CONFIDENCE || '0.80'),
    HF_POTATO_TIMEOUT_MS: parseInt(process.env.HF_POTATO_TIMEOUT_MS || '10000', 10),

    // AWS S3
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',

    // Supabase / uploads
    ENABLE_UPLOADS: parseBool(process.env.ENABLE_UPLOADS, false),
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'farm-documents',

    // WhatsApp
    WHATSAPP_WEBHOOK_TOKEN: process.env.WHATSAPP_WEBHOOK_TOKEN,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,

    // Bot Authentication
    BOT_API_KEY: process.env.BOT_API_KEY,

    // Admin bootstrap
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_FULL_NAME: process.env.ADMIN_FULL_NAME,
    ADMIN_COUNTY: process.env.ADMIN_COUNTY,
    ADMIN_SUB_COUNTY: process.env.ADMIN_SUB_COUNTY,

    // Email
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    RESEND_FROM_NAME: process.env.RESEND_FROM_NAME || 'Farm Mall',
    FRONTEND_URL: (process.env.FRONTEND_URL || 'http://localhost:3001').replace(/\/+$/, ''),

    // Security & Performance
    BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    CORS_ORIGIN: process.env.CORS_ORIGIN || '',
    CORS_ORIGINS: process.env.CORS_ORIGINS || '',

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    LOG_FILE: process.env.LOG_FILE || 'logs/app.log',
  };

  // Validate required environment variables. Check the RAW process.env (not the
  // defaulted config) so fallback defaults don't mask a missing value in prod.
  const requiredVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

  if (config.NODE_ENV === 'production') {
    // Shared-hosting MySQL uses discrete DB credentials (no DATABASE_URL, no Redis).
    requiredVars.push('DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD');

    // Uploads (Supabase) only required when the feature is enabled.
    if (config.ENABLE_UPLOADS) {
      requiredVars.push('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY');
    }

    requiredVars.push('RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'FRONTEND_URL');
  }

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return config;
};

export const env = validateEnvironment();

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test'; 
