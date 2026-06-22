import { env } from '../config/environment';
import { logError } from '../utils/logger';
import { PlantHealthService, PlantHealthResponse } from './gemini/plant-health.service';

type PotatoDiseaseKey = 'healthy' | 'early_blight' | 'late_blight' | 'unknown';
type DiagnosisProvider = 'huggingface' | 'gemini';

interface HuggingFacePrediction {
  label: string;
  score: number;
}

interface PotatoRule {
  key: PotatoDiseaseKey;
  name: string;
  scientificName?: string;
  description: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  symptoms: string[];
  causes: string[];
  treatment: {
    immediate: string[];
    organic: string[];
    chemical: string[];
    prevention: string[];
    preventive: string[];
    culturalPractices: string[];
  };
  healthScore: number;
  urgency: 'none' | 'low' | 'medium' | 'high' | 'emergency';
}

export interface PotatoDiagnosisOptions {
  latitude?: string | number;
  longitude?: string | number;
  plantType?: string;
  location?: string;
  symptoms?: string;
}

export interface PotatoDiagnosisResult {
  success: boolean;
  data?: PlantHealthResponse & {
    provider?: DiagnosisProvider;
    model?: string;
    recommendations?: string[];
  };
  provider: DiagnosisProvider;
  model: string;
  confidence?: number;
  providerMetadata: Record<string, any>;
  error?: string;
}

