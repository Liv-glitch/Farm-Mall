import { Router } from 'express';
import { preproductionController } from '../controllers/preproduction.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  validateCreatePreproductionPlan,
  validateUpdatePreproductionTask,
} from '../middleware/validation.middleware';

const router = Router();

// All pre-production planning routes require authentication
router.use(authenticate);

// Plans
router.get('/plans', preproductionController.getPlans.bind(preproductionController));
router.post(
  '/plans',
  validateCreatePreproductionPlan,
  preproductionController.createPlan.bind(preproductionController)
);
router.get('/plans/:id', preproductionController.getPlan.bind(preproductionController));
router.delete('/plans/:id', preproductionController.deletePlan.bind(preproductionController));

// Tasks
router.patch(
  '/tasks/:id',
  validateUpdatePreproductionTask,
  preproductionController.updateTask.bind(preproductionController)
);

export default router;
