import { Router } from 'express';
import authRoutes from './auth.routes';
import calculatorRoutes from './calculator.routes';
import productionRoutes from './production.routes';
import aiRoutes from './ai.routes';

const router = Router();

// API version prefix
const API_VERSION = '/v1';

// Health check route (without API version prefix)
router.get('/health', (_, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Mount API routes with version prefix
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/calculator`, calculatorRoutes);
router.use(`${API_VERSION}/production`, productionRoutes);
router.use(`${API_VERSION}/ai`, aiRoutes);

// API info route
router.get(`${API_VERSION}`, (_, res) => {
  res.json({
    name: 'Agriculture Management API',
    version: '1.0.0',
    description: 'Comprehensive agriculture management system for Kenya potato farming',
    features: [
      'Cost calculation and harvest prediction',
      'AI-powered pest and disease analysis',
      'Weather integration and forecasting',
      'Production cycle management',
      'WhatsApp integration',
      'Premium subscription features'
    ],
    documentation: '/api-docs',
    endpoints: {
      auth: `${API_VERSION}/auth`,
      calculator: `${API_VERSION}/calculator`,
      production: `${API_VERSION}/production`,
      ai: `${API_VERSION}/ai`,
    }
  });
});

export default router; 