const POTATO_RULES: Record<PotatoDiseaseKey, PotatoRule> = {
  healthy: {
    key: 'healthy',
    name: 'Healthy potato plant',
    description: 'The visible potato foliage does not show clear disease symptoms in this image.',
    severity: 'low',
    symptoms: [
      'Leaves appear generally green and intact',
      'No strong blight lesions are visible',
      'No obvious spreading necrotic patches are detected'
    ],
    causes: [
      'No disease cause detected from the supplied image'
    ],
    treatment: {
      immediate: [
        'Continue regular scouting, especially after rain or heavy dew',
        'Remove any leaves that later show spreading spots or water-soaked lesions'
      ],
      organic: [
        'Use compost and balanced nutrition to keep plants vigorous',
        'Apply approved copper-based protectants only when disease pressure is high'
      ],
      chemical: [
        'No curative fungicide is recommended from this image alone',
        'Use a preventive fungicide program only if local blight pressure is confirmed'
      ],
      prevention: [
        'Use certified seed potato',
        'Avoid overhead irrigation late in the day',
        'Keep enough spacing for airflow',
        'Scout lower leaves twice per week in wet weather'
      ],
      preventive: [
        'Use certified seed potato',
        'Avoid overhead irrigation late in the day',
        'Keep enough spacing for airflow'
      ],
      culturalPractices: [
        'Rotate away from potato and other solanaceous crops',
        'Destroy volunteer potato plants and cull piles'
      ]
    },
    healthScore: 92,
    urgency: 'none'
  },
  early_blight: {
    key: 'early_blight',
    name: 'Early blight',
    scientificName: 'Alternaria solani',
    description: 'Early blight is a fungal potato disease that commonly starts on older leaves and can reduce yield when foliage loss becomes severe.',
    severity: 'moderate',
    symptoms: [
      'Brown leaf spots with concentric ring or target-like patterns',
      'Yellowing around older leaf lesions',
      'Lower leaves affected before upper canopy',
      'Dry, brittle necrotic tissue as spots expand'
    ],
    causes: [
      'Alternaria solani spores surviving on crop debris or infected volunteer plants',
      'Leaf wetness from rain, dew, or overhead irrigation',
      'Plant stress from poor nutrition, drought, or crop age'
    ],
    treatment: {
      immediate: [
        'Remove heavily infected lower leaves where practical',
        'Avoid working in the crop while foliage is wet',
        'Improve airflow around the canopy'
      ],
      organic: [
        'Apply approved copper or Bacillus-based fungicides as protectants',
        'Use compost tea or biological products only as support, not as a rescue treatment',
        'Mulch to reduce soil splash onto lower leaves'
      ],
      chemical: [
        'Use a registered protectant fungicide such as mancozeb or chlorothalonil where permitted',
        'Rotate fungicide groups to reduce resistance risk',
        'Follow local label rates, pre-harvest intervals, and extension guidance'
      ],
      prevention: [
        'Rotate fields for at least two seasons away from potato, tomato, and related crops',
        'Remove crop debris and volunteer potatoes',
        'Maintain balanced fertility, especially potassium and nitrogen',
        'Start protectant sprays before disease builds during warm, humid periods'
      ],
      preventive: [
        'Rotate fields for at least two seasons away from potato, tomato, and related crops',
        'Remove crop debris and volunteer potatoes',
        'Maintain balanced fertility'
      ],
      culturalPractices: [
        'Space plants to improve airflow',
        'Irrigate early in the day',
        'Hill soil carefully to reduce tuber exposure'
      ]
    },
    healthScore: 62,
    urgency: 'medium'
  },
  late_blight: {
    key: 'late_blight',
    name: 'Late blight',
    scientificName: 'Phytophthora infestans',
    description: 'Late blight is an aggressive potato disease that can spread quickly in cool, wet conditions and needs urgent management.',
    severity: 'high',
    symptoms: [
      'Water-soaked dark lesions on leaves or stems',
      'Rapidly expanding brown to black patches',
      'Pale green margins around fresh lesions',
      'White fuzzy growth on leaf undersides in humid conditions'
    ],
    causes: [
      'Phytophthora infestans spores from infected seed, volunteers, cull piles, or nearby fields',
      'Cool wet weather, high humidity, rain, mist, or prolonged dew',
      'Dense canopy and poor airflow'
    ],
    treatment: {
      immediate: [
        'Act urgently; late blight can spread through a field in days',
        'Remove and destroy severely infected plants if infection is localized',
        'Do not compost infected foliage',
        'Avoid overhead irrigation and field work while wet'
      ],
      organic: [
        'Use approved copper protectants early and repeat according to label during wet periods',
        'Remove infected volunteers and cull piles immediately',
        'Improve drainage and airflow where possible'
      ],
      chemical: [
        'Apply a registered late-blight fungicide promptly through a qualified agrovet or extension recommendation',
        'Use systemic or translaminar products where disease pressure is active and labels permit',
        'Rotate fungicide modes of action and observe pre-harvest intervals'
      ],
      prevention: [
        'Plant certified disease-free seed',
        'Destroy volunteer potatoes and cull piles',
        'Use resistant varieties where locally available',
        'Begin preventive fungicide programs when local late-blight alerts or wet weather indicate high risk'
      ],
      preventive: [
        'Plant certified disease-free seed',
        'Destroy volunteer potatoes and cull piles',
        'Use resistant varieties where locally available'
      ],
      culturalPractices: [
        'Increase spacing and avoid dense canopy',
        'Irrigate early in the day only when needed',
        'Harvest only after vines are dead and skins are set'
      ]
    },
    healthScore: 38,
    urgency: 'high'
  },
  unknown: {
    key: 'unknown',
    name: 'Possible potato disease',
    description: 'The image may show a potato health issue, but the disease could not be classified with enough confidence.',
    severity: 'moderate',
    symptoms: [
      'Visible plant stress or leaf damage may be present',
      'The pattern is not distinctive enough for a confident potato disease match'
    ],
    causes: [
      'Disease, pest injury, nutrient stress, water stress, or image quality limitations'
    ],
    treatment: {
      immediate: [
        'Retake a clear close-up photo of affected leaves in natural light',
        'Photograph both upper and lower leaf surfaces',
        'Isolate heavily affected plants if symptoms are spreading quickly'
      ],
      organic: [
        'Remove badly affected leaves only when disease is localized',
        'Improve airflow and avoid wetting foliage',
        'Use approved biological or copper protectants only after confirming disease pressure'
      ],
      chemical: [
        'Do not apply a curative chemical based on this low-confidence result alone',
        'Consult a local extension officer or qualified agrovet before spraying'
      ],
      prevention: [
        'Use certified seed',
        'Rotate fields',
        'Scout regularly after wet weather',
        'Keep crop nutrition balanced'
      ],
      preventive: [
        'Use certified seed',
        'Rotate fields',
        'Scout regularly after wet weather'
      ],
      culturalPractices: [
        'Avoid overhead irrigation',
        'Remove volunteer potatoes',
        'Keep records of symptom spread'
      ]
    },
    healthScore: 58,
    urgency: 'medium'
  }
};

