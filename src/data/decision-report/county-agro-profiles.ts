// Curated reference data for Kenya's main potato-growing counties.
//
// DATA GAP: there is no elevation column or geo-lookup table anywhere in this
// codebase (see CLAUDE.md / models). Elevation bands and sub-county centroids
// below are approximate, hand-curated defaults (public-knowledge estimates for
// well-known towns), not sourced from a survey-grade dataset. They exist so the
// Farm Decision Report has *something* reasonable to reason over when the
// farmer doesn't supply exact GPS coordinates. Treat any county not listed here
// as lower-confidence territory — see DEFAULT_COUNTY_PROFILE.

export interface SubCountyProfile {
  name: string;
  elevationM: number;
  lat: number;
  lng: number;
}

export interface CountyAgroProfile {
  county: string;
  elevationBandM: [number, number];
  defaultElevationM: number;
  lat: number;
  lng: number;
  agroEcologicalZone: string;
  rainfallPattern: 'bimodal' | 'unimodal';
  avgAnnualRainfallMm: number;
  avgTempRangeC: [number, number];
  potatoSuitability: 'high' | 'medium' | 'low';
  subCounties: SubCountyProfile[];
}

// Kenya's known potato-growing counties (mirrors KENYA_LOCATIONS.POTATO_GROWING_REGIONS
// in src/utils/constants.ts) plus curated agro-climatic defaults for each.
export const COUNTY_AGRO_PROFILES: Record<string, CountyAgroProfile> = {
  Nakuru: {
    county: 'Nakuru',
    elevationBandM: [1850, 2600],
    defaultElevationM: 2100,
    lat: -0.2833,
    lng: 36.0667,
    agroEcologicalZone: 'Upper Highland (UH2/UH3)',
    rainfallPattern: 'bimodal',
    avgAnnualRainfallMm: 950,
    avgTempRangeC: [12, 22],
    potatoSuitability: 'high',
    subCounties: [
      { name: 'Molo', elevationM: 2450, lat: -0.2464, lng: 35.7328 },
      { name: 'Elburgon', elevationM: 2340, lat: -0.3936, lng: 35.8358 },
      { name: 'Njoro', elevationM: 2170, lat: -0.3336, lng: 35.9433 },
      { name: 'Naivasha', elevationM: 1900, lat: -0.7167, lng: 36.4333 },
      { name: 'Rongai', elevationM: 1950, lat: -0.1667, lng: 35.8667 },
    ],
  },
  Nyandarua: {
    county: 'Nyandarua',
    elevationBandM: [2200, 2900],
    defaultElevationM: 2500,
    lat: -0.3833,
    lng: 36.5,
    agroEcologicalZone: 'Upper Highland (UH1/UH2)',
    rainfallPattern: 'bimodal',
    avgAnnualRainfallMm: 1100,
    avgTempRangeC: [10, 20],
    potatoSuitability: 'high',
    subCounties: [
      { name: 'Ol Kalou', elevationM: 2350, lat: -0.2833, lng: 36.3667 },
      { name: 'Ol Jorok', elevationM: 2500, lat: -0.35, lng: 36.45 },
      { name: 'Kinangop', elevationM: 2650, lat: -0.6167, lng: 36.5667 },
      { name: 'Ndaragwa', elevationM: 2400, lat: -0.15, lng: 36.55 },
    ],
  },
  Nyeri: {
    county: 'Nyeri',
    elevationBandM: [1750, 2500],
    defaultElevationM: 1950,
    lat: -0.4167,
    lng: 36.95,
    agroEcologicalZone: 'Upper Midland / Lower Highland (UM1/LH1)',
    rainfallPattern: 'bimodal',
    avgAnnualRainfallMm: 1050,
    avgTempRangeC: [13, 23],
    potatoSuitability: 'high',
    subCounties: [
      { name: 'Kieni', elevationM: 1950, lat: -0.2333, lng: 37.0667 },
      { name: 'Mathira', elevationM: 1750, lat: -0.4, lng: 37.1 },
      { name: 'Tetu', elevationM: 2050, lat: -0.4333, lng: 36.8667 },
      { name: 'Othaya', elevationM: 1800, lat: -0.5333, lng: 36.9833 },
    ],
  },
  Kiambu: {
    county: 'Kiambu',
    elevationBandM: [1600, 2200],
    defaultElevationM: 1850,
    lat: -1.0333,
    lng: 36.8667,
    agroEcologicalZone: 'Upper Midland (UM1/UM2)',
    rainfallPattern: 'bimodal',
    avgAnnualRainfallMm: 1000,
    avgTempRangeC: [14, 24],
    potatoSuitability: 'medium',
    subCounties: [
      { name: 'Limuru', elevationM: 2200, lat: -1.1122, lng: 36.6425 },
      { name: 'Kikuyu', elevationM: 1950, lat: -1.2469, lng: 36.6644 },
      { name: 'Lari', elevationM: 2350, lat: -0.9833, lng: 36.6167 },
    ],
  },
  Meru: {
    county: 'Meru',
    elevationBandM: [1600, 2500],
    defaultElevationM: 1900,
    lat: 0.05,
    lng: 37.65,
    agroEcologicalZone: 'Upper Midland / Lower Highland (UM1/LH1)',
    rainfallPattern: 'bimodal',
    avgAnnualRainfallMm: 1150,
    avgTempRangeC: [13, 23],
    potatoSuitability: 'high',
    subCounties: [
      { name: 'Buuri', elevationM: 2100, lat: 0.1167, lng: 37.4833 },
      { name: 'Timau', elevationM: 2200, lat: 0.05, lng: 37.25 },
      { name: 'Central Meru', elevationM: 1600, lat: 0.05, lng: 37.65 },
    ],
  },
  Laikipia: {
    county: 'Laikipia',
    elevationBandM: [1750, 2400],
    defaultElevationM: 1950,
    lat: 0.2,
    lng: 36.8,
    agroEcologicalZone: 'Lower Highland (LH3)',
    rainfallPattern: 'bimodal',
    avgAnnualRainfallMm: 750,
    avgTempRangeC: [12, 24],
    potatoSuitability: 'medium',
    subCounties: [
      { name: 'Nyahururu', elevationM: 2360, lat: 0.0333, lng: 36.3667 },
      { name: 'Rumuruti', elevationM: 1770, lat: 0.2667, lng: 36.5333 },
    ],
  },
  'Elgeyo-Marakwet': {
    county: 'Elgeyo-Marakwet',
    elevationBandM: [2000, 2700],
    defaultElevationM: 2300,
    lat: 0.5167,
    lng: 35.5,
    agroEcologicalZone: 'Upper Highland (UH1)',
    rainfallPattern: 'bimodal',
    avgAnnualRainfallMm: 1100,
    avgTempRangeC: [11, 21],
    potatoSuitability: 'high',
    subCounties: [
      { name: 'Keiyo South', elevationM: 2300, lat: 0.4167, lng: 35.5 },
      { name: 'Marakwet East', elevationM: 2100, lat: 0.9, lng: 35.6 },
    ],
  },
  'Trans Nzoia': {
    county: 'Trans Nzoia',
    elevationBandM: [1800, 2500],
    defaultElevationM: 1900,
    lat: 1.0167,
    lng: 34.9500,
    agroEcologicalZone: 'Upper Midland / Lower Highland (UM1/LH1)',
    rainfallPattern: 'bimodal',
    avgAnnualRainfallMm: 1200,
    avgTempRangeC: [12, 23],
    potatoSuitability: 'high',
    subCounties: [
      { name: 'Kitale', elevationM: 1900, lat: 1.0157, lng: 35.0062 },
      { name: 'Kwanza', elevationM: 2000, lat: 1.05, lng: 34.9 },
      { name: 'Cherangany', elevationM: 2100, lat: 0.9333, lng: 35.15 },
    ],
  },
  'Uasin Gishu': {
    county: 'Uasin Gishu',
    elevationBandM: [1900, 2400],
    defaultElevationM: 2100,
    lat: 0.5167,
    lng: 35.2833,
    agroEcologicalZone: 'Upper Midland (UM1)',
    rainfallPattern: 'bimodal',
    avgAnnualRainfallMm: 1000,
    avgTempRangeC: [12, 23],
    potatoSuitability: 'medium',
    subCounties: [
      { name: 'Eldoret East', elevationM: 2100, lat: 0.5333, lng: 35.35 },
      { name: 'Moiben', elevationM: 2200, lat: 0.65, lng: 35.4 },
    ],
  },
  Bomet: {
    county: 'Bomet',
    elevationBandM: [1800, 2500],
    defaultElevationM: 2100,
    lat: -0.7833,
    lng: 35.35,
    agroEcologicalZone: 'Upper Midland (UM1)',
    rainfallPattern: 'bimodal',
    avgAnnualRainfallMm: 1200,
    avgTempRangeC: [12, 22],
    potatoSuitability: 'medium',
    subCounties: [
      { name: 'Bomet Central', elevationM: 2100, lat: -0.7833, lng: 35.35 },
      { name: 'Sotik', elevationM: 1850, lat: -0.6833, lng: 35.1167 },
    ],
  },
};

