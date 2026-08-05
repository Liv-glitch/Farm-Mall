import { calculateYieldEstimate } from '../../../../src/services/decision-report/yield-estimate.calculator';

describe('calculateYieldEstimate', () => {
  it('boosts yield above baseline for certified seed, low disease risk and strong location fit', () => {
    const result = calculateYieldEstimate({
      varietyName: 'Shangi',
      baselineYieldKgPerAcre: 8000,
      diseaseRiskLevel: 'low',
      diseasePrimaryName: 'Late blight',
      seedSource: 'certified',
      previousCropIsRotationConcern: false,
      locationScore: 85,
    });

    expect(result.baselineYieldPerAcreTonnes).toBe(8);
    expect(result.yieldPerAcreTonnes).toBeGreaterThan(result.baselineYieldPerAcreTonnes);
    expect(result.rangeMinTonnes).toBeLessThan(result.yieldPerAcreTonnes);
    expect(result.rangeMaxTonnes).toBeGreaterThan(result.yieldPerAcreTonnes);
    expect(result.confidence).toBe('medium');
  });

  it('reduces yield below baseline for farm-saved seed, high disease risk and weak location fit', () => {
    const result = calculateYieldEstimate({
      varietyName: 'Shangi',
      baselineYieldKgPerAcre: 8000,
      diseaseRiskLevel: 'high',
      diseasePrimaryName: 'Late blight',
      seedSource: 'farm_saved',
      previousCropIsRotationConcern: true,
      locationScore: 40,
    });

    expect(result.yieldPerAcreTonnes).toBeLessThan(result.baselineYieldPerAcreTonnes);
    const diseaseRow = result.breakdown.find((r) => r.input === 'Disease risk');
    expect(diseaseRow?.impactType).toBe('neg');
  });

  it('leaves yield unaffected when seed source is unknown and rotation is not a concern', () => {
    const result = calculateYieldEstimate({
      varietyName: 'Sherekea',
      baselineYieldKgPerAcre: 9000,
      diseaseRiskLevel: 'low',
      diseasePrimaryName: 'Late blight',
      seedSource: 'unknown',
      previousCropIsRotationConcern: false,
      locationScore: 65,
    });

    const seedRow = result.breakdown.find((r) => r.input === 'Seed source');
    expect(seedRow?.impactLabel).toBe('No effect');
  });
});
