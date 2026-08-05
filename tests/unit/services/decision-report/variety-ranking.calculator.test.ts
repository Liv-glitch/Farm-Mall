import { calculateVarietyRanking } from '../../../../src/services/decision-report/variety-ranking.calculator';
import { getVarietyAgronomicProfile } from '../../../../src/data/decision-report/variety-agronomics';

describe('calculateVarietyRanking', () => {
  it('ranks a blight-resistant, well-elevation-matched variety above a poorly-matched one', () => {
    const unica = getVarietyAgronomicProfile('Unica');
    const royal = getVarietyAgronomicProfile('Royal');

    const result = calculateVarietyRanking({
      candidates: [
        { name: 'Unica', maturityDays: 90, profile: unica.profile, isCuratedProfile: unica.isCurated },
        { name: 'Royal', maturityDays: 130, profile: royal.profile, isCuratedProfile: royal.isCurated },
      ],
      locationName: 'Elburgon',
      elevationM: 2340,
      avgAnnualRainfallMm: 950,
      rainfallPattern: 'bimodal',
    });

    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].rank).toBe(1);
    expect(result.cards[0].name).toBe('Unica');
    expect(result.cards[0].score).toBeGreaterThan(result.cards[1].score);
    expect(result.confidence).toBe('medium');
  });

  it('downgrades confidence to low when any candidate has no curated agronomic profile', () => {
    const shangi = getVarietyAgronomicProfile('Shangi');
    const unknown = getVarietyAgronomicProfile('SomeBrandNewVariety');

    const result = calculateVarietyRanking({
      candidates: [
        { name: 'Shangi', maturityDays: 90, profile: shangi.profile, isCuratedProfile: shangi.isCurated },
        { name: 'SomeBrandNewVariety', maturityDays: 100, profile: unknown.profile, isCuratedProfile: unknown.isCurated },
      ],
      locationName: 'Elburgon',
      elevationM: 2340,
      avgAnnualRainfallMm: 950,
      rainfallPattern: 'bimodal',
    });

    expect(result.confidence).toBe('low');
  });

  it('gives every candidate at least one strength/weakness bullet point', () => {
    const shangi = getVarietyAgronomicProfile('Shangi');

    const result = calculateVarietyRanking({
      candidates: [{ name: 'Shangi', maturityDays: 90, profile: shangi.profile, isCuratedProfile: shangi.isCurated }],
      locationName: 'Elburgon',
      elevationM: 2340,
      avgAnnualRainfallMm: 950,
      rainfallPattern: 'bimodal',
    });

    expect(result.cards[0].points.length).toBeGreaterThanOrEqual(1);
  });
});
