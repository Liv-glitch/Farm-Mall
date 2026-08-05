import { calculateLocationSuitability } from '../../../../src/services/decision-report/location-suitability.calculator';

describe('calculateLocationSuitability', () => {
  it('scores a well-drained, optimal-elevation, bimodal-rainfall rainfed location highly', () => {
    const result = calculateLocationSuitability({
      elevationM: 2340,
      rainfallPattern: 'bimodal',
      avgAnnualRainfallMm: 950,
      avgTempRangeC: [12, 20],
      soilDrainage: 'moderately_drained',
      soilDrainageLabel: 'Moderately heavy clay',
      waterSource: 'rainfed',
      isCuratedLocationProfile: true,
    });

    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.label).toBe('Highly suitable');
    expect(result.confidence).toBe('high');
    expect(result.breakdown).toHaveLength(5);
    expect(result.breakdown[0].input).toBe('Elevation');
    expect(result.breakdown[0].impactType).toBe('pos');
  });

  it('penalizes low elevation, poor drainage and no irrigation', () => {
    const result = calculateLocationSuitability({
      elevationM: 900,
      rainfallPattern: 'unimodal',
      avgAnnualRainfallMm: 600,
      avgTempRangeC: [20, 32],
      soilDrainage: 'poorly_drained',
      soilDrainageLabel: 'Poorly drained clay',
      waterSource: 'rainfed',
      isCuratedLocationProfile: false,
    });

    expect(result.score).toBeLessThan(55);
    expect(result.confidence).toBe('medium');
    const drainageRow = result.breakdown.find((r) => r.input === 'Soil drainage');
    expect(drainageRow?.impactType).toBe('neg');
  });

  it('gives irrigation a positive impact when rainfed reliability is otherwise poor', () => {
    const rainfed = calculateLocationSuitability({
      elevationM: 2000,
      rainfallPattern: 'unimodal',
      avgAnnualRainfallMm: 500,
      avgTempRangeC: [15, 22],
      soilDrainage: 'well_drained',
      soilDrainageLabel: 'Well drained',
      waterSource: 'rainfed',
      isCuratedLocationProfile: true,
    });

    const irrigated = calculateLocationSuitability({
      elevationM: 2000,
      rainfallPattern: 'unimodal',
      avgAnnualRainfallMm: 500,
      avgTempRangeC: [15, 22],
      soilDrainage: 'well_drained',
      soilDrainageLabel: 'Well drained',
      waterSource: 'irrigated',
      isCuratedLocationProfile: true,
    });

    expect(irrigated.score).toBeGreaterThan(rainfed.score);
  });
});
