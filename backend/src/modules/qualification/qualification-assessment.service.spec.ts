import { QualificationAssessmentService } from './qualification-assessment.service';

describe('QualificationAssessmentService', () => {
  const assessment = {
    evidenceStatus: 'VALIDATED',
    route: 'NEEDS_REVIEW',
    confidence: 96,
    identityConfidence: null,
    documentAuthenticityConfidence: null,
    faceMatchConfidence: null,
    livenessConfidence: null,
    reasonCodes: ['DOCUMENT_VALID', 'HUMAN_REVIEW_REQUIRED'],
    provider: 'TYPHOON_OCR',
    model: 'typhoon-model',
    assessedAt: new Date('2026-07-30T00:00:00.000Z'),
  } as const;
  const tx = {
    kycDocument: { update: jest.fn() },
    qualificationEvaluation: { create: jest.fn() },
  };
  const prisma = {
    kycDocument: { findFirst: jest.fn() },
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  } as any;
  const verification = { assessStoredDocument: jest.fn() } as any;
  const service = new QualificationAssessmentService(prisma, verification);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.kycDocument.findFirst.mockResolvedValue({
      id: 'document-1',
      checksumSha256: 'checksum-1',
    });
    verification.assessStoredDocument.mockResolvedValue(assessment);
    tx.kycDocument.update.mockResolvedValue({ id: 'document-1' });
    tx.qualificationEvaluation.create.mockResolvedValue({ id: 'evaluation-1' });
  });

  it('persists document state and one immutable evaluation atomically', async () => {
    const result = await service.assessDocument({
      submissionId: 'submission-1',
      documentId: 'document-1',
      registeredName: 'Suppadesh Fungprasertsuk',
    });

    expect(result).toEqual(assessment);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.kycDocument.update).toHaveBeenCalledWith({
      where: { id: 'document-1' },
      data: expect.objectContaining({
        evidenceStatus: 'VALIDATED',
        assessmentReasonCodes: assessment.reasonCodes,
        assessedAt: assessment.assessedAt,
      }),
    });
    expect(tx.qualificationEvaluation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        submissionId: 'submission-1',
        provider: 'TYPHOON_OCR',
        model: 'typhoon-model',
        inputHash: 'checksum-1',
        confidence: 96,
        identityConfidence: null,
        documentAuthenticityConfidence: null,
        faceMatchConfidence: null,
        livenessConfidence: null,
        humanReviewRequired: true,
        completedAt: assessment.assessedAt,
      }),
    });
  });
});