export class PotatoDiseaseDetectionService {
  private geminiHealthService: PlantHealthService | null = null;

  async diagnose(
    file: Express.Multer.File,
    options: PotatoDiagnosisOptions = {}
  ): Promise<PotatoDiagnosisResult> {
    const startedAt = Date.now();
    const hfMetadata: Record<string, any> = {
      model: env.HF_POTATO_MODEL_ID,
      minConfidence: env.HF_POTATO_MIN_CONFIDENCE,
      highConfidence: env.HF_POTATO_HIGH_CONFIDENCE
    };

    try {
      const hfPredictions = await this.classifyWithHuggingFace(file);
      const normalized = this.normalizePrediction(hfPredictions);
      hfMetadata.predictions = hfPredictions;
      hfMetadata.normalized = normalized;

      if (normalized.key !== 'unknown' && normalized.confidence >= env.HF_POTATO_MIN_CONFIDENCE) {
        const diagnosis = this.ensureFrontendFields(this.buildRuleDiagnosis(normalized.key, normalized.confidence));
        const provider: DiagnosisProvider = 'huggingface';

        return {
          success: true,
          data: {
            ...diagnosis,
            provider,
            model: env.HF_POTATO_MODEL_ID,
            recommendations: this.collectRecommendations(diagnosis)
          },
          provider,
          model: env.HF_POTATO_MODEL_ID,
          confidence: normalized.confidence,
          providerMetadata: {
            ...hfMetadata,
            processingTime: Date.now() - startedAt,
            fallbackUsed: false,
            ruleSetApplied: normalized.key
          }
        };
      }

      {
        const geminiFallback = await this.diagnoseWithGemini(file, options, {
          reason: normalized.key === 'unknown' ? 'unknown_huggingface_label' : 'low_confidence_huggingface',
          hfMetadata
        });

        if (geminiFallback.success) {
          return geminiFallback;
        }

        return this.buildFailureResult(
          normalized.key === 'unknown'
            ? 'Hugging Face returned an unsupported potato disease label and Gemini fallback was unavailable.'
            : 'Hugging Face confidence was below 70% and Gemini fallback was unavailable.',
          startedAt,
          {
            ...hfMetadata,
            fallbackReason: geminiFallback.error,
            geminiError: geminiFallback.error
          }
        );
      }
    } catch (error: any) {
      logError('Hugging Face potato diagnosis failed; trying Gemini fallback', error, {
        model: env.HF_POTATO_MODEL_ID
      });

      const geminiFallback = await this.diagnoseWithGemini(file, options, {
        reason: 'huggingface_error',
        hfError: error.message,
        hfMetadata
      });

      if (geminiFallback.success) {
        return geminiFallback;
      }

      return this.buildFailureResult(
        'Hugging Face failed and Gemini fallback was unavailable.',
        startedAt,
        {
          ...hfMetadata,
          fallbackReason: 'hf_and_gemini_unavailable',
          hfError: error.message,
          geminiError: geminiFallback.error
        }
      );
    }
  }

