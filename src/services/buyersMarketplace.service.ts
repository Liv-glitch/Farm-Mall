import axios, { AxiosError, AxiosInstance } from 'axios';
import Joi from 'joi';
import { Op } from 'sequelize';
import { env } from '../config/environment';
import { UserModel } from '../models/User.model';
import { FarmModel } from '../models/Farm.model';
import { ProductionCycleModel } from '../models/ProductionCycle.model';
import { CropVarietyModel } from '../models/CropVariety.model';
import { MarketplaceIntegrationModel } from '../models/MarketplaceIntegration.model';
import { MarketplaceCallbackEventModel } from '../models/MarketplaceCallbackEvent.model';
import { logError, logInfo } from '../utils/logger';
import {
  BuyersRegistrationDefaults,
  BuyersRegistrationRequest,
  MarketplaceBooking,
  MarketplaceDecision,
} from '../types/buyers.types';

const registrationSchema = Joi.object<BuyersRegistrationRequest>({
  production_cycle_id: Joi.string().trim().max(64).optional(),
  full_name: Joi.string().trim().min(2).max(255).required(),
  phone_number: Joi.string().trim().min(7).max(20).required(),
  email: Joi.string().trim().email().required(),
  county: Joi.string().trim().min(2).max(100).required(),
  ward: Joi.string().trim().min(2).max(100).required(),
  specific_location: Joi.string().trim().min(2).max(255).required(),
  potato_variety: Joi.string().trim().min(2).max(100).required(),
  acreage_planted: Joi.number().min(0.1).max(10000).required(),
  planting_date: Joi.date().iso().required(),
});

const statusRank: Record<string, number> = {
  pending_approval: 1,
  approved: 2,
  confirmed: 3,
  rejected: 4,
};

