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
      'No clear blight spots are visible',
      'No obvious dead or spreading brown patches are detected'
    ],
    causes: [
      'No disease cause detected from the supplied image'
    ],
    treatment: {
      immediate: [
        'Continue regular scouting, especially after rain or heavy dew',
        'Remove any leaves that later show spreading spots or wet-looking patches'
      ],
      organic: [
        'Use compost and balanced nutrition to keep plants vigorous',
        'Use approved copper sprays only when blight risk is high in your area'
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
        'Avoid planting potatoes in the same field season after season',
        'Remove potatoes that grow on their own from last season and throw away rotten tubers'
      ]
    },
    healthScore: 92,
    urgency: 'none'
  },
  early_blight: {
    key: 'early_blight',
    name: 'Early blight',
    scientificName: 'Alternaria solani',
    description: 'Early blight is a potato leaf disease that often starts on older lower leaves. If many leaves dry up, the crop can give a lower yield.',
    severity: 'moderate',
    symptoms: [
      'Brown leaf spots with concentric ring or target-like patterns',
      'Yellowing around older leaf spots',
      'Lower leaves affected before the top leaves',
      'Spots become dry and the leaf tissue dies as they grow'
    ],
    causes: [
      'Disease germs surviving on old potato leaves, stems, or potatoes growing from last season',
      'Leaf wetness from rain, dew, or overhead irrigation',
      'Plant stress from poor nutrition, drought, or crop age'
    ],
    treatment: {
      immediate: [
        'Remove heavily infected lower leaves where practical',
        'Avoid working in the crop while foliage is wet',
        'Improve airflow by avoiding overcrowding'
      ],
      organic: [
        'Apply approved copper or biological disease-control sprays before the disease spreads far',
        'Use compost tea or biological products only as support; do not rely on them alone when disease is spreading',
        'Mulch to reduce soil splash onto lower leaves'
      ],
      chemical: [
        'Use a registered potato blight fungicide where permitted, such as products recommended by a qualified agrovet',
        'Do not use the same fungicide type every time; alternate products as advised to keep them working',
        'Follow the label, especially the dose and the waiting time before harvest'
      ],
      prevention: [
        'Rotate fields for at least two seasons away from potato, tomato, and related crops',
        'Remove old potato plant remains and potatoes growing on their own from last season',
        'Maintain balanced fertility, especially potassium and nitrogen',
        'Start preventive sprays before disease builds during warm, humid periods'
      ],
      preventive: [
        'Rotate fields for at least two seasons away from potato, tomato, and related crops',
        'Remove old potato plant remains and potatoes growing on their own from last season',
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
      'Wet-looking dark spots on leaves or stems',
      'Rapidly expanding brown to black patches',
      'Pale green edges around new spots',
      'White fuzzy growth on leaf undersides in humid conditions'
    ],
    causes: [
      'Disease germs from infected seed potatoes, potatoes growing from last season, rotten tuber piles, or nearby fields',
      'Cool wet weather, high humidity, rain, mist, or prolonged dew',
      'Crowded plants and poor airflow'
    ],
    treatment: {
      immediate: [
        'Act urgently; late blight can spread through a field in days',
        'Remove and destroy severely infected plants if infection is localized',
        'Do not compost infected foliage',
        'Avoid overhead irrigation and field work while wet'
      ],
      organic: [
        'Use approved copper sprays early and repeat according to the label during wet periods',
        'Remove infected potatoes growing from last season and rotten tuber piles immediately',
        'Improve drainage and airflow where possible'
      ],
      chemical: [
        'Apply a registered late-blight fungicide promptly through a qualified agrovet or extension recommendation',
        'Use products recommended for active late blight when labels permit',
        'Alternate fungicide types as advised and follow the waiting time before harvest'
      ],
      prevention: [
        'Plant certified disease-free seed',
        'Destroy potatoes growing from last season and rotten tuber piles',
        'Use resistant varieties where locally available',
        'Begin preventive fungicide programs when local late-blight alerts or wet weather indicate high risk'
      ],
      preventive: [
        'Plant certified disease-free seed',
        'Destroy potatoes growing from last season and rotten tuber piles',
        'Use resistant varieties where locally available'
      ],
      culturalPractices: [
        'Increase spacing and avoid overcrowded plants',
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
        'Use approved biological or copper sprays only after confirming disease risk'
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
        'Remove potatoes that grow on their own from last season',
        'Keep records of symptom spread'
      ]
    },
    healthScore: 58,
    urgency: 'medium'
  }
};

export class PotatoDiseaseDetectionService {
  private geminiHealthServices = new Map<string, PlantHealthService>();

  private isGeminiEnabled(): boolean {
    return !!env.GEMINI_API_KEY && process.env.USE_GEMINI !== 'false';
  }

