import Joi from 'joi';

// Common validation schemas
export const idSchema = Joi.string().uuid().required();
export const emailSchema = Joi.string().email().optional();
export const phoneSchema = Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional();
export const passwordSchema = Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required();
export const locationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
});

// Authentication validation schemas
export const registerSchema = Joi.object({
  fullName: Joi.string().min(2).max(255).required(),
  email: emailSchema,
  phoneNumber: phoneSchema,
  password: passwordSchema,
  county: Joi.string().min(2).max(100).required(),
  subCounty: Joi.string().min(2).max(100).required(),
  locationLat: Joi.number().min(-90).max(90).optional(),
  locationLng: Joi.number().min(-180).max(180).optional(),
}).or('email', 'phoneNumber');

export const loginSchema = Joi.object({
  identifier: Joi.string().required(),
  password: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordSchema,
});

export const resetPasswordSchema = Joi.object({
  identifier: Joi.string().required(),
});

export const confirmResetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: passwordSchema,
});

export const verifyEmailSchema = Joi.object({
  token: Joi.string().required(),
});

export const verifyPhoneSchema = Joi.object({
  phoneNumber: phoneSchema.required(),
  verificationCode: Joi.string().length(6).pattern(/^\d+$/).required(),
});

// User profile validation schemas
export const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(255).optional(),
  email: emailSchema,
  phoneNumber: phoneSchema,
  county: Joi.string().min(2).max(100).optional(),
  subCounty: Joi.string().min(2).max(100).optional(),
  locationLat: Joi.number().min(-90).max(90).optional(),
  locationLng: Joi.number().min(-180).max(180).optional(),
});

// Production cycle validation schemas
export const createProductionCycleSchema = Joi.object({
  cropVarietyId: idSchema,
  landSizeAcres: Joi.number().min(0.1).max(10000).precision(2).required(),
  farmLocation: Joi.string().max(255).optional(),
  farmLocationLat: Joi.number().min(-90).max(90).optional(),
  farmLocationLng: Joi.number().min(-180).max(180).optional(),
  plantingDate: Joi.date().optional(),
});

export const updateProductionCycleSchema = Joi.object({
  cropVarietyId: idSchema.optional(),
  landSizeAcres: Joi.number().min(0.1).max(10000).precision(2).optional(),
  farmLocation: Joi.string().max(255).optional(),
  farmLocationLat: Joi.number().min(-90).max(90).optional(),
  farmLocationLng: Joi.number().min(-180).max(180).optional(),
  plantingDate: Joi.date().optional(),
  estimatedHarvestDate: Joi.date().optional(),
  actualHarvestDate: Joi.date().max('now').optional(),
  status: Joi.string().valid('planning', 'active', 'harvested', 'archived').optional(),
  totalYieldKg: Joi.number().min(0).precision(2).optional(),
});

// Activity validation schemas
export const createActivitySchema = Joi.object({
  activityType: Joi.string().min(2).max(100).required(),
  activityDate: Joi.date().max('now').required(),
  cost: Joi.number().min(0).precision(2).optional(),
  laborType: Joi.string().valid('manual', 'mechanized').optional(),
  laborCost: Joi.number().min(0).precision(2).optional(),
  notes: Joi.string().max(1000).optional(),
  inputs: Joi.array().items(
    Joi.object({
      itemName: Joi.string().min(1).max(255).required(),
      quantity: Joi.number().min(0).precision(2).required(),
      unit: Joi.string().min(1).max(50).required(),
      unitCost: Joi.number().min(0).precision(2).required(),
      brandSupplier: Joi.string().max(255).optional(),
      receiptImageUrl: Joi.string().uri().optional(),
    })
  ).optional(),
});

export const updateActivitySchema = Joi.object({
  activityType: Joi.string().min(2).max(100).optional(),
  activityDate: Joi.date().max('now').optional(),
  cost: Joi.number().min(0).precision(2).optional(),
  laborType: Joi.string().valid('manual', 'mechanized').optional(),
  laborCost: Joi.number().min(0).precision(2).optional(),
  notes: Joi.string().max(1000).optional(),
});

// Calculator validation schemas
export const costCalculationSchema = Joi.object({
  cropVariety: Joi.string().min(2).max(100).required(),
  landSizeAcres: Joi.number().min(0.1).max(10000).precision(2).required(),
  seedSize: Joi.number().valid(1, 2).required(),
  location: Joi.object({
    county: Joi.string().min(2).max(100).required(),
    subCounty: Joi.string().min(2).max(100).required(),
  }).optional(),
});

export const harvestPredictionSchema = Joi.object({
  cropVariety: Joi.string().min(2).max(100).required(),
  plantingDate: Joi.date().required(),
  landSizeAcres: Joi.number().min(0.1).max(10000).precision(2).required(),
  location: locationSchema.optional(),
});

// AI & Weather validation schemas
export const pestAnalysisSchema = Joi.object({
  cropType: Joi.string().min(2).max(100).required(),
  location: locationSchema.required(),
  farmingStage: Joi.string().max(100).optional(),
  symptoms: Joi.array().items(Joi.string().max(255)).optional(),
});

export const weatherRequestSchema = Joi.object({
  location: locationSchema.required(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional(),
  forecastType: Joi.string().valid('current', 'daily', 'extended', 'seasonal').required(),
});

// Image upload validation
export const imageUploadSchema = Joi.object({
  file: Joi.object({
    mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/webp').required(),
    size: Joi.number().max(10 * 1024 * 1024).required(), // 10MB limit
  }).required(),
});

// Pagination validation
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

// Query parameter validation
export const queryParamsSchema = Joi.object({
  search: Joi.string().max(255).optional(),
  status: Joi.string().valid('planning', 'active', 'harvested', 'archived').optional(),
  cropType: Joi.string().max(100).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional(),
}).concat(paginationSchema);

// Kenya-specific validations
export const kenyaCounties = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
  'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
  'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu',
  'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa',
  'Murang\'a', 'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
  'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi',
  'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
];

export const kenyaCountySchema = Joi.string().valid(...kenyaCounties);

// Custom validation functions
export const validateKenyaPhoneNumber = (phoneNumber: string): boolean => {
  // Kenya phone number patterns: +254XXXXXXXXX or 07XXXXXXXX or 01XXXXXXXX
  const patterns = [
    /^\+254[71]\d{8}$/, // International format
    /^0[17]\d{8}$/, // Local format
  ];
  return patterns.some(pattern => pattern.test(phoneNumber));
};

export const validateCoordinatesInKenya = (lat: number, lng: number): boolean => {
  // Kenya is approximately between -4.7°N to 5.0°N and 33.9°E to 41.9°E
  return lat >= -4.7 && lat <= 5.0 && lng >= 33.9 && lng <= 41.9;
};

// Validation helper function
export const validateSchema = async (schema: Joi.ObjectSchema, data: any): Promise<any> => {
  try {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
    }

    return value;
  } catch (error) {
    throw error;
  }
};

// Middleware validation wrapper
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
        },
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }

    req.body = value;
    next();
  };
};

export default {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  createProductionCycleSchema,
  updateProductionCycleSchema,
  createActivitySchema,
  updateActivitySchema,
  costCalculationSchema,
  harvestPredictionSchema,
  pestAnalysisSchema,
  weatherRequestSchema,
  imageUploadSchema,
  paginationSchema,
  queryParamsSchema,
  validate,
  validateSchema,
}; 