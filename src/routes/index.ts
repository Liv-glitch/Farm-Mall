import { Router } from 'express';
import authRoutes from './auth.routes';
import simplePlantIdRoutes from './simple-plantid.routes';
import plantIdHealthRoutes from './plantid-health.routes';
import calculatorRoutes from './calculator.routes';
import productionRoutes from './production.routes';
import aiRoutes from './ai.routes';
import adminRoutes from './admin.routes';
import collaborationRoutes from './collaboration.routes';
import soilAnalysisRoutes from './soilAnalysis.routes';
import enterpriseMediaRoutes from './enterprise-media.routes';
import enhancedPlantRoutes from './enhanced-plant.routes';
import preproductionRoutes from './preproduction.routes';
import eventRoutes from './event.routes';
import buyersRoutes from './buyers.routes';
import ssoRoutes from './sso.routes';
import decisionReportRoutes from './decision-report.routes';
import redisClient from '../config/redis';

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

// Quick Redis test
router.get('/redis-test', async (_, res) => {
  try {
    await redisClient.set('test', 'Redis is working!', 60);
    const value = await redisClient.get('test');
    console.log('Redis test result:', value);
    res.json({ value });
  } catch (err) {
    console.error('Redis test error:', err);
    res.status(500).json({ error: 'Redis test failed' });
  }
});

// Mount API routes (version prefix is already handled in app.ts)
router.use('/auth', authRoutes);
router.use('/calculator', calculatorRoutes);
router.use('/production', productionRoutes);
router.use('/ai', aiRoutes);
router.use('/simple-plantid', simplePlantIdRoutes);
router.use('/plantid-health', plantIdHealthRoutes);
router.use('/admin', adminRoutes);
router.use('/collaboration', collaborationRoutes);
router.use('/soil-analysis', soilAnalysisRoutes);
router.use('/media', enterpriseMediaRoutes);
router.use('/enhanced-plant', enhancedPlantRoutes);
router.use('/preproduction', preproductionRoutes);
router.use('/events', eventRoutes);
router.use('/buyers', buyersRoutes);
router.use('/sso', ssoRoutes);
router.use('/decision-reports', decisionReportRoutes);

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
      'Premium subscription features',
      'Farm collaboration and team management',
      'Soil test analysis and recommendations',
      'Enterprise media management with variants and AI analysis',
      'Farm decision reports (printable, on-demand season predictions)'
    ],
    documentation: '/api-docs',
    endpoints: {
      auth: '/auth',
      calculator: '/calculator',
      production: '/production',
      ai: '/ai',
      'simple-plantid': '/simple-plantid',
      'plantid-health': '/plantid-health',
      admin: '/admin',
      collaboration: '/collaboration',
      'soil-analysis': '/soil-analysis',
      media: '/media',
      'enhanced-plant': '/enhanced-plant',
      events: '/events',
      buyers: '/buyers',
      sso: '/sso',
      'decision-reports': '/decision-reports'
    }
  });
});

export default router; 
