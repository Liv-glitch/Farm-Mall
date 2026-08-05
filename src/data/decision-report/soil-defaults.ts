// Default soil drainage/texture assumptions used only when the farmer has no
// analyzed SoilTest on file (see src/models/SoilTest.model.ts). If a SoilTest
// is referenced in the report input, its real analysisResult values should be
// preferred over these defaults wherever the calculators consume soil data.

export type DrainageLevel = 'well_drained' | 'moderately_drained' | 'poorly_drained';

export interface SoilDefaultProfile {
  drainage: DrainageLevel;
  drainageLabel: string;
  texture: string;
}

export const COUNTY_SOIL_DEFAULTS: Record<string, SoilDefaultProfile> = {
  Nakuru: { drainage: 'moderately_drained', drainageLabel: 'Moderately heavy clay', texture: 'Clay loam' },
  Nyandarua: { drainage: 'moderately_drained', drainageLabel: 'Moderately heavy volcanic loam', texture: 'Clay loam' },
  Nyeri: { drainage: 'well_drained', drainageLabel: 'Well-drained volcanic loam', texture: 'Loam' },
  Kiambu: { drainage: 'well_drained', drainageLabel: 'Well-drained red volcanic soil', texture: 'Clay loam' },
  Meru: { drainage: 'well_drained', drainageLabel: 'Well-drained volcanic loam', texture: 'Loam' },
  Laikipia: { drainage: 'well_drained', drainageLabel: 'Well-drained sandy loam', texture: 'Sandy loam' },
  'Elgeyo-Marakwet': { drainage: 'well_drained', drainageLabel: 'Well-drained volcanic loam', texture: 'Loam' },
  'Trans Nzoia': { drainage: 'moderately_drained', drainageLabel: 'Moderately drained loam', texture: 'Clay loam' },
  'Uasin Gishu': { drainage: 'moderately_drained', drainageLabel: 'Moderately drained loam', texture: 'Clay loam' },
  Bomet: { drainage: 'moderately_drained', drainageLabel: 'Moderately drained loam', texture: 'Clay loam' },
};

export const DEFAULT_SOIL_PROFILE: SoilDefaultProfile = {
  drainage: 'moderately_drained',
  drainageLabel: 'Assumed moderately drained (no soil test on file)',
  texture: 'Unspecified',
};

export function getCountySoilDefault(county: string): { profile: SoilDefaultProfile; isCurated: boolean } {
  const match = COUNTY_SOIL_DEFAULTS[county];
  if (match) return { profile: match, isCurated: true };
  return { profile: DEFAULT_SOIL_PROFILE, isCurated: false };
}
