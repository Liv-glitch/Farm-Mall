import { BreakdownRow, ConfidenceLevel, NearTermClimateSignal, PlantingWindowResult, WaterSource } from '../../types/decision-report.types';
import { clamp, formatDateShort, addDays, row } from './helpers';

export interface PlantingWindowInput {
  plantingDate: Date;
  climate: NearTermClimateSignal;
  maturityDays: number;
  varietyName: string;
  waterSource: WaterSource;
}

const SUITABILITY_POINTS: Record<NearTermClimateSignal['plantingSuitability'], number> = {
  optimal: 20,
  good: 12,
  fair: 5,
  poor: -10,
};

const ALIGNMENT_POINTS: Record<NearTermClimateSignal['rainySeasonAlignment'], number> = {
  long_rains: 15,
  short_rains: 15,
  transitional: 5,
  dry: -10,
};

export function calculatePlantingWindow(input: PlantingWindowInput): PlantingWindowResult {
  const { climate } = input;

  const seasonalPoints = SUITABILITY_POINTS[climate.plantingSuitability];
  const alignmentPoints = ALIGNMENT_POINTS[climate.rainySeasonAlignment];
  const moisturePoints = climate.avgChanceOfRainPercent >= 50 ? 12 : climate.avgChanceOfRainPercent >= 30 ? 5 : -8;

  const harvestDate = addDays(input.plantingDate, input.maturityDays);
  const harvestAheadOfNextRains = climate.rainySeasonAlignment !== 'dry';
  const maturityPoints = harvestAheadOfNextRains ? 8 : -3;

  const irrigationPoints = input.waterSource === 'irrigated' ? 5 : -5;

  const rawScore = seasonalPoints + alignmentPoints + moisturePoints + maturityPoints + irrigationPoints;
  const score = clamp(Math.round(rawScore + 40), 0, 100);

  const alignmentLabel = climate.rainySeasonAlignment === 'long_rains' ? 'Long rains'
    : climate.rainySeasonAlignment === 'short_rains' ? 'Short rains'
    : climate.rainySeasonAlignment === 'transitional' ? 'Transitional' : 'Dry season';

  const seasonalSourceLabel = climate.source === 'forecast'
    ? `Live forecast, ${climate.avgChanceOfRainPercent}% avg chance of rain`
    : `Seasonal average for this month`;

  const breakdown: BreakdownRow[] = [
    row(
      'Seasonal forecast',
      seasonalSourceLabel,
      seasonalPoints > 0 ? `+${seasonalPoints}` : `${seasonalPoints}`,
      seasonalPoints >= 0 ? 'pos' : 'neg',
      climate.source === 'forecast'
        ? 'Near-term weather forecast for this location was used to assess planting conditions.'
        : 'No live forecast available this far ahead — this uses the typical seasonal pattern for this month and region instead.'
    ),
    row(
      'Rainy season alignment',
      alignmentLabel,
      alignmentPoints > 0 ? `+${alignmentPoints}` : `${alignmentPoints}`,
      alignmentPoints >= 0 ? 'pos' : 'neg',
      alignmentPoints >= 15
        ? 'This period aligns with one of the region\u2019s two rainy seasons, historically the most reliable planting window.'
        : alignmentPoints >= 5
          ? 'A transitional period — rainfall is less predictable than during the core rains.'
          : 'Planting in the dry season relies heavily on irrigation or stored soil moisture.'
    ),
    row(
      'Soil moisture (from rainfall outlook)',
      climate.avgChanceOfRainPercent >= 50 ? 'Adequate' : climate.avgChanceOfRainPercent >= 30 ? 'Fair' : 'Low',
      moisturePoints > 0 ? `+${moisturePoints}` : `${moisturePoints}`,
      moisturePoints >= 0 ? 'pos' : 'neg',
      moisturePoints > 0
        ? 'Current moisture outlook supports germination without supplemental irrigation.'
        : 'Low expected soil moisture raises the importance of irrigation or delaying planting.'
    ),
    row(
      'Maturity period',
      `${input.varietyName}, ~${input.maturityDays} days`,
      maturityPoints > 0 ? `+${maturityPoints}` : `${maturityPoints}`,
      maturityPoints >= 0 ? 'pos' : 'neg',
      maturityPoints > 0
        ? `Positions harvest (around ${formatDateShort(harvestDate)}) ahead of the next season's heavier rainfall.`
        : `Harvest (around ${formatDateShort(harvestDate)}) may coincide with the next wet spell, raising post-harvest risk.`
    ),
    row(
      'Irrigation availability',
      input.waterSource === 'irrigated' ? 'Available' : 'None',
      irrigationPoints > 0 ? `+${irrigationPoints}` : `${irrigationPoints}`,
      irrigationPoints >= 0 ? 'pos' : 'neg',
      input.waterSource === 'irrigated'
        ? 'Irrigation is available as a buffer should rainfall underperform.'
        : 'No irrigation buffer should rainfall arrive later than expected.'
    ),
  ];

  const confidence: ConfidenceLevel = climate.source === 'forecast' ? 'high' : 'medium';

  const assessment = score >= 70
    ? `The selected planting date of ${formatDateShort(input.plantingDate)} falls within a good window identified for this location and season.`
    : score >= 45
      ? `The selected planting date of ${formatDateShort(input.plantingDate)} is workable, but conditions are only moderately favorable — monitor rainfall closely.`
      : `The selected planting date of ${formatDateShort(input.plantingDate)} falls outside the ideal window for this location; consider adjusting if possible or ensure irrigation is available.`;

  return {
    windowStartLabel: formatDateShort(input.plantingDate),
    windowEndLabel: formatDateShort(addDays(input.plantingDate, 14)),
    score,
    confidence,
    assessment,
    breakdown,
  };
}
