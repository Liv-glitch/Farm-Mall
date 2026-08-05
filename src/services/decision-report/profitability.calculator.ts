import { BreakdownRow, ProfitabilityResult } from '../../types/decision-report.types';
import { formatKes, row } from './helpers';

export interface ProfitabilityInput {
  yieldPerAcreTonnes: number;
  yieldRangeMinTonnes: number;
  yieldRangeMaxTonnes: number;
  minPricePerBag: number;
  maxPricePerBag: number;
  productionCostPerAcre: number;
}

const KG_PER_BAG = 90;

function tonnesToBags(tonnes: number): number {
  return (tonnes * 1000) / KG_PER_BAG;
}

export function calculateProfitability(input: ProfitabilityInput): ProfitabilityResult {
  const avgPricePerBag = Math.round((input.minPricePerBag + input.maxPricePerBag) / 2);

  const realisticRevenue = tonnesToBags(input.yieldPerAcreTonnes) * avgPricePerBag;
  const netProfitPerAcre = Math.round(realisticRevenue - input.productionCostPerAcre);

  const conservativeRevenue = tonnesToBags(input.yieldRangeMinTonnes) * input.minPricePerBag;
  const optimisticRevenue = tonnesToBags(input.yieldRangeMaxTonnes) * input.maxPricePerBag;

  const rangeMinPerAcre = Math.round(conservativeRevenue - input.productionCostPerAcre);
  const rangeMaxPerAcre = Math.round(optimisticRevenue - input.productionCostPerAcre);

  const breakdown: BreakdownRow[] = [
    row(
      'Expected yield',
      `${input.yieldPerAcreTonnes} t/acre`,
      'From yield prediction',
      'neutral',
      'Carries forward the yield estimate above, including its range.'
    ),
    row(
      'Price forecast',
      `${formatKes(avgPricePerBag)}/bag avg`,
      'Adds uncertainty',
      'neg',
      'This is typically the largest source of uncertainty in the profit range above.'
    ),
    row(
      'Production cost',
      `${formatKes(input.productionCostPerAcre)}/acre`,
      'Cost',
      'neutral',
      'Seed, fertilizer, pesticides, labor and land preparation at recommended rates and current reference input prices.'
    ),
  ];

  const assessment = `Estimated net profit is ${formatKes(netProfitPerAcre)} per acre. The price forecast is the primary source of uncertainty in this estimate.`;

  return {
    netProfitPerAcre,
    rangeMinPerAcre,
    rangeMaxPerAcre,
    confidence: 'low',
    assessment,
    breakdown,
  };
}
