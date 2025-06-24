import { Router } from 'express';
// Note: Controllers will be created later
// import { AuthController } from '../controllers/auth.controller';

const router = Router();

// Placeholder routes - will be implemented when controllers are created
router.post('/register', (_, res) => {
  res.status(501).json({ message: 'Registration endpoint - coming soon' });
});

router.post('/login', (_, res) => {
  res.status(501).json({ message: 'Login endpoint - coming soon' });
});

router.post('/logout', (_, res) => {
  res.status(501).json({ message: 'Logout endpoint - coming soon' });
});

router.post('/refresh', (_, res) => {
  res.status(501).json({ message: 'Token refresh endpoint - coming soon' });
});

router.post('/forgot-password', (_, res) => {
  res.status(501).json({ message: 'Forgot password endpoint - coming soon' });
});

router.post('/reset-password', (_, res) => {
  res.status(501).json({ message: 'Reset password endpoint - coming soon' });
});

router.post('/verify-email', (_, res) => {
  res.status(501).json({ message: 'Email verification endpoint - coming soon' });
});

router.post('/verify-phone', (_, res) => {
  res.status(501).json({ message: 'Phone verification endpoint - coming soon' });
});

export default router; 