import { BreakdownRow, PriceForecastResult } from '../../types/decision-report.types';
import { PriceBand } from '../../data/decision-report/price-bands';
import { row } from './helpers';

export interface PriceForecastInput {
  harvestDate: Date;
  priceBand: PriceBand;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function calculatePriceForecast(input: PriceForecastInput): PriceForecastResult {
  const { priceBand } = input;
  const harvestMonthLabel = `${MONTH_NAMES[input.harvestDate.getMonth()]} ${input.harvestDate.getFullYear()}`;

  const breakdown: BreakdownRow[] = [
    row(
      'Historical price pattern',
      `Seasonal average for ${MONTH_NAMES[priceBand.month - 1]}`,
      'Baseline',
      'neutral',
      `Prices in ${MONTH_NAMES[priceBand.month - 1]} have typically fallen within this range in recent years (static seasonal default, not live market data).`
    ),
    row(
      'Harvest timing',
      priceBand.pressure === 'downward' ? 'Coincides with peak regional harvest' : priceBand.pressure === 'upward' ? 'Coincides with a lean supply period' : 'Neutral supply period',
      priceBand.pressure === 'downward' ? 'Downward pressure' : priceBand.pressure === 'upward' ? 'Upward pressure' : 'Neutral',
      priceBand.pressure === 'downward' ? 'neg' : priceBand.pressure === 'upward' ? 'pos' : 'neutral',
      priceBand.note
    ),
  ];

  const assessment = `Historical pricing patterns indicate a likely range of KES ${priceBand.minPricePerBag.toLocaleString()}\u2013${priceBand.maxPricePerBag.toLocaleString()} per 90kg bag at harvest; this figure should be treated as indicative rather than a firm forecast.`;

  return {
    minPricePerBag: priceBand.minPricePerBag,
    maxPricePerBag: priceBand.maxPricePerBag,
    harvestMonthLabel,
    confidence: 'low',
    assessment,
    breakdown,
  };
}
