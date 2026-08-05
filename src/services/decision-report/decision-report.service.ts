import { v4 as uuidv4 } from 'uuid';
import CropVarietyModel from '../../models/CropVariety.model';
import { SoilTestModel } from '../../models/SoilTest.model';
import { WeatherService } from '../weather.service';
import { getCountyAgroProfile, getSubCountyProfile } from '../../data/decision-report/county-agro-profiles';
import { getVarietyAgronomicProfile } from '../../data/decision-report/variety-agronomics';
import { getSeasonalNormForMonth } from '../../data/decision-report/seasonal-calendar';
import { getPriceBandForMonth } from '../../data/decision-report/price-bands';
import { getCountySoilDefault, DrainageLevel } from '../../data/decision-report/soil-defaults';
import {
  DecisionReportData,
  DecisionReportInput,
  NearTermClimateSignal,
  PredictionBlock,
} from '../../types/decision-report.types';
import { calculateLocationSuitability } from './location-suitability.calculator';
import { calculatePlantingWindow } from './planting-window.calculator';
import { calculateDiseaseRisk } from './disease-risk.calculator';
import { calculateYieldEstimate } from './yield-estimate.calculator';
import { calculateVarietyRanking, VarietyCandidate } from './variety-ranking.calculator';
import { calculatePriceForecast } from './price-forecast.calculator';
import { CONFIDENCE_CAPTIONS, addDays, formatDateLong, round1 } from './helpers';
import { logError, logInfo } from '../../utils/logger';

const FORECAST_HORIZON_DAYS = 10;
const BLIGHT_HOST_CROPS = ['potato', 'potatoes', 'tomato', 'tomatoes', 'eggplant', 'brinjal'];

function textureToDrainage(texture?: string): DrainageLevel | undefined {
  if (!texture) return undefined;
  const t = texture.toLowerCase();
  if (t.includes('sand')) return 'well_drained';
  if (t.includes('clay')) return 'moderately_drained';
  if (t.includes('loam')) return 'well_drained';
  return undefined;
}

const weatherService = new WeatherService();

