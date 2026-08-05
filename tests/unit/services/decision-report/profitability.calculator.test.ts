import { calculateProfitability } from '../../../../src/services/decision-report/profitability.calculator';

describe('calculateProfitability', () => {
  it('computes net profit as revenue from the average price minus production cost', () => {
    const result = calculateProfitability({
      yieldPerAcreTonnes: 9,
      yieldRangeMinTonnes: 8.3,
      yieldRangeMaxTonnes: 9.7,
      minPricePerBag: 1600,
      maxPricePerBag: 2200,
      productionCostPerAcre: 70000,
    });

    const avgPrice = (1600 + 2200) / 2;
    const expectedRevenue = ((9 * 1000) / 90) * avgPrice;
    expect(result.netProfitPerAcre).toBe(Math.round(expectedRevenue - 70000));
    expect(result.confidence).toBe('low');
  });

  it('produces a wider profit range than the single-point estimate', () => {
    const result = calculateProfitability({
      yieldPerAcreTonnes: 9,
      yieldRangeMinTonnes: 8.3,
      yieldRangeMaxTonnes: 9.7,
      minPricePerBag: 1600,
      maxPricePerBag: 2200,
      productionCostPerAcre: 70000,
    });

    expect(result.rangeMinPerAcre).toBeLessThan(result.netProfitPerAcre);
    expect(result.rangeMaxPerAcre).toBeGreaterThan(result.netProfitPerAcre);
  });

  it('can report a loss when production cost exceeds revenue', () => {
    const result = calculateProfitability({
      yieldPerAcreTonnes: 3,
      yieldRangeMinTonnes: 2.5,
      yieldRangeMaxTonnes: 3.5,
      minPricePerBag: 1200,
      maxPricePerBag: 1500,
      productionCostPerAcre: 90000,
    });

    expect(result.netProfitPerAcre).toBeLessThan(0);
  });
});
