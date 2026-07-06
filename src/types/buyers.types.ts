export type MarketplaceBookingStatus = 'pending_approval' | 'approved' | 'confirmed' | 'rejected';
export type MarketplaceDecision = 'approve' | 'reject';

export interface BuyersRegistrationRequest {
  production_cycle_id?: string;
  full_name: string;
  phone_number: string;
  email: string;
  county: string;
  ward: string;
  specific_location: string;
  potato_variety: string;
  acreage_planted: number;
  planting_date: string;
}

export interface BuyersRegistrationDefaults extends BuyersRegistrationRequest {
  external_platform_ref: string;
  callback_url: string;
}

export interface MarketplaceBookingBuyer {
  company_name?: string;
  phone?: string | null;
  email?: string | null;
  county?: string;
}

export interface MarketplaceBooking {
  booking_ref: string;
  farmer_id: string;
  acres_booked: number;
  price_per_acre: number;
  total_amount: number;
  payment_status: string;
  booking_status: MarketplaceBookingStatus | string;
  farmer_confirmed_at?: string | null;
  payment_requested_at?: string | null;
  received_confirmed_at?: string | null;
  buyer?: MarketplaceBookingBuyer;
  buyer_contact_hidden?: boolean;
  listing?: {
    integration_id: string;
    production_cycle_id?: string | null;
    marketplace_farmer_id?: string | null;
    crop_variety?: string | null;
    acreage_planted?: number | null;
    location?: string | null;
  };
}
