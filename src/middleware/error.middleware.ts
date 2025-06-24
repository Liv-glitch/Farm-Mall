import { Request, Response, NextFunction } from 'express';
import { ValidationError as SequelizeValidationError } from 'sequelize';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants';
import { logError } from '../utils/logger';
import { isDevelopment } from '../config/environment';
import '../types/express'; // Import our Express type extensions

// Custom error class
export class APIError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR, code: string = ERROR_CODES.INTERNAL_SERVER_ERROR, details?: any) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
}

// Error handling middleware
const errorMiddleware = (
  error: Error | APIError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let errorCode: string = ERROR_CODES.INTERNAL_SERVER_ERROR;
  let message = 'Internal server error';
  let details: any = undefined;

  // Handle different types of errors
  if (error instanceof APIError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof SequelizeValidationError) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.VALIDATION_FAILED;
    message = 'Database validation failed';
    details = error.errors.map(err => ({
      field: err.path,
      message: err.message,
      value: err.value,
    }));
  } else if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = HTTP_STATUS.CONFLICT;
    errorCode = ERROR_CODES.EMAIL_ALREADY_EXISTS; // This would need to be more specific
    message = 'Resource already exists';
    details = { constraint: (error as any).parent?.constraint };
  } else if (error.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.INVALID_INPUT_FORMAT;
    message = 'Invalid reference to related resource';
  } else if (error.name === 'SequelizeConnectionError') {
    statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
    errorCode = ERROR_CODES.EXTERNAL_API_ERROR;
    message = 'Database connection error';
  } else if (error.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.VALIDATION_FAILED;
    message = error.message;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    errorCode = ERROR_CODES.TOKEN_INVALID;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    errorCode = ERROR_CODES.TOKEN_EXPIRED;
    message = 'Token expired';
  } else if (error.name === 'MulterError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.FILE_TOO_LARGE;
    message = 'File upload error';
    details = { type: (error as any).code };
  } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
    statusCode = HTTP_STATUS.BAD_GATEWAY;
    errorCode = ERROR_CODES.EXTERNAL_API_ERROR;
    message = 'External service unavailable';
  } else if (error.message.includes('timeout')) {
    statusCode = HTTP_STATUS.REQUEST_TIMEOUT;
    errorCode = ERROR_CODES.EXTERNAL_API_ERROR;
    message = 'Request timeout';
  }

  // Handle specific error codes from services
  if (Object.values(ERROR_CODES).includes(error.message as any)) {
    errorCode = error.message as string;
    
    switch (errorCode) {
      case ERROR_CODES.USER_NOT_FOUND:
      case ERROR_CODES.PRODUCTION_CYCLE_NOT_FOUND:
      case ERROR_CODES.ACTIVITY_NOT_FOUND:
      case ERROR_CODES.CROP_VARIETY_NOT_FOUND:
        statusCode = HTTP_STATUS.NOT_FOUND;
        message = 'Resource not found';
        break;
      case ERROR_CODES.EMAIL_ALREADY_EXISTS:
      case ERROR_CODES.PHONE_ALREADY_EXISTS:
        statusCode = HTTP_STATUS.CONFLICT;
        message = 'Resource already exists';
        break;
      case ERROR_CODES.INVALID_CREDENTIALS:
        statusCode = HTTP_STATUS.UNAUTHORIZED;
        message = 'Invalid credentials';
        break;
      case ERROR_CODES.TOKEN_EXPIRED:
      case ERROR_CODES.TOKEN_INVALID:
      case ERROR_CODES.REFRESH_TOKEN_INVALID:
        statusCode = HTTP_STATUS.UNAUTHORIZED;
        message = 'Authentication failed';
        break;
      case ERROR_CODES.PREMIUM_FEATURE_REQUIRED:
      case ERROR_CODES.SUBSCRIPTION_EXPIRED:
      case ERROR_CODES.INSUFFICIENT_PERMISSIONS:
        statusCode = HTTP_STATUS.FORBIDDEN;
        message = 'Access denied';
        break;
      case ERROR_CODES.SUBSCRIPTION_LIMIT_REACHED:
      case ERROR_CODES.DAILY_LIMIT_EXCEEDED:
        statusCode = HTTP_STATUS.FORBIDDEN;
        message = 'Limit exceeded';
        break;
      case ERROR_CODES.TOO_MANY_REQUESTS:
        statusCode = HTTP_STATUS.TOO_MANY_REQUESTS;
        message = 'Too many requests';
        break;
      case ERROR_CODES.WEATHER_DATA_UNAVAILABLE:
      case ERROR_CODES.AI_SERVICE_UNAVAILABLE:
        statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
        message = 'Service temporarily unavailable';
        break;
      default:
        message = errorCode.replace(/_/g, ' ').toLowerCase();
        message = message.charAt(0).toUpperCase() + message.slice(1);
    }
  }

  // Log error
  logError('API Error', error, {
    statusCode,
    errorCode,
    path: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
  });

  // Prepare error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details }),
      ...(isDevelopment && { stack: error.stack }),
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Not found middleware
export const notFoundMiddleware = (req: Request, res: Response): void => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: {
      code: ERROR_CODES.NOT_FOUND,
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  });
};

// Async error wrapper
export const asyncWrapper = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};

// Error factory functions
export const createError = {
  badRequest: (message: string, details?: any) => 
    new APIError(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED, details),
  
  unauthorized: (message: string = 'Unauthorized') => 
    new APIError(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID),
  
  forbidden: (message: string = 'Forbidden') => 
    new APIError(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.INSUFFICIENT_PERMISSIONS),
  
  notFound: (message: string = 'Resource not found') => 
    new APIError(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND),
  
  conflict: (message: string = 'Resource already exists') => 
    new APIError(message, HTTP_STATUS.CONFLICT, ERROR_CODES.EMAIL_ALREADY_EXISTS),
  
  tooManyRequests: (message: string = 'Too many requests') => 
    new APIError(message, HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_CODES.TOO_MANY_REQUESTS),
  
  serviceUnavailable: (message: string = 'Service unavailable') => 
    new APIError(message, HTTP_STATUS.SERVICE_UNAVAILABLE, ERROR_CODES.AI_SERVICE_UNAVAILABLE),
  
  internal: (message: string = 'Internal server error', details?: any) => 
    new APIError(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_SERVER_ERROR, details),
};

export default errorMiddleware; 