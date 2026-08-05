// Types for the Farm Decision Report service.
// The report is generated on-demand and never persisted — see
// src/services/decision-report/decision-report.service.ts for the orchestrator.

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type WaterSource = 'rainfed' | 'irrigated';
export type SeedSource = 'certified' | 'farm_saved' | 'unknown';
export type FarmingPriority = 'yield' | 'disease_resistance' | 'cost' | 'balanced';
export type RiskLevel = 'low' | 'moderate' | 'high';

export interface DecisionReportInput {
  county: string;
  subCounty: string;
  locationName?: string;
  gpsLat?: number;
  gpsLng?: number;
  fieldSizeAcres: number;
  waterSource: WaterSource;
  plantingDate: string;
  previousCrop?: string;
  seedSource: SeedSource;
  cropVarietyIds: string[];
  priority: FarmingPriority;
  soilTestId?: string;
}

export interface BreakdownRow {
  input: string;
  value: string;
  impactLabel: string;
  impactType: 'pos' | 'neg' | 'neutral';
  meaning: string;
}

export type PredictionType =
  | 'location_suitability'
  | 'planting_window'
  | 'disease_risk'
  | 'yield_estimate'
  | 'variety_ranking'
  | 'price_forecast';

export interface DiseaseRiskRow {
  name: string;
  risk: RiskLevel;
  why: string;
}

export interface VarietyRankCard {
  rank: number;
  name: string;
  score: number;
  points: string[];
}

export interface PredictionBlock {
  index: number;
  total: number;
  type: PredictionType;
  title: string;
  confidence: ConfidenceLevel;
  confidenceCaption: string;
  assessment: string;
  breakdown: BreakdownRow[];
  breakdownLabel: string;
  valueHeadline: string;
  valueUnit?: string;
  valueSubLabel?: string;
  valueVariant?: 'default' | 'small' | 'warn';
  rangeLabel?: string;
  otherRisks?: DiseaseRiskRow[];
  varietyCards?: VarietyRankCard[];
}

export interface DecisionReportSummary {
  reportId: string;
  generatedAtLabel: string;
  locationLabel: string;
  countyMetaLabel: string;
  fieldSizeLabel: string;
  waterSourceLabel: string;
  varietyCandidatesLabel: string;
  seedSourceLabel: string;
  plantingDateLabel: string;
  previousCropLabel: string;
  priorityLabel: string;
  predictionCount: number;
}

export interface DecisionReportData {
  summary: DecisionReportSummary;
  predictions: PredictionBlock[];
}

// --- Internal calculator contracts -----------------------------------------

export interface LocationContext {
  county: string;
  subCounty: string;
  locationName: string;
  elevationM: number;
  lat: number;
  lng: number;
  agroEcologicalZone: string;
  rainfallPattern: 'bimodal' | 'unimodal';
  avgAnnualRainfallMm: number;
  avgTempRangeC: [number, number];
  potatoSuitability: 'high' | 'medium' | 'low';
  isCuratedProfile: boolean;
}

export interface NearTermClimateSignal {
  source: 'forecast' | 'seasonal_default';
  avgHumidityPercent: number;
  avgChanceOfRainPercent: number;
  tempRangeC: [number, number];
  rainySeasonAlignment: 'long_rains' | 'short_rains' | 'dry' | 'transitional';
  plantingSuitability: 'optimal' | 'good' | 'fair' | 'poor';
}

export interface LocationSuitabilityResult {
  score: number;
  confidence: ConfidenceLevel;
  label: string;
  assessment: string;
  breakdown: BreakdownRow[];
  topPositiveFactor: string;
}

export interface PlantingWindowResult {
  windowStartLabel: string;
  windowEndLabel: string;
  score: number;
  confidence: ConfidenceLevel;
  assessment: string;
  breakdown: BreakdownRow[];
}

export interface DiseaseRiskResult {
  primaryDisease: string;
  riskLevel: RiskLevel;
  riskScore: number;
  confidence: ConfidenceLevel;
  assessment: string;
  breakdown: BreakdownRow[];
  otherRisks: DiseaseRiskRow[];
}

export interface YieldEstimateResult {
  yieldPerAcreTonnes: number;
  rangeMinTonnes: number;
  rangeMaxTonnes: number;
  confidence: ConfidenceLevel;
  assessment: string;
  breakdown: BreakdownRow[];
  baselineYieldPerAcreTonnes: number;
}

export interface VarietyRankingResult {
  confidence: ConfidenceLevel;
  assessment: string;
  cards: VarietyRankCard[];
}

export interface PriceForecastResult {
  minPricePerBag: number;
  maxPricePerBag: number;
  harvestMonthLabel: string;
  confidence: ConfidenceLevel;
  assessment: string;
  breakdown: BreakdownRow[];
}

export interface ProfitabilityResult {
  netProfitPerAcre: number;
  rangeMinPerAcre: number;
  rangeMaxPerAcre: number;
  confidence: ConfidenceLevel;
  assessment: string;
  breakdown: BreakdownRow[];
}