export class DecisionReportService {
  async buildReportData(input: DecisionReportInput): Promise<DecisionReportData> {
    const plantingDate = new Date(input.plantingDate);

    const { profile: countyProfile, isCurated: isCountyCurated } = getCountyAgroProfile(input.county);
    const subCountyProfile = getSubCountyProfile(input.county, input.subCounty);

    const elevationM = subCountyProfile?.elevationM ?? countyProfile.defaultElevationM;
    const lat = input.gpsLat ?? subCountyProfile?.lat ?? countyProfile.lat;
    const lng = input.gpsLng ?? subCountyProfile?.lng ?? countyProfile.lng;

    const climate = await this.resolveClimateSignal(lat, lng, plantingDate);

    const { profile: soilDefault } = getCountySoilDefault(input.county);
    let soilDrainage: DrainageLevel = soilDefault.drainage;
    let soilDrainageLabel = soilDefault.drainageLabel;

    if (input.soilTestId) {
      try {
        const soilTest = await SoilTestModel.findByPk(input.soilTestId);
        if (soilTest && soilTest.status === 'analyzed' && soilTest.analysisResult?.texture) {
          const inferred = textureToDrainage(soilTest.analysisResult.texture);
          if (inferred) {
            soilDrainage = inferred;
            soilDrainageLabel = `${soilTest.analysisResult.texture} (from your soil test)`;
          }
        }
      } catch (error) {
        logError('Failed to load referenced soil test for decision report, falling back to county default', error as Error, { soilTestId: input.soilTestId });
      }
    }

    const cropVarieties = await CropVarietyModel.findAll({ where: { id: input.cropVarietyIds } });
    if (cropVarieties.length === 0) {
      throw new Error('None of the selected crop varieties were found');
    }
    // Preserve the farmer's chosen ordering; the first candidate is treated as
    // the "primary" variety for planting-window / disease / yield sections.
    const orderedVarieties = input.cropVarietyIds
      .map((id) => cropVarieties.find((v) => v.id === id))
      .filter((v): v is CropVarietyModel => Boolean(v));
    const primaryVariety = orderedVarieties[0];
    const primaryVarietyAgronomics = getVarietyAgronomicProfile(primaryVariety.name);

    // --- Prediction 1: Location suitability -----------------------------
    const locationSuitability = calculateLocationSuitability({
      elevationM,
      rainfallPattern: countyProfile.rainfallPattern,
      avgAnnualRainfallMm: countyProfile.avgAnnualRainfallMm,
      avgTempRangeC: countyProfile.avgTempRangeC,
      soilDrainage,
      soilDrainageLabel,
      waterSource: input.waterSource,
      isCuratedLocationProfile: isCountyCurated,
    });

    // --- Prediction 2: Planting window -----------------------------------
    const plantingWindow = calculatePlantingWindow({
      plantingDate,
      climate,
      maturityDays: primaryVariety.maturityPeriodDays,
      varietyName: primaryVariety.name,
      waterSource: input.waterSource,
    });

    // --- Prediction 3: Disease risk ---------------------------------------
    const diseaseRisk = calculateDiseaseRisk({
      climate,
      varietyName: primaryVariety.name,
      varietyProfile: primaryVarietyAgronomics.profile,
      previousCrop: input.previousCrop,
      seedSource: input.seedSource,
    });

    const previousCropIsRotationConcern = Boolean(
      input.previousCrop && BLIGHT_HOST_CROPS.some((host) => input.previousCrop!.trim().toLowerCase().includes(host))
    );

    // --- Prediction 4: Yield estimate -------------------------------------
    const yieldEstimate = calculateYieldEstimate({
      varietyName: primaryVariety.name,
      baselineYieldKgPerAcre: Number(primaryVariety.averageYieldPerAcre) || 8000,
      diseaseRiskLevel: diseaseRisk.riskLevel,
      diseasePrimaryName: diseaseRisk.primaryDisease,
      seedSource: input.seedSource,
      previousCropIsRotationConcern,
      locationScore: locationSuitability.score,
    });

    // --- Prediction 5: Variety ranking -------------------------------------
    const varietyCandidates: VarietyCandidate[] = orderedVarieties.map((variety) => {
      const agronomics = getVarietyAgronomicProfile(variety.name);
      return {
        name: variety.name,
        maturityDays: variety.maturityPeriodDays,
        profile: agronomics.profile,
        isCuratedProfile: agronomics.isCurated,
      };
    });
    const varietyRanking = calculateVarietyRanking({
      candidates: varietyCandidates,
      locationName: input.locationName || input.subCounty,
      elevationM,
      avgAnnualRainfallMm: countyProfile.avgAnnualRainfallMm,
      rainfallPattern: countyProfile.rainfallPattern,
    });

    // --- Prediction 6: Price forecast --------------------------------------
    const harvestDate = addDays(plantingDate, primaryVariety.maturityPeriodDays);
    const priceBand = getPriceBandForMonth(harvestDate.getMonth() + 1);
    const priceForecast = calculatePriceForecast({ harvestDate, priceBand });

    const predictions: PredictionBlock[] = [
      {
        index: 1,
        total: 6,
        type: 'location_suitability',
        title: 'Location suitability',
        confidence: locationSuitability.confidence,
        confidenceCaption: CONFIDENCE_CAPTIONS[locationSuitability.confidence],
        assessment: locationSuitability.assessment,
        breakdown: locationSuitability.breakdown,
        breakdownLabel: 'How we calculated this score',
        valueHeadline: `${locationSuitability.score}`,
        valueUnit: '/100',
        valueSubLabel: locationSuitability.label,
      },
      {
        index: 2,
        total: 6,
        type: 'planting_window',
        title: 'Optimal planting window',
        confidence: plantingWindow.confidence,
        confidenceCaption: CONFIDENCE_CAPTIONS[plantingWindow.confidence],
        assessment: plantingWindow.assessment,
        breakdown: plantingWindow.breakdown,
        breakdownLabel: 'How we calculated this window',
        valueHeadline: `${plantingWindow.windowStartLabel} \u2013 ${plantingWindow.windowEndLabel}`,
        valueVariant: 'small',
        valueSubLabel: `Window score: ${plantingWindow.score}/100`,
      },
      {
        index: 3,
        total: 6,
        type: 'disease_risk',
        title: 'Disease risk',
        confidence: diseaseRisk.confidence,
        confidenceCaption: CONFIDENCE_CAPTIONS[diseaseRisk.confidence],
        assessment: diseaseRisk.assessment,
        breakdown: diseaseRisk.breakdown,
        breakdownLabel: 'How we calculated this risk',
        valueHeadline: diseaseRisk.riskLevel.charAt(0).toUpperCase() + diseaseRisk.riskLevel.slice(1),
        valueVariant: diseaseRisk.riskLevel === 'high' ? 'warn' : 'default',
        valueSubLabel: `${diseaseRisk.primaryDisease} \u2014 ${diseaseRisk.riskLevel} risk`,
        otherRisks: diseaseRisk.otherRisks,
      },
      {
        index: 4,
        total: 6,
        type: 'yield_estimate',
        title: 'Expected yield',
        confidence: yieldEstimate.confidence,
        confidenceCaption: CONFIDENCE_CAPTIONS[yieldEstimate.confidence],
        assessment: yieldEstimate.assessment,
        breakdown: yieldEstimate.breakdown,
        breakdownLabel: 'How we calculated this estimate',
        valueHeadline: `${yieldEstimate.yieldPerAcreTonnes}`,
        valueUnit: ' t/acre',
        rangeLabel: `Range: ${yieldEstimate.rangeMinTonnes} \u2013 ${yieldEstimate.rangeMaxTonnes} t/acre`,
      },
      {
        index: 5,
        total: 6,
        type: 'variety_ranking',
        title: 'Variety recommendation',
        confidence: varietyRanking.confidence,
        confidenceCaption: CONFIDENCE_CAPTIONS[varietyRanking.confidence],
        assessment: varietyRanking.assessment,
        breakdown: [],
        breakdownLabel: `Ranked from your ${varietyCandidates.length} candidate${varietyCandidates.length === 1 ? '' : 's'}`,
        valueHeadline: '',
        varietyCards: varietyRanking.cards,
      },
      {
        index: 6,
        total: 6,
        type: 'price_forecast',
        title: 'Potato prices at harvest',
        confidence: priceForecast.confidence,
        confidenceCaption: CONFIDENCE_CAPTIONS[priceForecast.confidence],
        assessment: priceForecast.assessment,
        breakdown: priceForecast.breakdown,
        breakdownLabel: 'How we calculated this range',
        valueHeadline: `KES ${priceForecast.minPricePerBag.toLocaleString()}\u2013${priceForecast.maxPricePerBag.toLocaleString()}`,
        valueVariant: 'small',
        valueSubLabel: `per 90kg bag, estimated ${priceForecast.harvestMonthLabel}`,
      },
    ];

    const now = new Date();
    const reportId = `KE-${now.getFullYear()}-${uuidv4().slice(0, 5).toUpperCase()}`;

    logInfo('Farm decision report generated', {
      reportId,
      county: input.county,
      subCounty: input.subCounty,
      varietyCount: varietyCandidates.length,
      climateSource: climate.source,
    });

    return {
      summary: {
        reportId,
        generatedAtLabel: `${formatDateLong(now)}, ${now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })} EAT`,
        locationLabel: subCountyProfile?.name || input.subCounty,
        countyMetaLabel: `${input.county} County \u00b7 ${Math.abs(lat).toFixed(2)}\u00b0${lat < 0 ? 'S' : 'N'}, ${Math.abs(lng).toFixed(2)}\u00b0${lng < 0 ? 'W' : 'E'} \u00b7 ${elevationM.toLocaleString()}m`,
        fieldSizeLabel: `${round1(input.fieldSizeAcres * 0.4047)} ha`,
        waterSourceLabel: input.waterSource === 'irrigated' ? 'Irrigated' : 'Rainfed',
        varietyCandidatesLabel: orderedVarieties.map((v) => v.name).join(', '),
        seedSourceLabel: input.seedSource === 'certified' ? 'Certified' : input.seedSource === 'farm_saved' ? 'Farm-saved' : 'Not specified',
        plantingDateLabel: formatDateLong(plantingDate),
        previousCropLabel: input.previousCrop || 'Not specified',
        priorityLabel: input.priority.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        predictionCount: predictions.length,
      },
      predictions,
    };
  }

