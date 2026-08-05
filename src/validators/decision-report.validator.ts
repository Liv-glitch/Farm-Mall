import Joi from 'joi';
import { kenyaCounties } from '../utils/validators';

export const decisionReportSchema = Joi.object({
  county: Joi.string().valid(...kenyaCounties).required(),
  subCounty: Joi.string().trim().min(2).max(100).required(),
  locationName: Joi.string().trim().max(150).optional(),
  gpsLat: Joi.number().min(-90).max(90).optional(),
  gpsLng: Joi.number().min(-180).max(180).optional(),
  fieldSizeAcres: Joi.number().min(0.1).max(10000).precision(2).required(),
  waterSource: Joi.string().valid('rainfed', 'irrigated').required(),
  plantingDate: Joi.date().iso().required(),
  previousCrop: Joi.string().trim().max(100).optional(),
  seedSource: Joi.string().valid('certified', 'farm_saved', 'unknown').required(),
  cropVarietyIds: Joi.array().items(Joi.string().uuid()).min(1).max(4).required(),
  priority: Joi.string().valid('yield', 'disease_resistance', 'cost', 'balanced').required(),
  soilTestId: Joi.string().uuid().optional(),
});
