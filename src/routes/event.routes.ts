import { Router } from 'express';
import { eventController } from '../controllers/event.controller';

const router = Router();

router.get('/', eventController.getPublicEvents.bind(eventController));

export default router;
