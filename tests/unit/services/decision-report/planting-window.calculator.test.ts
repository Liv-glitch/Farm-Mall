import { calculatePlantingWindow } from '../../../../src/services/decision-report/planting-window.calculator';

describe('calculatePlantingWindow', () => {
  const basePlantingDate = new Date('2026-07-20T00:00:00Z');

  it('scores highly for an optimal long-rains forecast window with irrigation', () => {
    const result = calculatePlantingWindow({
      plantingDate: basePlantingDate,
      climate: {
        source: 'forecast',
        avgHumidityPercent: 85,
        avgChanceOfRainPercent: 70,
        tempRangeC: [14, 22],
        rainySeasonAlignment: 'long_rains',
        plantingSuitability: 'optimal',
      },
      maturityDays: 90,
      varietyName: 'Shangi',
      waterSource: 'irrigated',
    });

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.confidence).toBe('high');
    expect(result.windowStartLabel).toBeTruthy();
    expect(result.breakdown).toHaveLength(5);
  });

  it('scores poorly for a dry-season seasonal-default window with no irrigation', () => {
    const result = calculatePlantingWindow({
      plantingDate: basePlantingDate,
      climate: {
        source: 'seasonal_default',
        avgHumidityPercent: 55,
        avgChanceOfRainPercent: 20,
        tempRangeC: [16, 27],
        rainySeasonAlignment: 'dry',
        plantingSuitability: 'poor',
      },
      maturityDays: 90,
      varietyName: 'Shangi',
      waterSource: 'rainfed',
    });

    expect(result.score).toBeLessThan(45);
    expect(result.confidence).toBe('medium');
  });

  it('uses live forecast confidence when the climate source is a forecast', () => {
    const result = calculatePlantingWindow({
      plantingDate: basePlantingDate,
      climate: {
        source: 'forecast',
        avgHumidityPercent: 60,
        avgChanceOfRainPercent: 40,
        tempRangeC: [14, 24],
        rainySeasonAlignment: 'transitional',
        plantingSuitability: 'fair',
      },
      maturityDays: 100,
      varietyName: 'Markies',
      waterSource: 'rainfed',
    });

    expect(result.confidence).toBe('high');
    expect(result.breakdown[0].meaning).toContain('forecast');
  });
});
