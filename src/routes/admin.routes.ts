import { Router } from 'express';
import { requireAdmin, authenticate } from '../middleware/auth.middleware';
import { ProductionService } from '../services/production.service';
import { UserModel } from '../models/User.model';
import { eventController } from '../controllers/event.controller';

const router = Router();
const productionService = new ProductionService();

router.get('/events', authenticate, requireAdmin, eventController.getAdminEvents.bind(eventController));
router.get('/events/:id', authenticate, requireAdmin, eventController.getAdminEvent.bind(eventController));
router.post('/events', authenticate, requireAdmin, eventController.createEvent.bind(eventController));
router.patch('/events/:id', authenticate, requireAdmin, eventController.updateEvent.bind(eventController));
router.delete('/events/:id', authenticate, requireAdmin, eventController.deleteEvent.bind(eventController));

// Admin dashboard stats
router.get('/dashboard/stats', authenticate, requireAdmin, async (_req, res) => {
  try {
    const stats = await productionService.getDashboardStats(undefined, true);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get admin dashboard stats', error: (error as Error).message });
  }
});

// Recent users (paginated, sorted)
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const sort = (req.query.sort as string) || 'createdAt';
    const order = (req.query.order as string) === 'asc' ? 'ASC' : 'DESC';

    const { count, rows } = await UserModel.findAndCountAll({
      limit,
      offset,
      order: [[sort, order]],
      attributes: { exclude: ['passwordHash'] },
    });
    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        hasMore: offset + limit < count,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get users', error: (error as Error).message });
  }
});

// (Optional) System health endpoint
router.get('/system/health', authenticate, requireAdmin, async (_req, res) => {
  try {
    res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get system health', error: (error as Error).message });
  }
});

export default router; 