  private getGeminiUnavailableReason(): string {
    if (!env.GEMINI_API_KEY) return 'GEMINI_API_KEY not configured';
    if (process.env.USE_GEMINI === 'false') return 'USE_GEMINI=false';
    return 'Gemini service unavailable';
  }

  private getGeminiModelChain(): string[] {
    return [
      process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash'
    ].filter((model, index, models) => model && models.indexOf(model) === index);
  }

  private serializeError(error: any): Record<string, any> {
    const serialized: Record<string, any> = {
      message: error?.message || String(error)
    };

    if (error?.name) serialized.name = error.name;
    if (error?.status) serialized.status = error.status;
    if (error?.payload) serialized.payload = error.payload;
    if (error?.hint) serialized.hint = error.hint;

    const cause = error?.cause;
    if (cause) {
      serialized.cause = {
        message: cause.message || String(cause),
        name: cause.name,
        code: cause.code,
        errno: cause.errno,
        syscall: cause.syscall,
        hostname: cause.hostname,
        host: cause.host,
        port: cause.port
      };
    }

    return serialized;
  }

  async diagnose(
    file: Express.Multer.File,
    options: PotatoDiagnosisOptions = {}
  ): Promise<PotatoDiagnosisResult> {
    const startedAt = Date.now();
    const hfMetadata: Record<string, any> = {
      model: env.HF_POTATO_MODEL_ID,
      endpoint: this.buildHuggingFaceUrl(),
      minConfidence: env.HF_POTATO_MIN_CONFIDENCE,
      highConfidence: env.HF_POTATO_HIGH_CONFIDENCE,
      timeoutMs: env.HF_POTATO_TIMEOUT_MS,
      configured: !!env.HF_API_TOKEN,
      enabled: env.USE_HUGGINGFACE
    };

    if (!env.USE_HUGGINGFACE) {
      const geminiDiagnosis = await this.diagnoseWithGemini(file, options, {
        reason: 'huggingface_disabled',
        hfMetadata: {
          ...hfMetadata,
          skipped: true,
          skipReason: 'USE_HUGGINGFACE is not enabled.'
        }
      });

      if (geminiDiagnosis.success) {
        return {
          ...geminiDiagnosis,
          providerMetadata: {
            ...geminiDiagnosis.providerMetadata,
            processingTime: Date.now() - startedAt
          }
        };
      }

      return this.buildFailureResult(
        'Gemini diagnosis was unavailable while Hugging Face was disabled.',
        startedAt,
        {
          ...hfMetadata,
          fallbackReason: 'huggingface_disabled',
          hfSkipped: true,
          geminiError: geminiDiagnosis.error,
          geminiAttemptedModels: geminiDiagnosis.providerMetadata?.geminiAttemptedModels,
          geminiErrors: geminiDiagnosis.providerMetadata?.geminiErrors
        }
      );
    }

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
            geminiError: geminiFallback.error,
            geminiAttemptedModels: geminiFallback.providerMetadata?.geminiAttemptedModels,
            geminiErrors: geminiFallback.providerMetadata?.geminiErrors
          }
        );
      }
    } catch (error: any) {
      logError('Hugging Face potato diagnosis failed; trying Gemini fallback', error, {
        model: env.HF_POTATO_MODEL_ID
      });

      const hfError = this.serializeError(error);

      const geminiFallback = await this.diagnoseWithGemini(file, options, {
        reason: 'huggingface_error',
        hfError,
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
          hfError,
          geminiError: geminiFallback.error,
          geminiAttemptedModels: geminiFallback.providerMetadata?.geminiAttemptedModels,
          geminiErrors: geminiFallback.providerMetadata?.geminiErrors
        }
      );
    }
  }

  private async classifyWithHuggingFace(file: Express.Multer.File): Promise<HuggingFacePrediction[]> {
    if (!env.HF_API_TOKEN) {
      const error: any = new Error('HF_API_TOKEN not configured');
      error.status = 'missing_configuration';
      throw error;
    }

    const imageBody = file.buffer.buffer.slice(
      file.buffer.byteOffset,
      file.buffer.byteOffset + file.buffer.byteLength
    );

    const response = await fetch(
      this.buildHuggingFaceUrl(),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.HF_API_TOKEN}`,
          'Content-Type': file.mimetype || 'application/octet-stream'
        },
        body: imageBody,
        signal: AbortSignal.timeout(env.HF_POTATO_TIMEOUT_MS)
      }
    );

    const payload: any = await response.json().catch(async () => response.text());

    if (!response.ok) {
      const message = typeof payload === 'string' ? payload : payload?.error || response.statusText;
      const error: any = new Error(`Hugging Face API error ${response.status}: ${message}`);
      error.status = response.status;
      error.payload = payload;
      if (
        response.status === 400 &&
        typeof message === 'string' &&
        message.toLowerCase().includes('not supported by provider')
      ) {
        error.hint = 'This Hugging Face model is not supported by the configured router provider. Choose a router-supported image-classification model or deploy this model as a dedicated Hugging Face Inference Endpoint and set HF_POTATO_ENDPOINT_URL.';
      }
      throw error;
    }

    const predictions = Array.isArray(payload) ? payload : payload?.[0];
    if (!Array.isArray(predictions)) {
      const error: any = new Error('Unexpected Hugging Face response format');
      error.payload = payload;
      throw error;
    }

    return predictions
      .filter((item: any) => typeof item?.label === 'string' && typeof item?.score === 'number')
      .map((item: any) => ({
        label: item.label,
        score: item.score > 1 ? item.score / 100 : item.score
      }))
      .sort((a, b) => b.score - a.score);
  }

  private buildHuggingFaceUrl(): string {
    if (env.HF_POTATO_ENDPOINT_URL) {
      return env.HF_POTATO_ENDPOINT_URL;
    }

    return `${env.HF_INFERENCE_BASE_URL.replace(/\/+$/g, '')}/${env.HF_POTATO_MODEL_ID}`;
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
            expectedOutcome: 'Better control is estimated when action starts early and wet-leaf periods are reduced.'
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
    const geminiModels = this.getGeminiModelChain();

    if (!this.isGeminiEnabled()) {
      return {
        success: false,
        provider: 'gemini',
        model: geminiModels[0],
        providerMetadata: {
          ...metadata,
          geminiConfigured: !!env.GEMINI_API_KEY,
          geminiEnabled: false,
          geminiDisabledReason: this.getGeminiUnavailableReason(),
          geminiModel: geminiModels[0],
          geminiAttemptedModels: geminiModels
        },
        error: this.getGeminiUnavailableReason()
      };
    }

    const geminiErrors: Array<{ model: string; error: string }> = [];

    for (const model of geminiModels) {
      const gemini = this.getGeminiHealthService(model);
      if (!gemini) {
        geminiErrors.push({ model, error: 'Gemini service unavailable' });
        continue;
      }

      const result = await gemini.assessPlantHealth(file.buffer, {
        plantType: options.plantType || 'potato',
        region: options.location || 'Central Kenya',
        symptomDescription: options.symptoms,
        additionalContext: 'Hugging Face potato classifier was unavailable or low-confidence. Diagnose potato disease from the image and return JSON in the expected schema.'
      });

      if (!result.success || !result.data) {
        geminiErrors.push({
          model: result.modelVersion || model,
          error: result.error || 'Gemini diagnosis failed'
        });
        continue;
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
          geminiConfigured: !!env.GEMINI_API_KEY,
          geminiEnabled: true,
          geminiModel: result.modelVersion,
          geminiAttemptedModels: geminiModels,
          geminiErrors,
          geminiProcessingTime: result.processingTime
        }
      };
    }

    return {
      success: false,
      provider: 'gemini',
      model: geminiModels[geminiModels.length - 1] || 'gemini-2.5-flash-lite',
      providerMetadata: {
        ...metadata,
        geminiConfigured: !!env.GEMINI_API_KEY,
        geminiEnabled: true,
        geminiModel: geminiModels[geminiModels.length - 1] || 'gemini-2.5-flash-lite',
        geminiAttemptedModels: geminiModels,
        geminiErrors
      },
      error: geminiErrors[geminiErrors.length - 1]?.error || 'Gemini diagnosis failed'
    };
  }

  private getGeminiHealthService(model: string): PlantHealthService | null {
    if (!this.isGeminiEnabled()) return null;

    if (!this.geminiHealthServices.has(model)) {
      this.geminiHealthServices.set(model, new PlantHealthService({
        apiKey: env.GEMINI_API_KEY!,
        model: model as any,
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.25'),
        maxOutputTokens: parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '3072')
      }));
    }

    return this.geminiHealthServices.get(model) || null;
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
    const geminiModels = this.getGeminiModelChain();

    return {
      success: false,
      provider: 'gemini',
      model: geminiModels[0],
      confidence: metadata?.normalized?.confidence || 0,
      providerMetadata: {
        ...metadata,
        geminiConfigured: !!env.GEMINI_API_KEY,
        geminiEnabled: this.isGeminiEnabled(),
        geminiDisabledReason: this.isGeminiEnabled() ? undefined : this.getGeminiUnavailableReason(),
        geminiModel: geminiModels[0],
        geminiAttemptedModels: metadata.geminiAttemptedModels || geminiModels,
        geminiErrors: metadata.geminiErrors,
        processingTime: Date.now() - startedAt
      },
      error
    };
  }
}

export const potatoDiseaseDetectionService = new PotatoDiseaseDetectionService();
