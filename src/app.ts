import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

// Import configurations
import { env, isDevelopment } from './config/environment';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';

// Import middleware
import errorMiddleware from './middleware/error.middleware';
import rateLimitMiddleware from './middleware/rateLimit.middleware';

// Import routes
import routes from './routes';

// Import logger
import logger, { loggerStream } from './utils/logger';

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Agriculture Management API',
      version: '1.0.0',
      description: 'Comprehensive API for potato farming management in Kenya',
      contact: {
        name: 'API Support',
        email: 'support@farmmall.onrender.com',
      },
    },
    servers: [
      {
        url: isDevelopment 
          ? `http://localhost:${env.PORT}` 
          : 'https://farmmall.onrender.com',
        description: isDevelopment ? 'Development server' : 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

class Application {
  public app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSwagger();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: isDevelopment ? false : undefined,
    }));

    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        // Allow configured origin and its subdomains
        if (origin === env.CORS_ORIGIN || origin.endsWith('.vercel.app')) return callback(null, true);
        
        // Allow ngrok URLs in development
        if (isDevelopment && origin.includes('ngrok')) return callback(null, true);
        
        // Allow localhost variants in development
        if (isDevelopment && origin.includes('localhost')) return callback(null, true);
        
        // In development, allow all origins for debugging
        if (isDevelopment) return callback(null, true);
        
        // In production, reject other origins (don't throw error, just return false)
        callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning'],
    }));

    // Compression middleware
    this.app.use(compression());

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Serve static files from uploads directory
    this.app.use('/uploads', express.static('uploads'));

    // Logging middleware
    if (isDevelopment) {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined', { stream: loggerStream }));
    }

    // Rate limiting
    this.app.use(rateLimitMiddleware);

    // Health check endpoint
    this.app.get('/health', (_, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        version: '1.0.0',
      });
    });

    // API info endpoint
    this.app.get('/info', (_, res) => {
      res.status(200).json({
        name: 'Agriculture Management API',
        version: '1.0.0',
        description: 'Comprehensive API for potato farming management in Kenya',
        documentation: '/api-docs',
        environment: env.NODE_ENV,
      });
    });
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use(`/api/${env.API_VERSION}`, routes);

    // Root endpoint
    this.app.get('/', (_, res) => {
      res.status(200).json({
        message: 'Welcome to the Agriculture Management API',
        version: '1.0.0',
        documentation: '/api-docs',
        health: '/health',
      });
    });
  }

  private initializeSwagger(): void {
    // Swagger documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Agriculture API Documentation',
    }));

    // Swagger JSON endpoint
    this.app.get('/api-docs.json', (_, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
  }

  private initializeErrorHandling(): void {
    // Handle 404 for undefined routes (before global error handler)
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: `Route ${req.method} ${req.originalUrl} not found`,
        },
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler (must be last)
    this.app.use(errorMiddleware);
  }

  public async start(): Promise<void> {
    try {
      // Try to connect to Redis (optional)
      logger.info('Connecting to Redis...');
      try {
        await connectRedis();
        logger.info('Redis connection successful');
      } catch (redisError) {
        logger.warn('Redis connection failed, continuing without Redis', redisError);
      }

      // Try to connect to database (required for full functionality)
      logger.info('Connecting to database...');
      try {
        await connectDatabase();
        logger.info('Database connection successful');
      } catch (dbError) {
        logger.warn('Database connection failed, some features will be limited', dbError);
        // Continue without database for basic API testing
      }

      const port = parseInt(process.env.PORT || '3000', 10);
      const isProduction = env.NODE_ENV === 'production';
      const host = isProduction ? 'farmmall.onrender.com' : 'localhost';
      const protocol = isProduction ? 'https' : 'http';

      this.server = this.app.listen(port, '0.0.0.0', () => {
        logger.info(`🚀 Agriculture API server started`, {
          port,
          environment: env.NODE_ENV,
          documentation: `${protocol}://${host}/api-docs`,
          host: '0.0.0.0',
          redis_url: env.REDIS_URL.replace(/\/\/.*@/, '//***:***@')  // Log Redis URL with credentials masked
        });
      });

      // Log that we're attempting to listen
      logger.info(`Attempting to listen on port ${port}`);

      // Graceful shutdown handling
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start server', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            logger.info('HTTP server closed');
            resolve();
          });
        });
      }

      // Disconnect from databases
      await disconnectDatabase();
      await disconnectRedis();

      logger.info('Application shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', error);
    }
  }

  private setupGracefulShutdown(): void {
    // Handle shutdown signals
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, starting graceful shutdown`);
        await this.stop();
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at Promise', { reason, promise });
      
      // Check if this is a Redis-related error that shouldn't crash the server
      const reasonStr = String(reason);
      const isRedisError = reasonStr.includes('Redis') || 
                          reasonStr.includes('ECONNREFUSED') || 
                          reasonStr.includes('ENOTFOUND') ||
                          reasonStr.includes('connection') ||
                          reasonStr.includes('timeout');
      
      if (isRedisError) {
        logger.warn('Redis-related unhandled rejection, continuing server operation', { reason });
      } else {
        logger.error('Critical unhandled rejection, shutting down server', { reason });
        process.exit(1);
      }
    });
  }
}

// Create and export application instance
const application = new Application();

// Start the application if this file is run directly
if (require.main === module) {
  application.start().catch((error) => {
    logger.error('Failed to start application', error);
    process.exit(1);
  });
}

export default application;
export { Application }; 