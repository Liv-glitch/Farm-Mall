import { BreakdownRow, ConfidenceLevel, LocationSuitabilityResult, WaterSource } from '../../types/decision-report.types';
import { DrainageLevel } from '../../data/decision-report/soil-defaults';
import { clamp, row } from './helpers';

export interface LocationSuitabilityInput {
  elevationM: number;
  rainfallPattern: 'bimodal' | 'unimodal';
  avgAnnualRainfallMm: number;
  avgTempRangeC: [number, number];
  soilDrainage: DrainageLevel;
  soilDrainageLabel: string;
  waterSource: WaterSource;
  isCuratedLocationProfile: boolean;
}

function scoreElevation(elevationM: number): { points: number; meaning: string } {
  if (elevationM >= 1800 && elevationM <= 2700) {
    return { points: 18, meaning: "Within the optimal 1,800\u20132,700m elevation band for potato production in Kenya's highland zones." };
  }
  if (elevationM >= 1500 && elevationM < 1800) {
    return { points: 10, meaning: 'Slightly below the optimal highland band — still workable with careful variety choice.' };
  }
  if (elevationM > 2700 && elevationM <= 3000) {
    return { points: 10, meaning: 'Slightly above the optimal highland band — frost risk increases at this altitude.' };
  }
  return { points: 2, meaning: 'Outside the typical elevation range for reliable potato production in Kenya.' };
}

function scoreRainfall(pattern: 'bimodal' | 'unimodal', annualMm: number): { points: number; meaning: string } {
  if (pattern === 'bimodal' && annualMm >= 800 && annualMm <= 1300) {
    return { points: 10, meaning: "Aligns well with the crop's water requirements across both rain seasons." };
  }
  if (pattern === 'bimodal') {
    return { points: 6, meaning: 'Bimodal rainfall is favorable, though annual totals sit outside the typical sweet spot.' };
  }
  return { points: 4, meaning: 'A single rainy season narrows the planting window compared to bimodal areas.' };
}

function scoreTemperature(range: [number, number]): { points: number; meaning: string } {
  const [min, max] = range;
  if (min >= 10 && max <= 24 && max >= 15) {
    return { points: 6, meaning: 'Remains within the 15\u201320\u00b0C range favorable for tuber development for most of the season.' };
  }
  if (max > 28) {
    return { points: 1, meaning: 'Higher daytime temperatures can suppress tuber set and speed up pest cycles.' };
  }
  return { points: 3, meaning: 'Temperature range is broadly workable but not in the optimal band for tuber bulking.' };
}

function scoreDrainage(drainage: DrainageLevel, label: string): { points: number; meaning: string } {
  if (drainage === 'well_drained') {
    return { points: 0, meaning: `${label} — good drainage reduces waterlogging and tuber rot risk.` };
  }
  if (drainage === 'moderately_drained') {
    return { points: -4, meaning: `${label} — somewhat slower drainage after heavy rainfall, a minor consideration rather than a limiting factor.` };
  }
  return { points: -10, meaning: `${label} — poor drainage significantly raises waterlogging and tuber disease risk.` };
}

function scoreWater(waterSource: WaterSource, rainfallPattern: 'bimodal' | 'unimodal', annualMm: number): { points: number; impactType: 'pos' | 'neg' | 'neutral'; meaning: string } {
  if (waterSource === 'irrigated') {
    return { points: 5, impactType: 'pos', meaning: 'Irrigation buffers the crop against dry spells regardless of rainfall reliability.' };
  }
  if (rainfallPattern === 'bimodal' && annualMm >= 800) {
    return { points: 0, impactType: 'neutral', meaning: 'No irrigation infrastructure in place; rainfall reliability at this elevation offsets this.' };
  }
  return { points: -6, impactType: 'neg', meaning: 'No irrigation buffer and rainfall in this area is less reliable — dry-spell risk is elevated.' };
}

export function calculateLocationSuitability(input: LocationSuitabilityInput): LocationSuitabilityResult {
  const elevation = scoreElevation(input.elevationM);
  const rainfall = scoreRainfall(input.rainfallPattern, input.avgAnnualRainfallMm);
  const temperature = scoreTemperature(input.avgTempRangeC);
  const drainage = scoreDrainage(input.soilDrainage, input.soilDrainageLabel);
  const water = scoreWater(input.waterSource, input.rainfallPattern, input.avgAnnualRainfallMm);

  const rawScore = elevation.points + rainfall.points + temperature.points + drainage.points + water.points;
  const score = clamp(Math.round(rawScore + 55), 0, 100); // 55 = neutral baseline so a "typical" highland location lands ~mid-80s

  const breakdown: BreakdownRow[] = [
    row('Elevation', `${input.elevationM.toLocaleString()}m`, elevation.points > 0 ? `+${elevation.points}` : `${elevation.points}`, elevation.points > 0 ? 'pos' : 'neutral', elevation.meaning),
    row('Rainfall pattern', `${input.rainfallPattern === 'bimodal' ? 'Bimodal' : 'Unimodal'}, ~${input.avgAnnualRainfallMm}mm/yr`, `+${rainfall.points}`, 'pos', rainfall.meaning),
    row('Temperature', `${input.avgTempRangeC[0]}\u2013${input.avgTempRangeC[1]}\u00b0C avg`, `+${temperature.points}`, 'pos', temperature.meaning),
    row('Soil drainage', input.soilDrainageLabel, drainage.points === 0 ? 'No effect' : `${drainage.points}`, drainage.points === 0 ? 'neutral' : 'neg', drainage.meaning),
    row('Water availability', input.waterSource === 'irrigated' ? 'Irrigated' : 'Rainfed only', water.impactType === 'neutral' ? 'No effect' : (water.points > 0 ? `+${water.points}` : `${water.points}`), water.impactType, water.meaning),
  ];

  const label = score >= 75 ? 'Highly suitable' : score >= 55 ? 'Suitable' : score >= 35 ? 'Marginally suitable' : 'Not recommended';

  const factors = [
    { name: 'elevation and rainfall pattern', points: elevation.points + rainfall.points },
    { name: 'temperature range', points: temperature.points },
    { name: 'soil drainage', points: -drainage.points },
    { name: 'water availability', points: -water.points },
  ].sort((a, b) => b.points - a.points);
  const topPositiveFactor = factors[0].name;

  const confidence: ConfidenceLevel = input.isCuratedLocationProfile ? 'high' : 'medium';

  const assessment = score >= 55
    ? `This location shows ${label.toLowerCase()} for potato production, with ${topPositiveFactor} the primary favorable factor.`
    : `This location shows ${label.toLowerCase()} for potato production. ${drainage.points < -4 || water.points < 0 ? 'Drainage and water reliability are the main limiting factors.' : 'Elevation and rainfall are the main limiting factors.'}`;

  return { score, confidence, label, assessment, breakdown, topPositiveFactor };
}
