const mockDiagnose = jest.fn();
const mockUploadMedia = jest.fn();
const mockAssociateMedia = jest.fn();
const mockGetMediaByAssociation = jest.fn();
const mockCreateAssessment = jest.fn();
const mockFindAllAssessments = jest.fn();
const mockFindOneAssessment = jest.fn();
const mockDestroyMediaAssociation = jest.fn();

jest.mock('../../../src/services/potato-disease-detection.service', () => ({
  potatoDiseaseDetectionService: {
    diagnose: mockDiagnose
  }
}));

jest.mock('../../../src/services/enterprise-media.service', () => ({
  EnterpriseMediaService: jest.fn().mockImplementation(() => ({
    uploadMedia: mockUploadMedia,
    associateMedia: mockAssociateMedia,
    getMediaByAssociation: mockGetMediaByAssociation
  }))
}));

jest.mock('../../../src/models/PlantHealthAssessment.model', () => ({
  PlantHealthAssessmentModel: {
    create: mockCreateAssessment,
    findAll: mockFindAllAssessments,
    findOne: mockFindOneAssessment
  }
}));

jest.mock('../../../src/models/MediaAssociation.model', () => ({
  MediaAssociation: {
    destroy: mockDestroyMediaAssociation
  }
}));

jest.mock('../../../src/services/gemini/gemini-wrapper.service', () => ({
  geminiWrapper: {
    isAvailable: jest.fn(() => false),
    getHealthStatus: jest.fn(() => ({ available: false })),
    getUserHistory: jest.fn(),
    getAnalysis: jest.fn()
  }
}));

jest.mock('../../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}));

const makeFile = (): Express.Multer.File => ({
  fieldname: 'image1',
  originalname: 'potato.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  size: 12,
  buffer: Buffer.from('fake-image'),
  destination: '',
  filename: '',
  path: '',
  stream: null as any
});

const makeResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
  return res as any;
};

const diagnosisData = {
  healthStatus: {
    overall: 'diseased',
    isHealthy: false,
    healthScore: 60,
    confidence: 0.76,
    assessment: 'Early blight',
    urgency: 'medium'
  },
  diseases: [
    {
      name: 'Early blight',
      confidence: 0.76,
      severity: 'moderate',
      symptoms: ['Target spots'],
      causes: ['Alternaria solani'],
      treatment: {
        immediate: ['Remove infected leaves'],
        organic: ['Copper protectant'],
        chemical: ['Registered fungicide'],
        prevention: ['Rotate crops'],
        preventive: ['Rotate crops'],
        culturalPractices: ['Improve airflow']
      }
    }
  ],
  pests: [],
  nutritionalDeficiencies: [],
  environmentalStress: [],
  primaryConcerns: ['Early blight'],
  treatmentPriority: [{ issue: 'Early blight', priority: 2, urgency: 'medium', treatment: ['Remove infected leaves'] }],
  preventiveMeasures: ['Rotate crops'],
  followUpRecommendations: ['Scout again'],
  analysisNotes: 'Potato classifier confidence: 76%.',
  provider: 'huggingface',
  model: 'test/potato-model',
  recommendations: ['Remove infected leaves']
};

