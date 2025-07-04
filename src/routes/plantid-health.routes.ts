import { Router } from 'express';
import { plantIdHealthController } from '../controllers/plantid-health.controller';

const router = Router();

// Proxy to Plant.id health_assessment
router.post('/health_assessment', plantIdHealthController.proxyHealthAssessment.bind(plantIdHealthController));

// Upload endpoint for health assessment
router.post('/health_assessment/upload',
  plantIdHealthController.uploadMiddleware,
  plantIdHealthController.healthAssessmentUpload.bind(plantIdHealthController)
);

export default router; 