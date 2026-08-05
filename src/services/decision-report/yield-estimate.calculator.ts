import { BreakdownRow, ConfidenceLevel, RiskLevel, SeedSource, YieldEstimateResult } from '../../types/decision-report.types';
import { round1, row } from './helpers';

export interface YieldEstimateInput {
  varietyName: string;
  baselineYieldKgPerAcre: number;
  diseaseRiskLevel: RiskLevel;
  diseasePrimaryName: string;
  seedSource: SeedSource;
  previousCropIsRotationConcern: boolean;
  locationScore: number;
}

export function calculateYieldEstimate(input: YieldEstimateInput): YieldEstimateResult {
  const baselineTonnes = round1(input.baselineYieldKgPerAcre / 1000);

  const diseaseDelta = input.diseaseRiskLevel === 'high' ? -baselineTonnes * 0.067
    : input.diseaseRiskLevel === 'moderate' ? -baselineTonnes * 0.028
    : 0;

  const seedDelta = input.seedSource === 'certified' ? baselineTonnes * 0.044
    : input.seedSource === 'farm_saved' ? -baselineTonnes * 0.03
    : 0;

  const rotationDelta = input.previousCropIsRotationConcern ? -baselineTonnes * 0.022 : 0;

  const locationDelta = input.locationScore >= 80 ? baselineTonnes * 0.044
    : input.locationScore >= 60 ? baselineTonnes * 0.02
    : -baselineTonnes * 0.02;

  const finalYield = round1(baselineTonnes + diseaseDelta + seedDelta + rotationDelta + locationDelta);
  const rangeMinTonnes = round1(finalYield * 0.92);
  const rangeMaxTonnes = round1(finalYield * 1.08);

  const breakdown: BreakdownRow[] = [
    row('Baseline yield', `${baselineTonnes} t/acre`, 'Baseline', 'neutral', `Typical yield for ${input.varietyName} grown in this agro-ecological zone.`),
    row(
      'Disease risk',
      `${input.diseaseRiskLevel === 'high' ? 'High' : input.diseaseRiskLevel === 'moderate' ? 'Moderate' : 'Low'} (${input.diseasePrimaryName.toLowerCase()})`,
      diseaseDelta === 0 ? 'No effect' : round1(diseaseDelta).toString(),
      diseaseDelta < 0 ? 'neg' : 'neutral',
      diseaseDelta < 0
        ? 'Elevated disease pressure typically reduces effective canopy duration and tuber fill.'
        : 'Low disease pressure this season is not expected to materially affect yield.'
    ),
    row(
      'Seed source',
      input.seedSource === 'certified' ? 'Certified' : input.seedSource === 'farm_saved' ? 'Farm-saved' : 'Unknown',
      seedDelta === 0 ? 'No effect' : (seedDelta > 0 ? `+${round1(seedDelta)}` : round1(seedDelta).toString()),
      seedDelta > 0 ? 'pos' : seedDelta < 0 ? 'neg' : 'neutral',
      input.seedSource === 'certified'
        ? 'Certified seed carries a lower seed-borne disease load than farm-saved seed.'
        : input.seedSource === 'farm_saved'
          ? 'Farm-saved seed often carries a higher seed-borne disease load, reducing potential yield.'
          : 'Seed source was not specified — assumed neutral effect on yield.'
    ),
    row(
      'Rotation history',
      input.previousCropIsRotationConcern ? 'Solanaceous crop grown previously' : 'Non-host crop grown previously',
      rotationDelta === 0 ? 'No effect' : round1(rotationDelta).toString(),
      rotationDelta < 0 ? 'neg' : 'neutral',
      rotationDelta < 0
        ? 'Minor increase in soil-borne disease risk from the previous crop.'
        : 'Rotation history is neutral to favorable for this planting.'
    ),
    row(
      'Location fit',
      `${input.locationScore}/100 suitability`,
      locationDelta > 0 ? `+${round1(locationDelta)}` : round1(locationDelta).toString(),
      locationDelta > 0 ? 'pos' : 'neg',
      locationDelta > 0
        ? 'Strong overall location suitability supports a yield close to or above the regional baseline.'
        : 'Below-average location suitability is expected to constrain yield somewhat.'
    ),
  ];

  const confidence: ConfidenceLevel = 'medium';

  const assessment = finalYield >= baselineTonnes
    ? `Projected yield is ${finalYield} t/acre, in line with or slightly above the regional baseline for ${input.varietyName}.`
    : `Projected yield is ${finalYield} t/acre, modestly below the regional baseline, primarily due to ${input.diseaseRiskLevel === 'high' ? 'elevated disease risk' : 'the factors below'}.`;

  return {
    yieldPerAcreTonnes: finalYield,
    rangeMinTonnes,
    rangeMaxTonnes,
    confidence,
    assessment,
    breakdown,
    baselineYieldPerAcreTonnes: baselineTonnes,
  };
}
