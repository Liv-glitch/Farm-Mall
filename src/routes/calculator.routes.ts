import { Router } from 'express';

const router = Router();

// Cost calculation routes
router.post('/cost-estimate', (_, res) => {
  res.status(501).json({ message: 'Cost estimation endpoint - coming soon' });
});

router.post('/harvest-prediction', (_, res) => {
  res.status(501).json({ message: 'Harvest prediction endpoint - coming soon' });
});

router.get('/crop-varieties', (_, res) => {
  res.status(501).json({ message: 'Crop varieties endpoint - coming soon' });
});

router.get('/input-prices', (_, res) => {
  res.status(501).json({ message: 'Input prices endpoint - coming soon' });
});

export default router; 