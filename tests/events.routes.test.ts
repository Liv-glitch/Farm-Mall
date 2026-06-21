import request from 'supertest';
import express, { NextFunction, Request, Response } from 'express';
import eventRoutes from '../src/routes/event.routes';
import adminRoutes from '../src/routes/admin.routes';
import { EventModel } from '../src/models/Event.model';

jest.mock('../src/models/Event.model', () => ({
  EventModel: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('../src/middleware/auth.middleware', () => ({
  authenticate: (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    req.user = {
      id: 'user-1',
      role: authHeader === 'Bearer admin-token' ? 'admin' : 'user',
      email: 'user@example.com',
      emailVerified: true,
      phoneVerified: false,
      subscriptionType: 'free',
    };
    next();
  },
  requireAdmin: (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }
    next();
  },
}));

const mockedEventModel = EventModel as jest.Mocked<typeof EventModel>;

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/events', eventRoutes);
  app.use('/api/v1/admin', adminRoutes);
  return app;
};

const upcomingEvent = {
  id: 'event-1',
  name: 'Potato Field Day',
  date: new Date(Date.now() + 86400000).toISOString(),
  mode: 'physical',
  location: 'Nakuru',
  registrationLink: 'https://example.com/register',
  description: 'Learn practical potato farming skills.',
};

describe('Events routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  it('lists only upcoming events on the public route', async () => {
    mockedEventModel.findAll.mockResolvedValue([upcomingEvent] as any);

    const response = await request(app).get('/api/v1/events');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(mockedEventModel.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: expect.any(Object),
        }),
        order: [['date', 'ASC']],
      })
    );
  });

  it('rejects unauthenticated admin event requests with 401', async () => {
    const response = await request(app).get('/api/v1/admin/events');

    expect(response.status).toBe(401);
  });

  it('rejects non-admin event requests with 403', async () => {
    const response = await request(app)
      .get('/api/v1/admin/events')
      .set('Authorization', 'Bearer user-token');

    expect(response.status).toBe(403);
  });

  it('validates event creation with field-level messages', async () => {
    const response = await request(app)
      .post('/api/v1/admin/events')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Invalid Event',
        date: new Date().toISOString(),
        mode: 'physical',
        registration_link: 'not-a-url',
        description: 'Missing location and bad URL.',
      });

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('location:'),
        expect.stringContaining('registration_link:'),
      ])
    );
  });

  it('creates, updates, fetches, and deletes admin events', async () => {
    mockedEventModel.create.mockResolvedValue(upcomingEvent as any);
    mockedEventModel.findByPk.mockResolvedValue({
      ...upcomingEvent,
      update: jest.fn().mockResolvedValue(undefined),
    } as any);
    mockedEventModel.destroy.mockResolvedValue(1 as any);

    const payload = {
      name: 'Potato Field Day',
      date: new Date(Date.now() + 86400000).toISOString(),
      mode: 'physical',
      location: 'Nakuru',
      registration_link: 'https://example.com/register',
      description: 'Learn practical potato farming skills.',
    };

    const createResponse = await request(app)
      .post('/api/v1/admin/events')
      .set('Authorization', 'Bearer admin-token')
      .send(payload);
    expect(createResponse.status).toBe(201);

    const getResponse = await request(app)
      .get('/api/v1/admin/events/event-1')
      .set('Authorization', 'Bearer admin-token');
    expect(getResponse.status).toBe(200);

    const updateResponse = await request(app)
      .patch('/api/v1/admin/events/event-1')
      .set('Authorization', 'Bearer admin-token')
      .send({ ...payload, mode: 'online', location: '' });
    expect(updateResponse.status).toBe(200);

    const deleteResponse = await request(app)
      .delete('/api/v1/admin/events/event-1')
      .set('Authorization', 'Bearer admin-token');
    expect(deleteResponse.status).toBe(200);
  });
});
