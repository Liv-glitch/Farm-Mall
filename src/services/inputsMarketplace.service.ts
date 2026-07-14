import axios, { AxiosInstance } from 'axios';
import { env } from '../config/environment';
import { logError, logInfo } from '../utils/logger';

export type InputsMarketplaceCategory = 'seeds' | 'fertilizer' | 'pesticides';

export interface InputsMarketplaceListingCard {
  id: string;
  category: InputsMarketplaceCategory;
  name: string;
  description?: string | null;
  price: number;
  unit?: string | null;
  imageUrl?: string | null;
  quantity?: number | null;
  inStock: boolean;
  soldOut: boolean;
  sellerName?: string | null;
  sellerCounty?: string | null;
  sellerLocation?: string | null;
  marketplaceUrl: string;
}

export interface InputsMarketplaceFilters {
  cropVarietyName?: string;
  cropType?: string;
  county?: string;
  landSizeAcres?: number;
  seedSize?: 1 | 2;
}

export interface InputsMarketplaceListingsResponse {
  listings: Record<InputsMarketplaceCategory, InputsMarketplaceListingCard[]>;
  filters: InputsMarketplaceFilters;
  source: 'marketplace' | 'unavailable';
  message?: string;
}

interface ExternalListing {
  id: string;
  name: string;
  category?: string | null;
  type?: string | null;
  description?: string | null;
  price?: number | string | null;
  unit?: string | null;
  image_url?: string | null;
  quantity?: number | string | null;
  in_stock?: boolean | null;
  sold_out?: boolean | null;
  seller?: {
    business_name?: string | null;
    county?: string | null;
    location?: string | null;
  } | null;
}

export class InputsMarketplaceService {
  private client?: AxiosInstance;

  constructor() {
    if (env.INPUTS_MARKETPLACE_EXTERNAL_LISTINGS_URL && env.INPUTS_MARKETPLACE_EXTERNAL_LISTINGS_API_KEY) {
      this.client = axios.create({
        baseURL: env.INPUTS_MARKETPLACE_EXTERNAL_LISTINGS_URL,
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.INPUTS_MARKETPLACE_EXTERNAL_LISTINGS_API_KEY,
        },
      });
    }
  }

  async getCalculatorListings(filters: InputsMarketplaceFilters): Promise<InputsMarketplaceListingsResponse> {
    const emptyListings = this.emptyListings();

    if (!this.client) {
      return {
        listings: emptyListings,
        filters,
        source: 'unavailable',
        message: 'Inputs marketplace listings are not configured.',
      };
    }

    try {
      const [seeds, fertilizer, pesticides] = await Promise.all([
        this.fetchCategory('seeds', this.buildSeedQuery(filters), filters),
        this.fetchCategory('fertilizer', 'fertilizer', filters),
        this.fetchCategory('pesticides', ['pesticide', 'herbicide', 'fungicide', 'insecticide'], filters),
      ]);

      logInfo('Inputs marketplace listings retrieved', {
        filters,
        counts: {
          seeds: seeds.length,
          fertilizer: fertilizer.length,
          pesticides: pesticides.length,
        },
      });

      return {
        listings: { seeds, fertilizer, pesticides },
        filters,
        source: 'marketplace',
      };
    } catch (error) {
      logError('Failed to fetch inputs marketplace listings', error as Error, { filters });
      return {
        listings: emptyListings,
        filters,
        source: 'unavailable',
        message: 'Could not load live marketplace prices. Defaults are still available.',
      };
    }
  }

  private async fetchCategory(
    category: InputsMarketplaceCategory,
    q: string | string[],
    filters: InputsMarketplaceFilters
  ): Promise<InputsMarketplaceListingCard[]> {
    const queries = Array.isArray(q) ? q : [q];
    const responses = await Promise.all(
      queries.map((query) =>
        this.client!.get('', {
          params: {
            q: query,
            type: 'product',
            county: filters.county || undefined,
            in_stock: 'true',
            limit: 12,
            sort: 'price_asc',
          },
        })
      )
    );

    const listings = responses.flatMap((response) =>
      Array.isArray(response.data?.listings) ? response.data.listings : []
    );
    const seen = new Set<string>();

    return listings
      .map((listing: ExternalListing) => this.toCard(category, listing))
      .filter((listing: InputsMarketplaceListingCard | null): listing is InputsMarketplaceListingCard => {
        if (!listing || seen.has(listing.id)) return false;
        seen.add(listing.id);
        return true;
      })
      .slice(0, 12);
  }

  private toCard(category: InputsMarketplaceCategory, listing: ExternalListing): InputsMarketplaceListingCard | null {
    const price = Number(listing.price);
    if (!listing.id || !listing.name || Number.isNaN(price)) return null;

    const marketplaceUrl = new URL('/marketplace', env.INPUTS_MARKETPLACE_BASE_URL);
    marketplaceUrl.searchParams.set('listing', listing.id);

    return {
      id: listing.id,
      category,
      name: listing.name,
      description: listing.description || null,
      price,
      unit: listing.unit || null,
      imageUrl: listing.image_url || null,
      quantity: listing.quantity == null ? null : Number(listing.quantity),
      inStock: listing.in_stock !== false,
      soldOut: listing.sold_out === true,
      sellerName: listing.seller?.business_name || null,
      sellerCounty: listing.seller?.county || null,
      sellerLocation: listing.seller?.location || null,
      marketplaceUrl: marketplaceUrl.toString(),
    };
  }

  private buildSeedQuery(filters: InputsMarketplaceFilters): string {
    const crop = filters.cropType || 'potato';
    const variety = filters.cropVarietyName?.trim();
    return variety ? `${variety} ${crop} seed` : `${crop} seed`;
  }

  private emptyListings(): Record<InputsMarketplaceCategory, InputsMarketplaceListingCard[]> {
    return {
      seeds: [],
      fertilizer: [],
      pesticides: [],
    };
  }
}

export const inputsMarketplaceService = new InputsMarketplaceService();
export default inputsMarketplaceService;
