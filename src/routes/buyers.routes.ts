import { Router } from 'express';
import { buyersController } from '../controllers/buyers.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/callback', buyersController.callback.bind(buyersController));

router.use(authenticate);

router.get('/dashboard', buyersController.getDashboard.bind(buyersController));
router.post('/register', buyersController.register.bind(buyersController));
router.get('/bookings', buyersController.getBookings.bind(buyersController));
router.post('/bookings/:bookingRef/decision', buyersController.decideBooking.bind(buyersController));

export default router;
