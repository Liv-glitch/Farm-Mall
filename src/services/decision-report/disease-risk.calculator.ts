import { BreakdownRow, ConfidenceLevel, DiseaseRiskResult, DiseaseRiskRow, NearTermClimateSignal, RiskLevel, SeedSource } from '../../types/decision-report.types';
import { ResistanceLevel, VarietyAgronomicProfile } from '../../data/decision-report/variety-agronomics';
import { clamp, row } from './helpers';

export interface DiseaseRiskInput {
  climate: NearTermClimateSignal;
  varietyName: string;
  varietyProfile: VarietyAgronomicProfile;
  previousCrop?: string;
  seedSource: SeedSource;
}

const BLIGHT_HOST_CROPS = ['potato', 'potatoes', 'tomato', 'tomatoes', 'eggplant', 'brinjal'];

function isBlightHost(previousCrop?: string): boolean {
  if (!previousCrop) return false;
  return BLIGHT_HOST_CROPS.some((host) => previousCrop.trim().toLowerCase().includes(host));
}

function resistanceToPoints(level: ResistanceLevel, invert = false): number {
  const map: Record<ResistanceLevel, number> = { low: 12, moderate: 5, high: -8 };
  const points = map[level];
  return invert ? -points : points;
}

function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 50) return 'high';
  if (score >= 25) return 'moderate';
  return 'low';
}

export function calculateDiseaseRisk(input: DiseaseRiskInput): DiseaseRiskResult {
  const { climate, varietyProfile } = input;

  const humidityPoints = climate.avgHumidityPercent >= 85 ? 30 : climate.avgHumidityPercent >= 70 ? 15 : 5;
  const wetnessPoints = climate.avgChanceOfRainPercent >= 60 ? 18 : climate.avgChanceOfRainPercent >= 30 ? 8 : 2;
  const resistancePoints = resistanceToPoints(varietyProfile.blightResistance);
  const previousCropIsHost = isBlightHost(input.previousCrop);
  const rotationPoints = previousCropIsHost ? 10 : -5;

  const riskScore = clamp(humidityPoints + wetnessPoints + resistancePoints + rotationPoints, 0, 100);
  const riskLevel = scoreToRiskLevel(riskScore);

  const breakdown: BreakdownRow[] = [
    row(
      'Relative humidity',
      `~${climate.avgHumidityPercent}%${climate.source === 'forecast' ? ', next few days' : ', seasonal average'}`,
      `+${humidityPoints}`,
      'neg',
      humidityPoints >= 30
        ? 'Sustained humidity above 85% is the principal condition favoring late blight development.'
        : humidityPoints >= 15
          ? 'Elevated humidity meaningfully raises blight pressure.'
          : 'Humidity is currently on the lower side, which slows fungal spore germination.'
    ),
    row(
      'Leaf wetness / rain chance',
      `~${climate.avgChanceOfRainPercent}% chance of rain`,
      `+${wetnessPoints}`,
      'neg',
      wetnessPoints >= 18
        ? 'Frequent rain supports extended overnight leaf wetness, ideal for fungal spore germination.'
        : 'Moderate rain chance keeps some blight pressure, but conditions are not highly favorable for it.'
    ),
    row(
      'Variety resistance',
      `${input.varietyName}: ${varietyProfile.blightResistance}`,
      resistancePoints > 0 ? `+${resistancePoints}` : `${resistancePoints}`,
      resistancePoints > 0 ? 'neg' : 'pos',
      varietyProfile.blightResistance === 'low'
        ? 'This variety carries limited natural resistance to late blight.'
        : varietyProfile.blightResistance === 'high'
          ? 'This variety was bred with strong late blight resistance, reducing risk.'
          : 'This variety has average natural resistance to late blight.'
    ),
    row(
      'Rotation history',
      input.previousCrop || 'Not specified',
      rotationPoints > 0 ? `+${rotationPoints}` : `${rotationPoints}`,
      rotationPoints > 0 ? 'neg' : 'pos',
      previousCropIsHost
        ? 'Previous crop is a known blight host, increasing residual soil inoculum.'
        : 'Previous crop does not host blight, reducing residual soil inoculum.'
    ),
  ];

  const confidence: ConfidenceLevel = climate.source === 'forecast' ? 'high' : 'medium';

  const assessment = riskLevel === 'high'
    ? 'Late blight is the primary disease concern this season, driven by sustained humidity and leaf wetness. Regular scouting is recommended over the coming weeks.'
    : riskLevel === 'moderate'
      ? 'Late blight risk is moderate this season. Routine scouting and preventive fungicide timing are advisable.'
      : 'Late blight risk is currently low for this location and variety combination, though conditions can change quickly.';

  const otherRisks: DiseaseRiskRow[] = [
    {
      name: 'Bacterial wilt',
      risk: input.seedSource === 'certified' ? 'moderate' : 'high',
      why: input.seedSource === 'certified'
        ? "Persists in soil for years — certified seed lowers but doesn't remove this risk"
        : 'Uncertified/farm-saved seed carries a meaningfully higher bacterial wilt risk',
    },
    {
      name: 'Aphids / PVY',
      risk: 'moderate',
      why: 'Aphid pressure builds through vegetative growth independent of seed source',
    },
    {
      name: 'Common scab',
      risk: climate.avgChanceOfRainPercent >= 50 ? 'low' : varietyProfile.scabSusceptibility,
      why: climate.avgChanceOfRainPercent >= 50
        ? 'Consistent soil moisture expected during tuber formation makes this unlikely'
        : `${input.varietyName} has ${varietyProfile.scabSusceptibility} susceptibility to scab, and drier soil conditions favor it`,
    },
  ];

  return {
    primaryDisease: 'Late blight',
    riskLevel,
    riskScore,
    confidence,
    assessment,
    breakdown,
    otherRisks,
  };
}
