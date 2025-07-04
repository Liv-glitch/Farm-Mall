import { Router } from 'express';
import authRoutes from './auth.routes';
import calculatorRoutes from './calculator.routes';
import productionRoutes from './production.routes';
import aiRoutes from './ai.routes';
import simplePlantIdRoutes from './simple-plantid.routes';
import plantIdHealthRoutes from './plantid-health.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Health check route
router.get('/health', (_, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Mount API routes (version prefix is already handled in app.ts)
router.use('/auth', authRoutes);
router.use('/calculator', calculatorRoutes);
router.use('/production', productionRoutes);
router.use('/ai', aiRoutes);
router.use('/simple-plantid', simplePlantIdRoutes);
router.use('/v3', plantIdHealthRoutes);
router.use('/admin', adminRoutes);

// API info route
router.get('/', (_, res) => {
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
      auth: '/auth',
      calculator: '/calculator',
      production: '/production',
      ai: '/ai',
      'simple-plantid': '/simple-plantid',
      'v3': '/v3',
    }
  });
});

export default router; 