  private async resolveClimateSignal(lat: number, lng: number, plantingDate: Date): Promise<NearTermClimateSignal> {
    const daysUntilPlanting = Math.ceil((plantingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysUntilPlanting >= 0 && daysUntilPlanting <= FORECAST_HORIZON_DAYS) {
      try {
        const forecast = await weatherService.getWeatherForecast({ latitude: lat, longitude: lng }, FORECAST_HORIZON_DAYS);
        const relevantDays = forecast.forecast.slice(0, Math.max(daysUntilPlanting, 1));
        if (relevantDays.length > 0) {
          const avgHumidity = Math.round(relevantDays.reduce((sum: number, d: any) => sum + d.humidity, 0) / relevantDays.length);
          const avgRainChance = Math.round(relevantDays.reduce((sum: number, d: any) => sum + d.chanceOfRain, 0) / relevantDays.length);
          const tempMin = Math.round(Math.min(...relevantDays.map((d: any) => d.temperature.min)));
          const tempMax = Math.round(Math.max(...relevantDays.map((d: any) => d.temperature.max)));

          const seasonalNorm = getSeasonalNormForMonth(plantingDate.getMonth() + 1);

          return {
            source: 'forecast',
            avgHumidityPercent: avgHumidity,
            avgChanceOfRainPercent: avgRainChance,
            tempRangeC: [tempMin, tempMax],
            rainySeasonAlignment: seasonalNorm.rainySeasonAlignment,
            plantingSuitability: seasonalNorm.plantingSuitability,
          };
        }
      } catch (error) {
        logError('Live weather forecast unavailable for decision report, falling back to seasonal defaults', error as Error, { lat, lng });
      }
    }

    const seasonalNorm = getSeasonalNormForMonth(plantingDate.getMonth() + 1);
    return {
      source: 'seasonal_default',
      avgHumidityPercent: seasonalNorm.typicalHumidityPercent,
      avgChanceOfRainPercent: seasonalNorm.typicalChanceOfRainPercent,
      tempRangeC: [12, 22],
      rainySeasonAlignment: seasonalNorm.rainySeasonAlignment,
      plantingSuitability: seasonalNorm.plantingSuitability,
    };
  }
}

export const decisionReportService = new DecisionReportService();
export default decisionReportService;