  private async classifyWithHuggingFace(file: Express.Multer.File): Promise<HuggingFacePrediction[]> {
    if (!env.HF_API_TOKEN) {
      throw new Error('HF_API_TOKEN not configured');
    }

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${env.HF_POTATO_MODEL_ID}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.HF_API_TOKEN}`,
          'Content-Type': file.mimetype || 'application/octet-stream'
        },
        body: file.buffer
      }
    );

    const payload: any = await response.json().catch(async () => response.text());

    if (!response.ok) {
      const message = typeof payload === 'string' ? payload : payload?.error || response.statusText;
      throw new Error(`Hugging Face API error ${response.status}: ${message}`);
    }

    const predictions = Array.isArray(payload) ? payload : payload?.[0];
    if (!Array.isArray(predictions)) {
      throw new Error('Unexpected Hugging Face response format');
    }

    return predictions
      .filter((item: any) => typeof item?.label === 'string' && typeof item?.score === 'number')
      .map((item: any) => ({
        label: item.label,
        score: item.score > 1 ? item.score / 100 : item.score
      }))
      .sort((a, b) => b.score - a.score);
  }

  private normalizePrediction(predictions: HuggingFacePrediction[]): { key: PotatoDiseaseKey; confidence: number; label?: string } {
    const top = predictions[0];
    if (!top) {
      return { key: 'unknown', confidence: 0 };
    }

    const label = top.label.toLowerCase().replace(/[_-]+/g, ' ');
    let key: PotatoDiseaseKey = 'unknown';

    if (label.includes('healthy')) key = 'healthy';
    if (label.includes('early') || label.includes('alternaria')) key = 'early_blight';
    if (label.includes('late') || label.includes('phytophthora')) key = 'late_blight';

    return {
      key,
      confidence: top.score,
      label: top.label
    };
  }

  private buildRuleDiagnosis(key: PotatoDiseaseKey, confidence: number): PlantHealthResponse {
    const rule = POTATO_RULES[key] || POTATO_RULES.unknown;
    const isHealthy = rule.key === 'healthy';

    return {
      healthStatus: {
        overall: isHealthy ? 'healthy' : rule.severity === 'critical' ? 'severely_compromised' : 'diseased',
        isHealthy,
        healthScore: rule.healthScore,
        confidence,
        assessment: rule.description,
        urgency: rule.urgency
      },
      diseases: [
        {
          name: rule.name,
          scientificName: rule.scientificName,
          commonNames: [rule.name],
          type: rule.key === 'late_blight' ? 'fungal' : rule.key === 'early_blight' ? 'fungal' : 'unknown',
          severity: rule.severity,
          confidence,
          symptoms: rule.symptoms,
          description: rule.description,
          causes: rule.causes,
          affectedParts: ['leaves', 'stems'],
          stages: ['vegetative', 'flowering', 'mature'],
          treatment: rule.treatment,
          prognosis: {
            treatability: rule.key === 'late_blight' ? 'difficult' : 'moderate',
            timeline: rule.key === 'late_blight' ? 'Act within 24 hours' : 'Review within 3-5 days',
            expectedOutcome: 'Better control is expected when action starts early and wet-leaf periods are reduced.'
          },
          similarDiseases: rule.key === 'early_blight' ? ['Late blight', 'Nutrient stress'] : ['Early blight', 'Bacterial wilt'],
          regionalConsiderations: 'In Kenya potato areas, wet and humid periods increase blight pressure.'
        }
      ],
      pests: [],
      nutritionalDeficiencies: [],
      environmentalStress: [],
      primaryConcerns: isHealthy ? ['No visible potato disease detected'] : [rule.name],
      treatmentPriority: isHealthy ? [] : [
        {
          issue: rule.name,
          priority: rule.key === 'late_blight' ? 1 : 2,
          urgency: rule.urgency,
          treatment: rule.treatment.immediate
        }
      ],
      preventiveMeasures: rule.treatment.prevention,
      followUpRecommendations: [
        'Scout nearby plants for similar symptoms',
        'Retake photos after 3-5 days or sooner if symptoms spread',
        'Consult local extension support for chemical choices and label guidance'
      ],
      analysisNotes: confidence > 0
        ? `Potato classifier confidence: ${Math.round(confidence * 100)}%.`
        : 'Classifier confidence unavailable; use this as a cautious baseline diagnosis.',
      regionalFactors: 'Recommendations are oriented for smallholder potato production in Kenya.'
    };
  }

  private async diagnoseWithGemini(
    file: Express.Multer.File,
    options: PotatoDiagnosisOptions,
    metadata: Record<string, any>
  ): Promise<PotatoDiagnosisResult> {
    if (!env.GEMINI_API_KEY || process.env.USE_GEMINI !== 'true') {
      return {
        success: false,
        provider: 'gemini',
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        providerMetadata: metadata,
        error: 'Gemini not configured'
      };
    }

    const gemini = this.getGeminiHealthService();
    if (!gemini) {
      return {
        success: false,
        provider: 'gemini',
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        providerMetadata: metadata,
        error: 'Gemini service unavailable'
      };
    }

    const result = await gemini.assessPlantHealth(file.buffer, {
      plantType: options.plantType || 'potato',
      region: options.location || 'Central Kenya',
      symptomDescription: options.symptoms,
      additionalContext: 'Hugging Face potato classifier was unavailable or low-confidence. Diagnose potato disease from the image and return JSON in the expected schema.'
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        provider: 'gemini',
        model: result.modelVersion,
        providerMetadata: metadata,
        error: result.error || 'Gemini diagnosis failed'
      };
    }

    const normalized = this.ensureFrontendFields(result.data);
    return {
      success: true,
      data: {
        ...normalized,
        provider: 'gemini',
        model: result.modelVersion,
        recommendations: this.collectRecommendations(normalized)
      },
      provider: 'gemini',
      model: result.modelVersion,
      confidence: normalized.healthStatus?.confidence,
      providerMetadata: {
        ...metadata,
        geminiModel: result.modelVersion,
        geminiProcessingTime: result.processingTime
      }
    };
  }

  private getGeminiHealthService(): PlantHealthService | null {
    if (!env.GEMINI_API_KEY) return null;

    if (!this.geminiHealthService) {
      this.geminiHealthService = new PlantHealthService({
        apiKey: env.GEMINI_API_KEY,
        model: (process.env.GEMINI_MODEL as any) || 'gemini-2.5-flash',
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.25'),
        maxOutputTokens: parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '8192')
      });
    }

    return this.geminiHealthService;
  }

  private ensureFrontendFields(data: PlantHealthResponse): PlantHealthResponse {
    const diseases = (data.diseases || []).map((disease: any) => ({
      ...disease,
      commonNames: disease.commonNames || [disease.name].filter(Boolean),
      symptoms: Array.isArray(disease.symptoms) ? disease.symptoms : [],
      causes: Array.isArray(disease.causes) ? disease.causes : [],
      treatment: {
        immediate: disease.treatment?.immediate || [],
        organic: disease.treatment?.organic || [],
        chemical: disease.treatment?.chemical || [],
        prevention: disease.treatment?.prevention || disease.treatment?.preventive || [],
        preventive: disease.treatment?.preventive || disease.treatment?.prevention || [],
        culturalPractices: disease.treatment?.culturalPractices || []
      }
    }));

    return {
      ...data,
      diseases,
      pests: data.pests || [],
      nutritionalDeficiencies: data.nutritionalDeficiencies || [],
      environmentalStress: data.environmentalStress || [],
      primaryConcerns: data.primaryConcerns || diseases.map((d: any) => d.name),
      treatmentPriority: data.treatmentPriority || [],
      preventiveMeasures: data.preventiveMeasures || diseases[0]?.treatment?.prevention || [],
      followUpRecommendations: data.followUpRecommendations || [],
      analysisNotes: data.analysisNotes || 'Diagnosis completed.'
    };
  }

  private collectRecommendations(data: PlantHealthResponse): string[] {
    const disease = data.diseases?.[0];
    return [
      ...(disease?.treatment?.immediate || []),
      ...(disease?.treatment?.organic || []),
      ...(disease?.treatment?.chemical || []),
      ...(disease?.treatment?.prevention || []),
      ...(data.followUpRecommendations || [])
    ].filter(Boolean).slice(0, 12);
  }

  private buildFailureResult(
    error: string,
    startedAt: number,
    metadata: Record<string, any>
  ): PotatoDiagnosisResult {
    return {
      success: false,
      provider: 'gemini',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      confidence: metadata?.normalized?.confidence || 0,
      providerMetadata: {
        ...metadata,
        processingTime: Date.now() - startedAt
      },
      error
    };
  }
}

export const potatoDiseaseDetectionService = new PotatoDiseaseDetectionService();
