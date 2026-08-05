import { calculateDiseaseRisk } from '../../../../src/services/decision-report/disease-risk.calculator';
import { getVarietyAgronomicProfile } from '../../../../src/data/decision-report/variety-agronomics';

describe('calculateDiseaseRisk', () => {
  it('flags high late blight risk for a low-resistance variety under humid, wet conditions with a host previous crop', () => {
    const { profile } = getVarietyAgronomicProfile('Shangi');

    const result = calculateDiseaseRisk({
      climate: {
        source: 'forecast',
        avgHumidityPercent: 90,
        avgChanceOfRainPercent: 75,
        tempRangeC: [14, 22],
        rainySeasonAlignment: 'long_rains',
        plantingSuitability: 'optimal',
      },
      varietyName: 'Shangi',
      varietyProfile: profile,
      previousCrop: 'Tomato',
      seedSource: 'farm_saved',
    });

    expect(result.riskLevel).toBe('high');
    expect(result.primaryDisease).toBe('Late blight');
    expect(result.confidence).toBe('high');
    expect(result.otherRisks.find((r) => r.name === 'Bacterial wilt')?.risk).toBe('high');
  });

  it('reports low risk for a blight-resistant variety under dry conditions with a non-host previous crop', () => {
    const { profile } = getVarietyAgronomicProfile('Unica');

    const result = calculateDiseaseRisk({
      climate: {
        source: 'seasonal_default',
        avgHumidityPercent: 55,
        avgChanceOfRainPercent: 20,
        tempRangeC: [16, 27],
        rainySeasonAlignment: 'dry',
        plantingSuitability: 'poor',
      },
      varietyName: 'Unica',
      varietyProfile: profile,
      previousCrop: 'Maize',
      seedSource: 'certified',
    });

    expect(result.riskLevel).toBe('low');
    expect(result.confidence).toBe('medium');
    expect(result.otherRisks.find((r) => r.name === 'Bacterial wilt')?.risk).toBe('moderate');
  });

  it('treats untracked previous crops as neutral (not a blight host)', () => {
    const { profile } = getVarietyAgronomicProfile('Markies');

    const result = calculateDiseaseRisk({
      climate: {
        source: 'forecast',
        avgHumidityPercent: 70,
        avgChanceOfRainPercent: 40,
        tempRangeC: [14, 22],
        rainySeasonAlignment: 'transitional',
        plantingSuitability: 'good',
      },
      varietyName: 'Markies',
      varietyProfile: profile,
      previousCrop: 'Beans',
      seedSource: 'certified',
    });

    const rotationRow = result.breakdown.find((r) => r.input === 'Rotation history');
    expect(rotationRow?.impactType).toBe('pos');
  });
});
