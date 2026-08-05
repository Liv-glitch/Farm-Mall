// Static seasonal climate defaults for Kenya's highland potato belt.
//
// DATA GAP: WeatherService.getHistoricalWeather() (src/services/weather.service.ts)
// generates random mock data — it must never be presented to a farmer as real
// history. This file encodes well-known, general facts about Kenya's rainfall
// seasonality (bimodal long rains ~Mar-May, short rains ~Oct-Dec) as a
// conservative substitute for real historical climate normals, used only when
// a live forecast isn't available (i.e. the planting date is beyond the
// ~10-day WeatherAPI.com forecast horizon).

export type RainySeasonAlignment = 'long_rains' | 'short_rains' | 'dry' | 'transitional';
export type PlantingSuitability = 'optimal' | 'good' | 'fair' | 'poor';

export interface MonthlyClimateNorm {
  month: number; // 1-12
  rainySeasonAlignment: RainySeasonAlignment;
  typicalHumidityPercent: number;
  typicalChanceOfRainPercent: number;
  plantingSuitability: PlantingSuitability;
}

// Generalized for Kenya's highland (potato-growing) agro-ecological zones.
export const KENYA_HIGHLAND_SEASONAL_CALENDAR: MonthlyClimateNorm[] = [
  { month: 1, rainySeasonAlignment: 'dry', typicalHumidityPercent: 55, typicalChanceOfRainPercent: 20, plantingSuitability: 'poor' },
  { month: 2, rainySeasonAlignment: 'dry', typicalHumidityPercent: 55, typicalChanceOfRainPercent: 20, plantingSuitability: 'poor' },
  { month: 3, rainySeasonAlignment: 'long_rains', typicalHumidityPercent: 75, typicalChanceOfRainPercent: 60, plantingSuitability: 'optimal' },
  { month: 4, rainySeasonAlignment: 'long_rains', typicalHumidityPercent: 85, typicalChanceOfRainPercent: 75, plantingSuitability: 'optimal' },
  { month: 5, rainySeasonAlignment: 'long_rains', typicalHumidityPercent: 82, typicalChanceOfRainPercent: 65, plantingSuitability: 'good' },
  { month: 6, rainySeasonAlignment: 'transitional', typicalHumidityPercent: 70, typicalChanceOfRainPercent: 40, plantingSuitability: 'fair' },
  { month: 7, rainySeasonAlignment: 'transitional', typicalHumidityPercent: 72, typicalChanceOfRainPercent: 45, plantingSuitability: 'good' },
  { month: 8, rainySeasonAlignment: 'transitional', typicalHumidityPercent: 70, typicalChanceOfRainPercent: 40, plantingSuitability: 'good' },
  { month: 9, rainySeasonAlignment: 'transitional', typicalHumidityPercent: 62, typicalChanceOfRainPercent: 30, plantingSuitability: 'fair' },
  { month: 10, rainySeasonAlignment: 'short_rains', typicalHumidityPercent: 72, typicalChanceOfRainPercent: 55, plantingSuitability: 'optimal' },
  { month: 11, rainySeasonAlignment: 'short_rains', typicalHumidityPercent: 78, typicalChanceOfRainPercent: 65, plantingSuitability: 'optimal' },
  { month: 12, rainySeasonAlignment: 'short_rains', typicalHumidityPercent: 68, typicalChanceOfRainPercent: 45, plantingSuitability: 'good' },
];

export function getSeasonalNormForMonth(month1to12: number): MonthlyClimateNorm {
  const found = KENYA_HIGHLAND_SEASONAL_CALENDAR.find((m) => m.month === month1to12);
  return found || KENYA_HIGHLAND_SEASONAL_CALENDAR[0];
}