export class BuyersMarketplaceError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status = 500, code = 'marketplace_error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class BuyersMarketplaceService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: env.MARKETPLACE_MAIN_API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getDashboard(userId: string) {
    const [integrations, defaults] = await Promise.all([
      this.getIntegrations(userId),
      this.getRegistrationDefaults(userId),
    ]);
    const registeredIntegrations = integrations.filter((integration) => integration.marketplaceFarmerId);
    const primaryIntegration = integrations[0] || null;

    if (registeredIntegrations.length === 0) {
      return {
        registered: false,
        integration: primaryIntegration ? this.serializeIntegration(primaryIntegration) : null,
        integrations: integrations.map((integration) => this.serializeIntegration(integration)),
        defaults,
        bookings: [],
      };
    }

    const farmers = await Promise.all(
      registeredIntegrations.map(async (integration) => {
        const farmer = await this.fetchFarmer(integration.marketplaceFarmerId!);
        await this.updateIntegrationFromFarmer(integration, farmer);
        return farmer;
      })
    );
    const bookings = await this.getBookings(userId, 'all');

    return {
      registered: true,
      integration: this.serializeIntegration(registeredIntegrations[0]),
      integrations: integrations.map((integration) => this.serializeIntegration(integration)),
      farmer: farmers[0] || null,
      defaults,
      bookings,
    };
  }

  async register(userId: string, data: BuyersRegistrationRequest) {
    const validation = registrationSchema.validate(data, { abortEarly: false, stripUnknown: true });
    if (validation.error) {
      throw new BuyersMarketplaceError(
        validation.error.details.map((detail) => detail.message).join(', '),
        400,
        'invalid_request'
      );
    }

    const cycle = await this.resolveRegistrationCycle(userId, validation.value.production_cycle_id);
    const existing = cycle
      ? await MarketplaceIntegrationModel.findOne({ where: { productionCycleId: cycle.id } })
      : null;
    if (existing) {
      throw new BuyersMarketplaceError('This production cycle is already listed on the buyers marketplace', 409, 'cycle_already_listed');
    }

    const defaults = await this.getRegistrationDefaults(userId, cycle?.id);
    const payload = {
      external_platform_ref: defaults.external_platform_ref,
      callback_url: defaults.callback_url,
      full_name: validation.value.full_name,
      phone_number: validation.value.phone_number,
      email: validation.value.email,
      county: validation.value.county,
      ward: validation.value.ward,
      specific_location: validation.value.specific_location,
      potato_variety: validation.value.potato_variety,
      acreage_planted: validation.value.acreage_planted,
      planting_date: this.toDateOnly(validation.value.planting_date),
    };

    const response = await this.marketplaceRequest<any>({
      method: 'POST',
      url: '/main-platform-register-farmer',
      data: payload,
    });

    const responseData = response?.data || response;
    const integration = await this.upsertIntegration(userId, {
      farmId: cycle?.farmId || await this.resolveDefaultFarmId(userId),
      productionCycleId: cycle?.id || null,
      marketplaceFarmerId: responseData?.farmer_id || null,
      externalPlatformRef: payload.external_platform_ref,
      registrationStatus: responseData?.registration_status || 'pending',
      listingStatus: responseData?.listing_status || 'pending_approval',
      rawPayload: responseData || response,
    });

    logInfo('Buyer marketplace registration completed', {
      userId,
      marketplaceFarmerId: integration.marketplaceFarmerId,
    });

    return {
      integration: this.serializeIntegration(integration),
      marketplace: responseData,
    };
  }

  async getBookings(userId: string, status = 'all', farmerId?: string): Promise<MarketplaceBooking[]> {
    const integrations = await this.requireRegisteredIntegrations(userId, farmerId);
    const bookingGroups = await Promise.all(
      integrations.map(async (integration) => {
        const response = await this.marketplaceRequest<any>({
          method: 'GET',
          url: '/main-platform-farmer-bookings',
          params: {
            farmer_id: integration.marketplaceFarmerId,
            status,
          },
        });

        return this.extractArray(response).map((booking) => this.sanitizeBooking(booking, integration));
      })
    );
    const bookings = bookingGroups.flat();
    return bookings.sort(this.sortBookings);
  }

  async decideBooking(userId: string, bookingRef: string, decision: MarketplaceDecision, farmerId?: string) {
    if (!['approve', 'reject'].includes(decision)) {
      throw new BuyersMarketplaceError('Decision must be approve or reject', 400, 'invalid_decision');
    }

    const integration = await this.requireRegisteredIntegration(userId, farmerId);
    const response = await this.marketplaceRequest<any>({
      method: 'POST',
      url: '/main-platform-confirm-booking',
      data: {
        farmer_id: integration.marketplaceFarmerId,
        booking_ref: bookingRef,
        decision,
      },
    });

    const refreshedBookings = await this.getBookings(userId, 'all');

    return {
      marketplace: response?.data || response,
      bookings: refreshedBookings,
    };
  }

  async recordCallback(payload: any) {
    const event = typeof payload?.event === 'string' ? payload.event : 'unknown';
    const data = payload?.data && typeof payload.data === 'object' ? payload.data : {};
    const farmerId = typeof data.farmer_id === 'string' ? data.farmer_id : null;
    const bookingRef = typeof data.booking_ref === 'string' ? data.booking_ref : null;

    const integration = farmerId
      ? await MarketplaceIntegrationModel.findOne({ where: { marketplaceFarmerId: farmerId } })
      : null;

    await MarketplaceCallbackEventModel.create({
      marketplaceIntegrationId: integration?.id || null,
      marketplaceFarmerId: farmerId,
      bookingRef,
      event,
      payload,
    });

    if (integration) {
      await integration.update({
        registrationStatus: data.registration_status || integration.registrationStatus,
        listingStatus: data.listing_status || integration.listingStatus,
        rawPayload: data,
        lastCallbackEvent: event,
        lastCallbackPayload: payload,
        lastSyncedAt: new Date(),
      });
    }

    logInfo('Buyer marketplace callback recorded', {
      event,
      farmerId,
      bookingRef,
      matchedIntegration: Boolean(integration),
    });

    return { recorded: true };
  }

  validateCallbackToken(headerToken?: string | string[], queryToken?: unknown) {
    if (!env.MARKETPLACE_CALLBACK_TOKEN) return;

    const token = Array.isArray(headerToken)
      ? headerToken[0]
      : headerToken || (typeof queryToken === 'string' ? queryToken : undefined);

    if (token !== env.MARKETPLACE_CALLBACK_TOKEN) {
      throw new BuyersMarketplaceError('Invalid callback token', 401, 'unauthorized');
    }
  }

  private async getIntegration(userId: string) {
    return MarketplaceIntegrationModel.findOne({ where: { userId } });
  }

  private async getIntegrations(userId: string) {
    return MarketplaceIntegrationModel.findAll({
      where: { userId },
      include: [{
        model: ProductionCycleModel,
        as: 'productionCycle',
        include: [{ model: CropVarietyModel, as: 'cropVariety' }],
      }],
      order: [['createdAt', 'DESC']],
    });
  }

  private async requireRegisteredIntegration(userId: string, farmerId?: string) {
    if (farmerId) {
      const integration = await MarketplaceIntegrationModel.findOne({ where: { userId, marketplaceFarmerId: farmerId } });
      if (!integration?.marketplaceFarmerId) {
        throw new BuyersMarketplaceError('Marketplace listing is not registered for this farmer', 404, 'not_registered');
      }
      return integration;
    }

    const integrations = await this.requireRegisteredIntegrations(userId);
    if (integrations.length !== 1) {
      throw new BuyersMarketplaceError('Please specify which marketplace listing this booking belongs to', 400, 'listing_required');
    }
    return integrations[0];
  }

  private async requireRegisteredIntegrations(userId: string, farmerId?: string) {
    const integrations = farmerId
      ? await MarketplaceIntegrationModel.findAll({ where: { userId, marketplaceFarmerId: farmerId } })
      : await this.getIntegrations(userId);
    const registered = integrations.filter((integration) => integration.marketplaceFarmerId);
    if (registered.length === 0) {
      throw new BuyersMarketplaceError('Farmer is not registered on the buyers marketplace', 404, 'not_registered');
    }
    return registered;
  }

  private async resolveRegistrationCycle(userId: string, productionCycleId?: string) {
    if (productionCycleId) {
      const cycle = await ProductionCycleModel.findOne({
        where: { id: productionCycleId, userId },
        include: [{ model: CropVarietyModel, as: 'cropVariety' }],
      });
      if (!cycle) {
        throw new BuyersMarketplaceError('Production cycle not found', 404, 'cycle_not_found');
      }
      return cycle;
    }

    const cycle = await ProductionCycleModel.findOne({
      where: { userId, status: { [Op.in]: ['active', 'planning'] } },
      include: [{ model: CropVarietyModel, as: 'cropVariety' }],
      order: [
        ['status', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });

    return cycle;
  }

  private async upsertIntegration(userId: string, data: {
    farmId?: string | null;
    productionCycleId?: string | null;
    marketplaceFarmerId?: string | null;
    externalPlatformRef: string;
    registrationStatus: string;
    listingStatus: string;
    rawPayload: Record<string, unknown>;
  }) {
    const existing = data.productionCycleId
      ? await MarketplaceIntegrationModel.findOne({ where: { productionCycleId: data.productionCycleId } })
      : await this.getIntegration(userId);
    if (existing) {
      await existing.update({
        ...data,
        lastSyncedAt: new Date(),
      });
      return existing;
    }

    return MarketplaceIntegrationModel.create({
      userId,
      ...data,
      lastSyncedAt: new Date(),
    });
  }

  private async getRegistrationDefaults(userId: string, productionCycleId?: string): Promise<BuyersRegistrationDefaults> {
    const [user, farm, cycle] = await Promise.all([
      UserModel.findByPk(userId),
      FarmModel.findOne({ where: { ownerId: userId }, order: [['createdAt', 'ASC']] }),
      productionCycleId
        ? ProductionCycleModel.findOne({
          where: { id: productionCycleId, userId },
          include: [{ model: CropVarietyModel, as: 'cropVariety' }],
        })
        : ProductionCycleModel.findOne({
          where: { userId, status: { [Op.in]: ['active', 'planning'] } },
          include: [{ model: CropVarietyModel, as: 'cropVariety' }],
          order: [
            ['status', 'ASC'],
            ['createdAt', 'DESC'],
          ],
        }),
    ]);

    if (!user) {
      throw new BuyersMarketplaceError('User not found', 404, 'user_not_found');
    }

    const cycleData = cycle?.toJSON() as any;
    const farmData = farm?.toJSON() as any;
    const location = cycleData?.farmLocationName || cycleData?.farmLocation || farmData?.location || '';

    return {
      external_platform_ref: cycleData?.id ? `farmmall-cycle:${cycleData.id}` : `farmmall-user:${user.id}`,
      callback_url: `${env.API_PUBLIC_URL.replace(/\/+$/, '')}/api/${env.API_VERSION}/buyers/callback`,
      full_name: user.fullName || '',
      phone_number: user.phoneNumber || '',
      email: user.email || '',
      county: cycleData?.farmCounty || user.county || '',
      ward: cycleData?.farmSubcounty || user.subCounty || '',
      specific_location: location,
      potato_variety: cycleData?.cropVariety?.name || '',
      acreage_planted: Number(cycleData?.landSizeAcres || farmData?.sizeAcres || 0),
      planting_date: this.toDateOnly(cycleData?.plantingDate || ''),
    };
  }

  private async resolveDefaultFarmId(userId: string): Promise<string | null> {
    const farm = await FarmModel.findOne({ where: { ownerId: userId }, order: [['createdAt', 'ASC']] });
    return farm?.id || null;
  }

  private async fetchFarmer(farmerId: string) {
    const response = await this.marketplaceRequest<any>({
      method: 'GET',
      url: '/main-platform-get-farmer',
      params: { farmer_id: farmerId },
    });

    return response?.data || response;
  }

  private async updateIntegrationFromFarmer(integration: MarketplaceIntegrationModel, farmer: any) {
    await integration.update({
      registrationStatus: farmer?.registration_status || integration.registrationStatus,
      listingStatus: farmer?.listing_status || integration.listingStatus,
      rawPayload: farmer || integration.rawPayload,
      lastSyncedAt: new Date(),
    });
  }

  private async marketplaceRequest<T>(config: {
    method: 'GET' | 'POST';
    url: string;
    params?: Record<string, unknown>;
    data?: Record<string, unknown>;
  }): Promise<T> {
    if (!env.MARKETPLACE_MAIN_API_KEY) {
      throw new BuyersMarketplaceError('Marketplace API key is not configured', 500, 'missing_marketplace_api_key');
    }

    try {
      const response = await this.client.request<T>({
        ...config,
        headers: {
          'x-api-key': env.MARKETPLACE_MAIN_API_KEY,
        },
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      const status = axiosError.response?.status || 502;
      const body = axiosError.response?.data;
      const message = body?.message || axiosError.message || 'Marketplace request failed';
      const code = body?.code || 'marketplace_request_failed';

      logError('Buyer marketplace request failed', error as Error, {
        status,
        code,
        url: config.url,
      });

      throw new BuyersMarketplaceError(message, status, code);
    }
  }

  private extractArray(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.bookings)) return response.data.bookings;
    if (Array.isArray(response?.bookings)) return response.bookings;
    return [];
  }

  private sanitizeBooking(booking: any, integration?: MarketplaceIntegrationModel): MarketplaceBooking {
    const shouldRevealContact = booking?.booking_status === 'confirmed';
    const buyer = booking?.buyer || {};
    const cycleData = integration?.productionCycle?.toJSON
      ? integration.productionCycle.toJSON()
      : integration?.productionCycle;
    const listingLocation = [cycleData?.farmLocationName, cycleData?.farmSubcounty, cycleData?.farmCounty]
      .filter(Boolean)
      .join(', ') || cycleData?.farmLocation || null;

    return {
      ...booking,
      farmer_id: booking?.farmer_id || integration?.marketplaceFarmerId,
      buyer: {
        company_name: buyer.company_name,
        county: buyer.county,
        phone: shouldRevealContact ? buyer.phone : null,
        email: shouldRevealContact ? buyer.email : null,
      },
      buyer_contact_hidden: !shouldRevealContact,
      listing: integration ? {
        integration_id: integration.id,
        production_cycle_id: integration.productionCycleId || null,
        marketplace_farmer_id: integration.marketplaceFarmerId || null,
        crop_variety: cycleData?.cropVariety?.name || null,
        acreage_planted: cycleData?.landSizeAcres ? Number(cycleData.landSizeAcres) : null,
        location: listingLocation,
      } : undefined,
    };
  }

  private sortBookings(a: MarketplaceBooking, b: MarketplaceBooking) {
    const aTime = Date.parse(a.received_confirmed_at || a.farmer_confirmed_at || a.payment_requested_at || '') || 0;
    const bTime = Date.parse(b.received_confirmed_at || b.farmer_confirmed_at || b.payment_requested_at || '') || 0;
    if (aTime !== bTime) return bTime - aTime;
    return (statusRank[a.booking_status] || 99) - (statusRank[b.booking_status] || 99);
  }

  private serializeIntegration(integration: MarketplaceIntegrationModel) {
    return {
      id: integration.id,
      userId: integration.userId,
      farmId: integration.farmId,
      productionCycleId: integration.productionCycleId,
      marketplaceFarmerId: integration.marketplaceFarmerId,
      externalPlatformRef: integration.externalPlatformRef,
      registrationStatus: integration.registrationStatus,
      listingStatus: integration.listingStatus,
      lastSyncedAt: integration.lastSyncedAt,
      lastCallbackEvent: integration.lastCallbackEvent,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
      productionCycle: this.serializeProductionCycle(integration.productionCycle),
    };
  }

  private serializeProductionCycle(cycle?: any) {
    if (!cycle) return null;
    const data = typeof cycle.toJSON === 'function' ? cycle.toJSON() : cycle;
    return {
      id: data.id,
      farmId: data.farmId,
      cropVarietyName: data.cropVariety?.name || null,
      landSizeAcres: data.landSizeAcres != null ? Number(data.landSizeAcres) : null,
      farmLocation: data.farmLocation || null,
      farmCounty: data.farmCounty || null,
      farmSubcounty: data.farmSubcounty || null,
      farmLocationName: data.farmLocationName || null,
      plantingDate: this.toDateOnly(data.plantingDate || ''),
      status: data.status,
    };
  }

  private toDateOnly(value: string | Date): string {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    return value.toISOString().slice(0, 10);
  }
}

export const buyersMarketplaceService = new BuyersMarketplaceService();
