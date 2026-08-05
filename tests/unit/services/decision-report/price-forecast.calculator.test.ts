import { calculatePriceForecast } from '../../../../src/services/decision-report/price-forecast.calculator';
import { getPriceBandForMonth } from '../../../../src/data/decision-report/price-bands';

describe('calculatePriceForecast', () => {
  it('always returns low confidence since price bands are static defaults', () => {
    const priceBand = getPriceBandForMonth(7);
    const result = calculatePriceForecast({ harvestDate: new Date('2026-07-15'), priceBand });

    expect(result.confidence).toBe('low');
    expect(result.minPricePerBag).toBe(priceBand.minPricePerBag);
    expect(result.maxPricePerBag).toBe(priceBand.maxPricePerBag);
    expect(result.breakdown).toHaveLength(2);
  });

  it('flags downward pressure for a harvest month that coincides with the main-season glut', () => {
    const priceBand = getPriceBandForMonth(8); // August: main-season glut
    const result = calculatePriceForecast({ harvestDate: new Date('2026-08-10'), priceBand });

    const timingRow = result.breakdown.find((r) => r.input === 'Harvest timing');
    expect(timingRow?.impactType).toBe('neg');
    expect(timingRow?.impactLabel).toBe('Downward pressure');
  });

  it('flags upward pressure for a lean-period harvest month', () => {
    const priceBand = getPriceBandForMonth(4); // April: leanest month
    const result = calculatePriceForecast({ harvestDate: new Date('2026-04-10'), priceBand });

    const timingRow = result.breakdown.find((r) => r.input === 'Harvest timing');
    expect(timingRow?.impactType).toBe('pos');
    expect(timingRow?.impactLabel).toBe('Upward pressure');
  });
});
