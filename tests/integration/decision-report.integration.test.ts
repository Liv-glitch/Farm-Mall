import request from 'supertest';
import express from 'express';
import decisionReportRoutes from '../../src/routes/decision-report.routes';
import { CropVarietyModel } from '../../src/models/CropVariety.model';

jest.mock('../../src/middleware/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', role: 'farmer', emailVerified: true, phoneVerified: true, subscriptionType: 'free' };
    next();
  },
}));

jest.mock('../../src/models/CropVariety.model');
jest.mock('../../src/utils/logger');

const MockedCropVarietyModel = CropVarietyModel as jest.Mocked<typeof CropVarietyModel>;

const SHANGI_ID = '650e8400-e29b-41d4-a716-4466554a0001';
const MARKIES_ID = '650e8400-e29b-41d4-a716-4466554a0002';

const makeVariety = (overrides: {
  id: string;
  name: string;
  maturityPeriodDays: number;
  averageYieldPerAcre: number;
}) => ({
  ...overrides,
  getTotalProductionCost: jest.fn().mockReturnValue(70000),
});

describe('Decision Report Integration', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/decision-reports', decisionReportRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
    (MockedCropVarietyModel.findAll as jest.Mock).mockResolvedValue([
      makeVariety({ id: SHANGI_ID, name: 'Shangi', maturityPeriodDays: 90, averageYieldPerAcre: 8000 }),
      makeVariety({ id: MARKIES_ID, name: 'Markies', maturityPeriodDays: 120, averageYieldPerAcre: 10000 }),
    ]);
  });

  const validPayload = {
    county: 'Nakuru',
    subCounty: 'Elburgon',
    fieldSizeAcres: 1.2,
    waterSource: 'rainfed',
    plantingDate: '2026-07-20',
    previousCrop: 'Maize',
    seedSource: 'certified',
    cropVarietyIds: [SHANGI_ID, MARKIES_ID],
    priority: 'yield',
  };

  describe('POST /api/v1/decision-reports/generate', () => {
    it('generates a complete, print-ready HTML report end-to-end', async () => {
      const response = await request(app)
        .post('/api/v1/decision-reports/generate')
        .send(validPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reportId');
      expect(response.body.data).toHaveProperty('generatedAt');

      const { html } = response.body.data;
      expect(typeof html).toBe('string');

      // Structural markers: title, all 6 prediction cards, logo, print button.
      expect(html).toContain('Season predictions');
      expect(html).toContain('Location suitability');
      expect(html).toContain('Optimal planting window');
      expect(html).toContain('Disease risk');
      expect(html).toContain('Expected yield');
      expect(html).toContain('Variety recommendation');
      expect(html).toContain('Potato prices at harvest');
      expect(html).toContain('Prediction 1 of 6');
      expect(html).toContain('Prediction 6 of 6');
      expect(html).not.toContain('Profitability');
      expect(html).not.toContain('Prediction 7 of 7');
      expect(html).toContain('<img src=');
      expect(html).toContain('Print / Save as PDF');
      expect(html).toContain('Shangi');
      expect(html).toContain('Elburgon');

      expect(MockedCropVarietyModel.findAll).toHaveBeenCalledWith({ where: { id: validPayload.cropVarietyIds } });
    });

    it('rejects a request missing required fields with a 400 and validation details', async () => {
      const response = await request(app)
        .post('/api/v1/decision-reports/generate')
        .send({ county: 'Nakuru' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(Array.isArray(response.body.details)).toBe(true);
      expect(response.body.details.length).toBeGreaterThan(0);
    });

    it('rejects an unsupported county', async () => {
      const response = await request(app)
        .post('/api/v1/decision-reports/generate')
        .send({ ...validPayload, county: 'Atlantis' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('returns a 404 when none of the selected crop varieties exist', async () => {
      (MockedCropVarietyModel.findAll as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .post('/api/v1/decision-reports/generate')
        .send(validPayload)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/decision-reports/form-options', () => {
    it('returns Kenya counties and available potato varieties', async () => {
      (MockedCropVarietyModel.findAll as jest.Mock).mockResolvedValue([
        makeVariety({ id: SHANGI_ID, name: 'Shangi', maturityPeriodDays: 90, averageYieldPerAcre: 8000 }),
      ]);

      const response = await request(app)
        .get('/api/v1/decision-reports/form-options')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.counties)).toBe(true);
      expect(response.body.data.counties).toContain('Nakuru');
      expect(response.body.data.varieties[0]).toMatchObject({ name: 'Shangi' });
    });
  });
});
