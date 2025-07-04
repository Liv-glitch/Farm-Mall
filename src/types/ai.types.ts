// Pest & Disease Analysis Types
export interface PestAnalysisRequest {
  userId?: string;
  imageUrl: string;
  image?: Buffer | string; // base64 string or buffer
  cropType: string;
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
  farmingStage?: string;
  symptoms?: string[];
}

export interface DetectedIssue {
  type: 'pest' | 'disease' | 'nutrient_deficiency' | 'environmental_stress';
  name: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  commonCauses: string[];
  recommendations: {
    immediate: string[];
    preventive: string[];
    treatments: Array<{
      method: string;
      products: string[];
      timing: string;
      frequency: string;
      dosage?: string;
    }>;
  };
  expectedImpact: {
    yieldLoss: string;
    spreadRate: string;
    timeToAction: string;
  };
  affectedAreas?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export interface PestAnalysisResponse {
  analysisId?: string;
  confidence: number;
  detectedPests?: Array<{
    name: string;
    scientificName: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  detectedDiseases?: Array<{
    name: string;
    scientificName: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
    treatment?: string;
  }>;
  detectedIssues?: DetectedIssue[];
  overallHealth?: 'excellent' | 'good' | 'fair' | 'poor';
  riskFactors?: string[];
  recommendations?: string[];
  generalRecommendations?: string[];
  followUpActions?: string[];
  imageAnalysis?: {
    imageQuality: 'poor' | 'fair' | 'good' | 'excellent';
    visibleSymptoms: string[];
    plantPart: string;
    environmentalFactors: string[];
  };
  metadata?: {
    processingTime: number;
    imageSize: { width: number; height: number; size: number };
    modelVersion: string;
    rawPlantIdResponse?: any; // Include raw Plant.id response for debugging
  };
  aiModelVersion?: string;
  createdAt?: Date;
}

export interface PestAnalysisRecord {
  id: string;
  userId: string;
  productionCycleId?: string;
  imageUrl: string;
  cropType: string;
  locationLat?: number;
  locationLng?: number;
  analysisResult: PestAnalysisResponse;
  confidenceScore: number;
  status: 'processing' | 'completed' | 'failed';
  aiModelVersion: string;
  processingTimeMs: number;
  createdAt: Date;
}

// Weather Integration Types
export interface WeatherRequest {
  latitude: number;
  longitude: number;
  startDate?: Date;
  endDate?: Date;
  forecastType?: 'current' | 'daily' | 'extended' | 'seasonal';
}

export interface CurrentWeather {
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  pressure: number;
  uvIndex: number;
  conditions: string;
  visibility: number;
}

export interface DailyForecast {
  date: Date;
  temperature: {
    min: number;
    max: number;
    average: number;
  };
  humidity: {
    min: number;
    max: number;
    average: number;
  };
  rainfall: {
    probability: number;
    amount: number;
  };
  conditions: string;
  windSpeed: number;
  uvIndex: number;
  agriculturalIndex: {
    plantingConditions: 'poor' | 'fair' | 'good' | 'excellent';
    irrigationNeeded: boolean;
    diseaseRisk: 'low' | 'medium' | 'high';
    pestActivity: 'low' | 'medium' | 'high';
    fieldWorkSuitability: 'poor' | 'fair' | 'good' | 'excellent';
  };
}

export interface WeatherResponse {
  location: {
    latitude: number;
    longitude: number;
    name: string;
    region: string;
  };
  current: {
    temperature: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    condition: string;
    icon: string;
  };
  forecast: DailyForecast[];
  seasonalInsights: {
    rainySeasonStart: Date;
    rainySeasonEnd: Date;
    drySeasonConditions: string;
    optimalPlantingWindows: Array<{
      startDate: Date;
      endDate: Date;
      suitability: number;
      cropRecommendations: string[];
    }>;
  };
  alerts: Array<{
    type: 'weather' | 'agricultural';
    severity: 'low' | 'medium' | 'high' | 'extreme';
    title: string;
    description: string;
    startDate: Date;
    endDate?: Date;
    affectedAreas: string[];
  }>;
  updatedAt: Date;
}

export interface WeatherCacheEntry {
  id: string;
  locationHash: string;
  dateRangeStart: Date;
  dateRangeEnd: Date;
  weatherData: WeatherResponse;
  sourceProvider: string;
  cachedAt: Date;
  expiresAt: Date;
}

// AI Model Configuration
export interface AIModelConfig {
  pestDetection: {
    provider: 'google-vision' | 'custom' | 'huggingface';
    modelVersion: string;
    confidenceThreshold: number;
    maxImageSize: number;
    supportedFormats: string[];
  };
  weatherForecast: {
    primaryProvider: 'openweather' | 'weatherapi' | 'noaa';
    fallbackProviders: string[];
    cacheTimeout: number;
    forecastDays: number;
  };
}

// Image Processing Types
export interface ImageProcessingOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  removeMetadata: boolean;
}

export interface ProcessedImage {
  buffer: Buffer;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
  url?: string;
}

// Notification Types for AI Results
export interface AINotification {
  id: string;
  userId: string;
  type: 'pest_detected' | 'weather_alert' | 'harvest_reminder' | 'analysis_complete';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  data?: {
    analysisId?: string;
    productionCycleId?: string;
    weatherAlert?: object;
  };
  read: boolean;
  createdAt: Date;
} 