// Fallback used for any county not curated above. Deliberately mid-of-the-road
// so the report degrades gracefully instead of guessing wildly; confidence for
// location-dependent predictions is downgraded when this fallback is used.
export const DEFAULT_COUNTY_PROFILE: CountyAgroProfile = {
  county: 'Unknown',
  elevationBandM: [1200, 1800],
  defaultElevationM: 1500,
  lat: -0.0236,
  lng: 37.9062,
  agroEcologicalZone: 'Lower Midland (estimated)',
  rainfallPattern: 'unimodal',
  avgAnnualRainfallMm: 800,
  avgTempRangeC: [16, 27],
  potatoSuitability: 'low',
  subCounties: [],
};

export function getCountyAgroProfile(county: string): { profile: CountyAgroProfile; isCurated: boolean } {
  const match = COUNTY_AGRO_PROFILES[county];
  if (match) return { profile: match, isCurated: true };
  return { profile: { ...DEFAULT_COUNTY_PROFILE, county }, isCurated: false };
}

export function getSubCountyProfile(county: string, subCounty: string): SubCountyProfile | undefined {
  const profile = COUNTY_AGRO_PROFILES[county];
  if (!profile) return undefined;
  const normalized = subCounty.trim().toLowerCase();
  return profile.subCounties.find((s) => s.name.toLowerCase() === normalized);
}