describe('EnhancedPlantController plant health persistence', () => {
  beforeEach(() => {
    mockDiagnose.mockReset();
    mockUploadMedia.mockReset();
    mockAssociateMedia.mockReset();
    mockGetMediaByAssociation.mockReset();
    mockCreateAssessment.mockReset();
    mockFindAllAssessments.mockReset();
    mockFindOneAssessment.mockReset();
    mockDestroyMediaAssociation.mockReset();
  });

  it('saves a successful diagnosis with media association and returns normalized metadata', async () => {
    const { enhancedPlantController } = await import('../../../src/controllers/enhanced-plant.controller');
    mockDiagnose.mockResolvedValue({
      success: true,
      data: diagnosisData,
      provider: 'huggingface',
      model: 'test/potato-model',
      confidence: 0.76,
      providerMetadata: { normalized: { key: 'early_blight', confidence: 0.76 } }
    });
    mockUploadMedia.mockResolvedValue({
      id: 'media-1',
      publicUrl: 'https://cdn.test/original.jpg',
      originalName: 'potato.jpg',
      variants: [{ size: 'thumbnail', url: 'https://cdn.test/thumb.jpg' }]
    });
    mockCreateAssessment.mockResolvedValue({
      id: 'analysis-1'
    });

    const req = {
      user: { id: 'user-1' },
      body: { location: 'Nakuru' },
      file: makeFile(),
      headers: {}
    } as any;
    const res = makeResponse();

    await enhancedPlantController.assessHealth(req, res);

    expect(mockDiagnose).toHaveBeenCalledWith(req.file, expect.objectContaining({ plantType: 'potato', location: 'Nakuru' }));
    expect(mockCreateAssessment).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      healthAssessmentResult: diagnosisData,
      diseases: diagnosisData.diseases,
      providerMetadata: { normalized: { key: 'early_blight', confidence: 0.76 } }
    }));
    expect(mockAssociateMedia).toHaveBeenCalledWith('media-1', expect.objectContaining({
      associatableType: 'PlantHealthAssessment',
      associatableId: 'analysis-1',
      role: 'primary'
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        analysisId: 'analysis-1',
        mediaId: 'media-1',
        provider: 'huggingface',
        confidence: 0.76
      })
    }));
  });

  it('returns a successful diagnosis and saves history when media upload fails', async () => {
    const { enhancedPlantController } = await import('../../../src/controllers/enhanced-plant.controller');
    mockDiagnose.mockResolvedValue({
      success: true,
      data: diagnosisData,
      provider: 'huggingface',
      model: 'test/potato-model',
      confidence: 0.76,
      providerMetadata: { normalized: { key: 'early_blight', confidence: 0.76 } }
    });
    mockUploadMedia.mockRejectedValue(new Error('Failed to upload media'));
    mockCreateAssessment.mockResolvedValue({
      id: 'analysis-1'
    });

    const req = {
      user: { id: 'user-1' },
      body: { location: 'Nakuru' },
      file: makeFile(),
      headers: {}
    } as any;
    const res = makeResponse();

    await enhancedPlantController.assessHealth(req, res);

    expect(mockCreateAssessment).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      imageUrl: '',
      thumbnailUrl: '',
      originalFilename: 'potato.jpg',
      healthAssessmentResult: diagnosisData
    }));
    expect(mockAssociateMedia).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        analysisId: 'analysis-1',
        mediaId: null,
        persistence: expect.objectContaining({
          mediaUploadFailed: true,
          dbSaveFailed: false,
          mediaAssociationFailed: false
        })
      }),
      metadata: expect.objectContaining({
        analysisId: 'analysis-1',
        mediaId: null,
        persistence: expect.objectContaining({
          mediaUploadFailed: true
        })
      })
    }));
  });

  it('returns a successful diagnosis when media association fails after saving history', async () => {
    const { enhancedPlantController } = await import('../../../src/controllers/enhanced-plant.controller');
    mockDiagnose.mockResolvedValue({
      success: true,
      data: diagnosisData,
      provider: 'huggingface',
      model: 'test/potato-model',
      confidence: 0.76,
      providerMetadata: { normalized: { key: 'early_blight', confidence: 0.76 } }
    });
    mockUploadMedia.mockResolvedValue({
      id: 'media-1',
      publicUrl: 'https://cdn.test/original.jpg',
      originalName: 'potato.jpg',
      variants: [{ size: 'thumbnail', url: 'https://cdn.test/thumb.jpg' }]
    });
    mockCreateAssessment.mockResolvedValue({
      id: 'analysis-1'
    });
    mockAssociateMedia.mockRejectedValue(new Error('Association failed'));

    const req = {
      user: { id: 'user-1' },
      body: { location: 'Nakuru' },
      file: makeFile(),
      headers: {}
    } as any;
    const res = makeResponse();

    await enhancedPlantController.assessHealth(req, res);

    expect(mockAssociateMedia).toHaveBeenCalledWith('media-1', expect.objectContaining({
      associatableType: 'PlantHealthAssessment',
      associatableId: 'analysis-1',
      role: 'primary'
    }));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        analysisId: 'analysis-1',
        mediaId: 'media-1',
        persistence: expect.objectContaining({
          mediaAssociationFailed: true
        })
      }),
      metadata: expect.objectContaining({
        persistence: expect.objectContaining({
          mediaUploadFailed: false,
          dbSaveFailed: false,
          mediaAssociationFailed: true
        })
      })
    }));
  });

  it('returns the diagnosis even when both media upload and history save fail', async () => {
    const { enhancedPlantController } = await import('../../../src/controllers/enhanced-plant.controller');
    mockDiagnose.mockResolvedValue({
      success: true,
      data: diagnosisData,
      provider: 'huggingface',
      model: 'test/potato-model',
      confidence: 0.76,
      providerMetadata: { normalized: { key: 'early_blight', confidence: 0.76 } }
    });
    mockUploadMedia.mockRejectedValue(new Error('Failed to upload media'));
    mockCreateAssessment.mockRejectedValue(new Error('Database unavailable'));

    const req = {
      user: { id: 'user-1' },
      body: { location: 'Nakuru' },
      file: makeFile(),
      headers: {}
    } as any;
    const res = makeResponse();

    await enhancedPlantController.assessHealth(req, res);

    expect(mockAssociateMedia).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        analysisId: null,
        mediaId: null,
        persistence: expect.objectContaining({
          mediaUploadFailed: true,
          dbSaveFailed: true
        })
      }),
      metadata: expect.objectContaining({
        analysisId: null,
        mediaId: null,
        persistence: expect.objectContaining({
          mediaUploadFailed: true,
          dbSaveFailed: true
        })
      })
    }));
  });

  it('keeps actual diagnosis provider failures as request failures', async () => {
    const { enhancedPlantController } = await import('../../../src/controllers/enhanced-plant.controller');
    mockDiagnose.mockResolvedValue({
      success: false,
      data: null,
      provider: 'huggingface',
      model: 'test/potato-model',
      confidence: 0,
      providerMetadata: { hfError: { message: 'Model unavailable' } },
      error: 'Plant health assessment failed'
    });

    const req = {
      user: { id: 'user-1' },
      body: { location: 'Nakuru' },
      file: makeFile(),
      headers: {}
    } as any;
    const res = makeResponse();

    await enhancedPlantController.assessHealth(req, res);

    expect(mockUploadMedia).not.toHaveBeenCalled();
    expect(mockCreateAssessment).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Plant health assessment failed',
      provider: 'huggingface',
      metadata: expect.objectContaining({
        providerMetadata: { hfError: { message: 'Model unavailable' } }
      })
    }));
  });

  it('returns notes in history after an update', async () => {
    const { enhancedPlantController } = await import('../../../src/controllers/enhanced-plant.controller');
    const record = {
      id: 'analysis-1',
      healthAssessmentResult: diagnosisData,
      createdAt: new Date('2026-06-01T00:00:00Z'),
      updatedAt: new Date('2026-06-01T00:00:00Z'),
      isHealthy: false,
      notes: 'North field',
      providerMetadata: { normalized: { confidence: 0.76 } }
    };
    const updatableRecord = {
      ...record,
      update: jest.fn().mockImplementation(async ({ notes }) => {
        record.notes = notes;
      })
    };
    mockFindOneAssessment.mockResolvedValue(updatableRecord);
    mockFindAllAssessments.mockResolvedValue([record]);
    mockGetMediaByAssociation.mockResolvedValue([{ id: 'media-1', publicUrl: 'https://cdn.test/original.jpg' }]);

    await enhancedPlantController.updateAnalysis(
      { user: { id: 'user-1' }, params: { id: 'analysis-1' }, body: { type: 'plant_health', notes: 'North field' }, query: {} } as any,
      makeResponse()
    );

    const historyRes = makeResponse();
    await enhancedPlantController.getHistory(
      { user: { id: 'user-1' }, query: { type: 'plant_health' } } as any,
      historyRes
    );

    expect(updatableRecord.update).toHaveBeenCalledWith({ notes: 'North field' });
    expect(historyRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      records: [
        expect.objectContaining({
          id: 'analysis-1',
          notes: 'North field',
          result: expect.objectContaining({
            analysisId: 'analysis-1',
            confidence: 0.76
          })
        })
      ]
    }));
  });

  it('parses JSON-string plant health history columns', async () => {
    const { enhancedPlantController } = await import('../../../src/controllers/enhanced-plant.controller');
    const record = {
      id: 'analysis-json-1',
      healthAssessmentResult: JSON.stringify({
        healthStatus: {
          overall: 'diseased',
          isHealthy: false,
          confidence: 0.81
        },
        diseases: [
          {
            name: 'Late blight',
            severity: 'high',
            treatment: {
              immediate: ['Remove infected leaves']
            }
          }
        ]
      }),
      diseases: JSON.stringify([{ name: 'Fallback disease' }]),
      treatmentSuggestions: JSON.stringify(['Apply fungicide according to the label']),
      createdAt: new Date('2026-06-02T00:00:00Z'),
      updatedAt: new Date('2026-06-02T00:00:00Z'),
      isHealthy: false,
      notes: null,
      providerMetadata: JSON.stringify({ normalized: { confidence: 0.81 } })
    };

    mockFindAllAssessments.mockResolvedValue([record]);
    mockGetMediaByAssociation.mockResolvedValue([]);

    const historyRes = makeResponse();
    await enhancedPlantController.getHistory(
      { user: { id: 'user-1' }, query: { type: 'plant_health' } } as any,
      historyRes
    );

    expect(historyRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      records: [
        expect.objectContaining({
          id: 'analysis-json-1',
          result: expect.objectContaining({
            diseases: [
              expect.objectContaining({
                name: 'Late blight',
                severity: 'high'
              })
            ],
            treatmentSuggestions: ['Apply fungicide according to the label'],
            confidence: 0.81
          })
        })
      ]
    }));
  });

  it('deletes an assessment and its media association', async () => {
    const { enhancedPlantController } = await import('../../../src/controllers/enhanced-plant.controller');
    const destroy = jest.fn().mockResolvedValue(undefined);
    mockFindOneAssessment.mockResolvedValue({ id: 'analysis-1', destroy });
    mockDestroyMediaAssociation.mockResolvedValue(1);
    const res = makeResponse();

    await enhancedPlantController.deleteAnalysis(
      { user: { id: 'user-1' }, params: { id: 'analysis-1' }, query: { type: 'plant_health' } } as any,
      res
    );

    expect(mockDestroyMediaAssociation).toHaveBeenCalledWith({
      where: {
        associatableType: 'PlantHealthAssessment',
        associatableId: 'analysis-1'
      }
    });
    expect(destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Analysis deleted successfully'
    });
  });
});

export {};
