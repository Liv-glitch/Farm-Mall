// Curated per-variety agronomic reference data.
//
// DATA GAP: CropVariety (src/models/CropVariety.model.ts) only stores cost,
// yield and maturity columns — there is no disease-resistance or climate-fit
// rating anywhere in the schema. The ratings below are curated from general,
// widely published agronomic characteristics of these varieties in Kenya and
// are intended as reasonable defaults, not lab-verified figures. They cover
// the varieties actually seeded in migrations/seed.sql (Shangi, Markies,
// Sherekea, Unica) plus the extra names referenced in
// src/utils/constants.ts POTATO_VARIETIES (Tigoni, Royal) for forward
// compatibility.

export type ResistanceLevel = 'low' | 'moderate' | 'high';

export interface VarietyAgronomicProfile {
  name: string;
  blightResistance: ResistanceLevel;
  bacterialWiltSusceptibility: ResistanceLevel;
  scabSusceptibility: ResistanceLevel;
  idealElevationRangeM: [number, number];
  idealAnnualRainfallRangeMm: [number, number];
  droughtTolerance: ResistanceLevel;
  strengths: string[];
  weaknesses: string[];
}

export const VARIETY_AGRONOMICS: Record<string, VarietyAgronomicProfile> = {
  Shangi: {
    name: 'Shangi',
    blightResistance: 'low',
    bacterialWiltSusceptibility: 'moderate',
    scabSusceptibility: 'moderate',
    idealElevationRangeM: [1800, 2700],
    idealAnnualRainfallRangeMm: [800, 1300],
    droughtTolerance: 'moderate',
    strengths: ['Widely adapted across Kenya\u2019s highlands', 'Early maturing, allows a second season', 'Strong market familiarity and demand'],
    weaknesses: ['Below-average late blight resistance', 'Needs regular fungicide scouting in humid spells'],
  },
  Markies: {
    name: 'Markies',
    blightResistance: 'moderate',
    bacterialWiltSusceptibility: 'moderate',
    scabSusceptibility: 'low',
    idealElevationRangeM: [1900, 2800],
    idealAnnualRainfallRangeMm: [900, 1400],
    droughtTolerance: 'moderate',
    strengths: ['Better blight tolerance than Shangi', 'Good storage life and processing/chipping quality', 'High yielding under good management'],
    weaknesses: ['Longer maturity period (~120 days) needs a longer dry spell after planting', 'Higher seed and input cost per acre'],
  },
  Sherekea: {
    name: 'Sherekea',
    blightResistance: 'moderate',
    bacterialWiltSusceptibility: 'low',
    scabSusceptibility: 'moderate',
    idealElevationRangeM: [1800, 2700],
    idealAnnualRainfallRangeMm: [850, 1300],
    droughtTolerance: 'moderate',
    strengths: ['Good bacterial wilt tolerance for wetter/heavier soils', 'Medium maturity balances yield and turnaround'],
    weaknesses: ['Moderate susceptibility to common scab in sandy soils', 'Less market recognition than Shangi'],
  },
  Unica: {
    name: 'Unica',
    blightResistance: 'high',
    bacterialWiltSusceptibility: 'moderate',
    scabSusceptibility: 'moderate',
    idealElevationRangeM: [1700, 2700],
    idealAnnualRainfallRangeMm: [800, 1400],
    droughtTolerance: 'high',
    strengths: ['Bred with strong late blight resistance — needs fewer fungicide sprays', 'Good drought/heat tolerance for marginal rainfall areas'],
    weaknesses: ['Less established market/brand recognition', 'Skin appearance less familiar to some buyers'],
  },
  Tigoni: {
    name: 'Tigoni',
    blightResistance: 'moderate',
    bacterialWiltSusceptibility: 'moderate',
    scabSusceptibility: 'moderate',
    idealElevationRangeM: [1800, 2700],
    idealAnnualRainfallRangeMm: [850, 1300],
    droughtTolerance: 'moderate',
    strengths: ['Good for chips/processing', 'Medium maturity'],
    weaknesses: ['Average disease resistance package', 'Moderate storage life'],
  },
  Royal: {
    name: 'Royal',
    blightResistance: 'moderate',
    bacterialWiltSusceptibility: 'moderate',
    scabSusceptibility: 'low',
    idealElevationRangeM: [1900, 2800],
    idealAnnualRainfallRangeMm: [900, 1400],
    droughtTolerance: 'low',
    strengths: ['High yielding under good rainfall', 'Good storage life'],
    weaknesses: ['Lower drought tolerance', 'Needs reliable rainfall or irrigation'],
  },
};

export const DEFAULT_VARIETY_PROFILE: Omit<VarietyAgronomicProfile, 'name'> = {
  blightResistance: 'moderate',
  bacterialWiltSusceptibility: 'moderate',
  scabSusceptibility: 'moderate',
  idealElevationRangeM: [1800, 2700],
  idealAnnualRainfallRangeMm: [850, 1300],
  droughtTolerance: 'moderate',
  strengths: ['Generally adapted to Kenya\u2019s highland potato zones'],
  weaknesses: ['No curated agronomic profile available for this variety yet'],
};

export function getVarietyAgronomicProfile(name: string): { profile: VarietyAgronomicProfile; isCurated: boolean } {
  const match = VARIETY_AGRONOMICS[name];
  if (match) return { profile: match, isCurated: true };
  return { profile: { ...DEFAULT_VARIETY_PROFILE, name }, isCurated: false };
}
