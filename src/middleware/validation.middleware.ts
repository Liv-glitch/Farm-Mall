import { Request, Response, NextFunction } from 'express';
import { validationResult, body, param } from 'express-validator';
import { ERROR_CODES } from '../utils/constants';
import { logError } from '../utils/logger';
import { validateKenyaPhoneNumber } from '../utils/validators';

/**
 * Middleware to validate request data using express-validator
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logError('Validation failed', new Error('Invalid request data'), {
      errors: errors.array()
    });
    
    res.status(400).json({
      error: ERROR_CODES.VALIDATION_FAILED,
      details: errors.array()
    });
    return;
  }
  next();
};

/**
 * Validation rules for inviting a collaborator
 */
export const validateInviteCollaborator = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  body('phoneNumber')
    .optional()
    .custom((value) => {
      if (!value) return true;
      if (!validateKenyaPhoneNumber(value)) {
        throw new Error('Invalid Kenyan phone number format');
      }
      return true;
    }),
  body('role')
    .isIn(['viewer', 'manager', 'worker', 'family_member'])
    .withMessage('Invalid role type'),
  body()
    .custom((value) => {
      if (!value.email && !value.phoneNumber) {
        throw new Error('Either email or phone number must be provided');
      }
      return true;
    }),
  validateRequest
];

/**
 * Validation rules for accepting a collaboration invite
 */
export const validateAcceptInvite = [
  param('token')
    .isUUID()
    .withMessage('Invalid invite token format'),
  validateRequest
];

/**
 * Validation rules for registering as a new collaborator
 */
export const validateCollaboratorRegistration = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  body('phoneNumber')
    .optional()
    .custom((value) => {
      if (!value) return true;
      if (!validateKenyaPhoneNumber(value)) {
        throw new Error('Invalid Kenyan phone number format');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
  body('county')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('County name must be between 2 and 50 characters'),
  body('subCounty')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Sub-county name must be between 2 and 50 characters'),
  body()
    .custom((value) => {
      if (!value.email && !value.phoneNumber) {
        throw new Error('Either email or phone number must be provided');
      }
      return true;
    }),
  validateRequest
];

/**
 * Validation rules for updating collaborator permissions
 */
export const validateUpdatePermissions = [
  body('role')
    .optional()
    .isIn(['viewer', 'manager', 'worker', 'family_member'])
    .withMessage('Invalid role type'),
  body('permissions')
    .optional()
    .isObject()
    .withMessage('Permissions must be an object'),
  body('permissions.canCreateCycles')
    .optional()
    .isBoolean()
    .withMessage('canCreateCycles must be a boolean'),
  body('permissions.canEditCycles')
    .optional()
    .isBoolean()
    .withMessage('canEditCycles must be a boolean'),
  body('permissions.canDeleteCycles')
    .optional()
    .isBoolean()
    .withMessage('canDeleteCycles must be a boolean'),
  body('permissions.canAssignTasks')
    .optional()
    .isBoolean()
    .withMessage('canAssignTasks must be a boolean'),
  body('permissions.canViewFinancials')
    .optional()
    .isBoolean()
    .withMessage('canViewFinancials must be a boolean'),
  body()
    .custom((value) => {
      if (!value.role && !value.permissions) {
        throw new Error('Either role or permissions must be provided');
      }
      return true;
    }),
  validateRequest
];

/**
 * Validation rules for creating a pre-production plan
 */
export const validateCreatePreproductionPlan = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Plan name is required'),
  body('planting_date')
    .notEmpty()
    .withMessage('Planting date is required')
    .isISO8601()
    .withMessage('Planting date must be a valid date'),
  body('location')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Location is required'),
  body('potato_variety')
    .isIn(['Shangi', 'Sherekea', 'Unica', 'Markies'])
    .withMessage('Invalid potato variety'),
  validateRequest
];

/**
 * Validation rules for updating a pre-production task
 */
export const validateUpdatePreproductionTask = [
  param('id')
    .isUUID()
    .withMessage('Invalid task id'),
  body('completed')
    .optional()
    .isBoolean()
    .withMessage('completed must be a boolean'),
  body('date_completed')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('date_completed must be a valid date'),
  body('cost')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('cost must be a number'),
  body('supplier')
    .optional({ nullable: true })
    .isString()
    .withMessage('supplier must be a string'),
  body()
    .custom((value) => {
      if (value.completed === true && !value.date_completed) {
        throw new Error('date_completed is required when completing a task');
      }
      return true;
    }),
  validateRequest
]; 