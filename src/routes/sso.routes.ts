import { Router } from 'express';
import { ssoController } from '../controllers/sso.controller';
import { authenticate } from '../middleware/auth.middleware';
import { createRateLimit } from '../middleware/rateLimit.middleware';

const router = Router();

const createCodeRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'Too many marketplace sign-in requests, please try again later',
  keyGenerator: (req) => `sso-code:${req.user?.id || req.ip}`,
});

const verifyCodeRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: 'Too many SSO verification requests, please try again later',
  keyGenerator: (req) => `sso-verify:${req.ip}`,
});

router.post('/codes', authenticate, createCodeRateLimit, ssoController.createCode.bind(ssoController));
router.post('/verify', verifyCodeRateLimit, ssoController.verifyCode.bind(ssoController));

export default router;
