export interface CropVariety {
  id: string;
  name: string;
  cropType: string;
  maturityPeriodDays: number;
  seedSize1BagsPerAcre: number;
  seedSize2BagsPerAcre: number;
  seedCostPerBag: number;
  createdAt: Date;
}

export interface ProductionCycle {
  id: string;
  userId: string;
  cropVarietyId: string;
  landSizeAcres: number;
  farmLocation?: string;
  farmLocationLat?: number;
  farmLocationLng?: number;
  plantingDate?: Date;
  estimatedHarvestDate?: Date;
  actualHarvestDate?: Date;
  status: 'planning' | 'active' | 'harvested' | 'archived';
  totalCost: number;
  totalYieldKg?: number;
  createdAt: Date;
  updatedAt: Date;
  cropVariety?: CropVariety;
  activities?: Activity[];
}

export interface Activity {
  id: string;
  userId?: string;
  productionCycleId: string;
  type: string;
  activityType?: string; // legacy field
  description?: string;
  scheduledDate: Date;
  activityDate?: Date; // legacy field
  completedDate?: Date;
  cost?: number;
  laborHours?: number;
  laborType?: 'hired' | 'family' | 'cooperative';
  laborCost?: number; // legacy field
  inputs?: Array<{
    name: string;
    quantity: number;
    unit: string;
    cost: number;
  }>;
  notes?: string;
  weather?: {
    temperature: number;
    humidity: number;
    conditions: string;
  };
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ActivityInput {
  id: string;
  activityId: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  brandSupplier?: string;
  receiptImageUrl?: string;
}

export interface CreateProductionCycleRequest {
  cropVarietyId: string;
  landSizeAcres: number;
  farmLocation?: string;
  farmLocationLat?: number;
  farmLocationLng?: number;
  plantingDate?: Date;
}

export interface UpdateProductionCycleRequest {
  cropVarietyId?: string;
  landSizeAcres?: number;
  farmLocation?: string;
  farmLocationLat?: number;
  farmLocationLng?: number;
  plantingDate?: Date;
  estimatedHarvestDate?: Date;
  actualHarvestDate?: Date;
  status?: 'planning' | 'active' | 'harvested' | 'archived';
  totalYieldKg?: number;
}

export interface CreateActivityRequest {
  type: string;
  activityType?: string; // legacy field
  description?: string;
  scheduledDate: Date;
  activityDate?: Date; // legacy field
  cost?: number;
  laborHours?: number;
  laborType?: 'hired' | 'family' | 'cooperative';
  laborCost?: number; // legacy field
  inputs?: Array<{
    name: string;
    quantity: number;
    unit: string;
    cost: number;
  }>;
  notes?: string;
}

export interface CreateActivityInputRequest {
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  brandSupplier?: string;
  receiptImageUrl?: string;
}

export interface UpdateActivityRequest {
  type?: string;
  activityType?: string; // legacy field
  description?: string;
  scheduledDate?: Date;
  activityDate?: Date; // legacy field
  cost?: number;
  laborHours?: number;
  laborType?: 'hired' | 'family' | 'cooperative';
  laborCost?: number; // legacy field
  notes?: string;
}

// Cost calculator types
export interface CostCalculationRequest {
  cropVariety: string;
  landSizeAcres: number;
  seedSize: 1 | 2;
  location?: {
    county: string;
    subCounty: string;
  };
}

export interface CostCalculationResponse {
  cropVariety: string;
  landSizeAcres: number;
  seedSize: 1 | 2;
  seedRequirement: {
    bags: number;
    totalCost: number;
  };
  estimatedTotalCost: number;
  costBreakdown: {
    seeds: number;
    labor: number;
    fertilizer: number;
    pesticides: number;
    other: number;
  };
  recommendations: string[];
}

// Harvest prediction types
export interface HarvestPredictionRequest {
  cropVariety: string;
  plantingDate: Date;
  landSizeAcres: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface HarvestPredictionResponse {
  cropVariety: string;
  plantingDate: Date;
  estimatedHarvestDate: Date;
  harvestWindow: {
    startDate: Date;
    endDate: Date;
  };
  estimatedYield: {
    totalKg: number;
    yieldPerAcre: number;
  };
  climateConditions: {
    averageTemperature: number;
    expectedRainfall: number;
    humidity: number;
  };
  recommendations: string[];
}

// Production analytics types
export interface ProductionAnalytics {
  totalCycles: number;
  activeCycles: number;
  completedCycles: number;
  totalInvestment: number;
  totalRevenue: number;
  profitMargin: number;
  averageYieldPerAcre: number;
  topPerformingVarieties: Array<{
    variety: string;
    averageYield: number;
    profitability: number;
  }>;
  monthlyExpenses: Array<{
    month: string;
    amount: number;
  }>;
  seasonalInsights: {
    bestPlantingMonths: string[];
    averageMaturityDays: number;
    successRate: number;
  };
} 