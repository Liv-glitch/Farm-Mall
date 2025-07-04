import winston from 'winston';
import path from 'path';
import { env } from '../config/environment';

// Define custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
  },
};

// Add colors to winston
winston.addColors(customLevels.colors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Define console format
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;
    
    // Format the main log message
    let logMessage = `${timestamp} ${level}: ${message}`;
    
    // Add metadata if it exists
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0) {
      const formattedMeta = metaKeys
        .map(key => `${key}=${meta[key]}`)
        .join(', ');
      logMessage += ` (${formattedMeta})`;
    }
    
    // Add stack trace if it exists
    if (stack) {
      logMessage += '\n' + stack;
    }
    
    return logMessage;
  })
);

// Create transports array
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    level: env.LOG_LEVEL,
    format: consoleFormat,
  }),
];

// Add file transports only in production or when LOG_FILE is specified
if (env.NODE_ENV === 'production' || env.LOG_FILE) {
  // Ensure logs directory exists
  const logDir = path.dirname(env.LOG_FILE);
  
  transports.push(
    // Combined log file
    new winston.transports.File({
      filename: env.LOG_FILE,
      level: env.LOG_LEVEL,
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    
    // Error log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: env.LOG_LEVEL,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
export const loggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for structured logging
export const logError = (message: string, error?: Error, meta?: object) => {
  logger.error(message, {
    error: error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : undefined,
    ...meta,
  });
};

export const logInfo = (message: string, meta?: object) => {
  logger.info(message, meta);
};

export const logWarn = (message: string, meta?: object) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: object) => {
  logger.debug(message, meta);
};

export const logHttp = (message: string, meta?: object) => {
  logger.http(message, meta);
};

// Request logging helper
export const logRequest = (req: any, res: any, responseTime: number) => {
  logger.http('HTTP Request', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
  });
};

// Database query logging helper
export const logDatabaseQuery = (query: string, duration: number, meta?: object) => {
  logger.debug('Database Query', {
    query,
    duration: `${duration}ms`,
    ...meta,
  });
};

// API error logging helper
export const logApiError = (error: Error, request: any, meta?: object) => {
  logger.error('API Error', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    request: {
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
      params: request.params,
      query: request.query,
      user: request.user?.id,
      ip: request.ip,
    },
    ...meta,
  });
};

// Performance monitoring helper
export const logPerformance = (operation: string, duration: number, meta?: object) => {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger.log(level, `Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    ...meta,
  });
};

export default logger;