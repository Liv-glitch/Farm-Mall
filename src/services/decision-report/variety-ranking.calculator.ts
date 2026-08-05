import { ConfidenceLevel, VarietyRankCard, VarietyRankingResult } from '../../types/decision-report.types';
import { VarietyAgronomicProfile } from '../../data/decision-report/variety-agronomics';
import { clamp } from './helpers';

export interface VarietyCandidate {
  name: string;
  maturityDays: number;
  profile: VarietyAgronomicProfile;
  isCuratedProfile: boolean;
}

export interface VarietyRankingInput {
  candidates: VarietyCandidate[];
  locationName: string;
  elevationM: number;
  avgAnnualRainfallMm: number;
  rainfallPattern: 'bimodal' | 'unimodal';
}

function rangeFitScore(value: number, range: [number, number], maxPoints: number): number {
  const [min, max] = range;
  if (value >= min && value <= max) return maxPoints;
  const distance = value < min ? min - value : value - max;
  const spread = max - min || 1;
  const penalty = clamp(distance / spread, 0, 1);
  return Math.round(maxPoints * (1 - penalty));
}

const RESISTANCE_POINTS: Record<'low' | 'moderate' | 'high', number> = { low: 5, moderate: 12, high: 20 };

export function calculateVarietyRanking(input: VarietyRankingInput): VarietyRankingResult {
  const scored = input.candidates.map((candidate) => {
    const elevationScore = rangeFitScore(input.elevationM, candidate.profile.idealElevationRangeM, 40);
    const rainfallScore = rangeFitScore(input.avgAnnualRainfallMm, candidate.profile.idealAnnualRainfallRangeMm, 30);
    const resistanceScore = RESISTANCE_POINTS[candidate.profile.blightResistance];
    const maturityScore = candidate.maturityDays <= 90 ? 10 : candidate.maturityDays <= 110 ? 7 : 4;

    const total = clamp(elevationScore + rainfallScore + resistanceScore + maturityScore, 0, 100);

    return { candidate, elevationScore, rainfallScore, resistanceScore, maturityScore, total };
  });

  scored.sort((a, b) => b.total - a.total);

  const cards: VarietyRankCard[] = scored.map((entry, idx) => {
    const points: string[] = [];
    const climateFitGood = entry.elevationScore >= 30 && entry.rainfallScore >= 20;

    if (idx === 0) {
      points.push(
        climateFitGood
          ? `Strong fit for ${input.locationName}'s climate and elevation`
          : `Reasonable fit for ${input.locationName}, though not a perfect climate match`
      );
    } else {
      points.push(
        entry.elevationScore >= scored[0].elevationScore
          ? 'Good elevation fit, comparable to the top-ranked variety'
          : 'Good elevation fit, somewhat weaker rainfall match'
      );
    }

    const weakestDimension = [
      { label: 'below-average blight resistance', score: entry.resistanceScore, threshold: 12 },
      { label: 'a tighter fit against the local rainfall pattern', score: entry.rainfallScore, threshold: 20 },
      { label: 'a longer maturity period, tighter fit against the rains', score: entry.maturityScore, threshold: 7 },
    ].sort((a, b) => a.score - b.score)[0];

    if (entry.candidate.profile.blightResistance === 'high') {
      points.push('Better blight tolerance than most alternatives');
    } else if (weakestDimension.score < weakestDimension.threshold) {
      points.push(`Primary weakness: ${weakestDimension.label}`);
    } else if (entry.candidate.profile.weaknesses[0]) {
      points.push(entry.candidate.profile.weaknesses[0]);
    }

    return {
      rank: idx + 1,
      name: entry.candidate.name,
      score: entry.total,
      points,
    };
  });

  const anyUncurated = input.candidates.some((c) => !c.isCuratedProfile);
  const confidence: ConfidenceLevel = anyUncurated ? 'low' : 'medium';

  const topName = cards[0]?.name || input.candidates[0]?.name || 'the top candidate';
  const assessment = `${topName} ranks highest among the ${input.candidates.length} variet${input.candidates.length === 1 ? 'y' : 'ies'} evaluated, based on climate, elevation, and disease-pressure fit.`;

  return { confidence, assessment, cards };
}
