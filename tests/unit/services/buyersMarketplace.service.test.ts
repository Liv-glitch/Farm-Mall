const mockAxiosRequest = jest.fn();

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    request: mockAxiosRequest,
  })),
}));

jest.mock('../../../src/utils/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

jest.mock('../../../src/models/User.model', () => ({
  UserModel: {
    findByPk: jest.fn(),
  },
}));

jest.mock('../../../src/models/Farm.model', () => ({
  FarmModel: {
    findOne: jest.fn(),
  },
}));

jest.mock('../../../src/models/ProductionCycle.model', () => ({
  ProductionCycleModel: {
    findOne: jest.fn(),
  },
}));

jest.mock('../../../src/models/CropVariety.model', () => ({
  CropVarietyModel: {},
}));

jest.mock('../../../src/models/MarketplaceIntegration.model', () => ({
  MarketplaceIntegrationModel: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../../../src/models/MarketplaceCallbackEvent.model', () => ({
  MarketplaceCallbackEventModel: {
    create: jest.fn(),
  },
}));

process.env.MARKETPLACE_MAIN_API_KEY = 'test-marketplace-key';
process.env.API_PUBLIC_URL = 'https://api.example.com/api-root2';
process.env.API_VERSION = 'v1';

import { BuyersMarketplaceService } from '../../../src/services/buyersMarketplace.service';
import { UserModel } from '../../../src/models/User.model';
import { FarmModel } from '../../../src/models/Farm.model';
import { ProductionCycleModel } from '../../../src/models/ProductionCycle.model';

describe('BuyersMarketplaceService', () => {
  let service: BuyersMarketplaceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BuyersMarketplaceService();
  });

  it('builds registration defaults from user, farm, and active production cycle data', async () => {
    (UserModel.findByPk as jest.Mock).mockResolvedValue({
      id: 'user-123',
      fullName: 'Jane Farmer',
      phoneNumber: '0712345678',
      email: 'jane@example.com',
      county: 'Nakuru',
      subCounty: 'Njoro',
    });
    (FarmModel.findOne as jest.Mock).mockResolvedValue({
      id: 'farm-123',
      toJSON: () => ({ id: 'farm-123', location: 'Fallback Farm', sizeAcres: 2 }),
    });
    (ProductionCycleModel.findOne as jest.Mock).mockResolvedValue({
      toJSON: () => ({
        farmLocationName: 'Mauche',
        landSizeAcres: '3.5',
        plantingDate: '2026-05-01',
        cropVariety: { name: 'Shangi' },
      }),
    });

    const defaults = await (service as any).getRegistrationDefaults('user-123');

    expect(defaults).toMatchObject({
      external_platform_ref: 'farmmall-user:user-123',
      callback_url: 'https://api.example.com/api-root2/api/v1/buyers/callback',
      full_name: 'Jane Farmer',
      phone_number: '0712345678',
      email: 'jane@example.com',
      county: 'Nakuru',
      ward: 'Njoro',
      specific_location: 'Mauche',
      potato_variety: 'Shangi',
      acreage_planted: 3.5,
      planting_date: '2026-05-01',
    });
  });

  it('rejects incomplete registration payloads before calling the marketplace', async () => {
    await expect(service.register('user-123', {} as any)).rejects.toMatchObject({
      status: 400,
      code: 'invalid_request',
    });

    expect(mockAxiosRequest).not.toHaveBeenCalled();
  });

  it.each([400, 401, 404, 409])('maps marketplace HTTP %s errors', async (status) => {
    mockAxiosRequest.mockRejectedValueOnce({
      response: {
        status,
        data: {
          code: 'marketplace_code',
          message: `Marketplace ${status}`,
        },
      },
    });

    await expect((service as any).marketplaceRequest({
      method: 'GET',
      url: '/main-platform-get-farmer',
    })).rejects.toMatchObject({
      status,
      code: 'marketplace_code',
      message: `Marketplace ${status}`,
    });
  });

  it('maps network errors to a 502 marketplace error', async () => {
    mockAxiosRequest.mockRejectedValueOnce(new Error('Network down'));

    await expect((service as any).marketplaceRequest({
      method: 'GET',
      url: '/main-platform-get-farmer',
    })).rejects.toMatchObject({
      status: 502,
      code: 'marketplace_request_failed',
      message: 'Network down',
    });
  });

  it('validates approve or reject booking decisions', async () => {
    await expect(service.decideBooking('user-123', 'booking-123', 'maybe' as any)).rejects.toMatchObject({
      status: 400,
      code: 'invalid_decision',
    });

    expect(mockAxiosRequest).not.toHaveBeenCalled();
  });

  it('hides buyer contact details until the booking is confirmed', () => {
    const pending = (service as any).sanitizeBooking({
      booking_status: 'pending_approval',
      buyer: {
        company_name: 'Acme Procurement',
        county: 'Nairobi',
        phone: '0712345678',
        email: 'buyer@example.com',
      },
    });

    const confirmed = (service as any).sanitizeBooking({
      booking_status: 'confirmed',
      buyer: {
        company_name: 'Acme Procurement',
        county: 'Nairobi',
        phone: '0712345678',
        email: 'buyer@example.com',
      },
    });

    expect(pending.buyer).toMatchObject({
      company_name: 'Acme Procurement',
      county: 'Nairobi',
      phone: null,
      email: null,
    });
    expect(pending.buyer_contact_hidden).toBe(true);
    expect(confirmed.buyer).toMatchObject({
      phone: '0712345678',
      email: 'buyer@example.com',
    });
    expect(confirmed.buyer_contact_hidden).toBe(false);
  });
});
