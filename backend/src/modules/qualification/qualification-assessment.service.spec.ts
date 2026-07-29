import { ConflictException } from '@nestjs/common';
import { QualificationAssessmentService } from './qualification-assessment.service';

describe('QualificationAssessmentService', () => {
  const providerAssessment = {
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
    assessedAt: new Date('2020-01-01T00:00:00.000Z'),
  } as const;
  const tx = {
    kycDocument: { updateMany: jest.fn() },
    qualificationEvaluation: { create: jest.fn() },
    qualificationAuditLog: { create: jest.fn() },
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
      evidenceStatus: 'UNCHECKED',
      updatedAt: new Date('2026-07-30T00:00:00.000Z'),
    });
    verification.assessStoredDocument.mockResolvedValue(providerAssessment);
    tx.kycDocument.updateMany.mockResolvedValue({ count: 1 });
    tx.qualificationEvaluation.create.mockResolvedValue({ id: 'evaluation-1' });
    tx.qualificationAuditLog.create.mockResolvedValue({ id: 'audit-1' });
  });

  const assess = () =>
    service.assessDocument({
      submissionId: 'submission-1',
      documentId: 'document-1',
      registeredName: 'Suppadesh Fungprasertsuk',
      actorId: 'user-1',
      auditAction: 'DOCUMENT_ASSESSED_ON_UPLOAD',
    });

  it('persists document state, one immutable evaluation, and an audit atomically', async () => {
    const result = await assess();

    expect(result.assessedAt.getTime()).toBeGreaterThan(
      providerAssessment.assessedAt.getTime(),
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.kycDocument.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'document-1',
        evidenceStatus: 'UNCHECKED',
        updatedAt: new Date('2026-07-30T00:00:00.000Z'),
      },
      data: expect.objectContaining({
        evidenceStatus: 'INSUFFICIENT',
        assessmentReasonCodes: providerAssessment.reasonCodes,
        assessedAt: result.assessedAt,
      }),
    });
    expect(tx.qualificationEvaluation.create).toHaveBeenCalledWith(
      expect.objectContaining({
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
          completedAt: result.assessedAt,
        }),
      }),
    );
    expect(tx.qualificationAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'user-1',
        action: 'DOCUMENT_ASSESSED_ON_UPLOAD',
        entityId: 'document-1',
      }),
    });
  });

  it('requires human review even for AI_PRECLEARED or VALIDATED output', async () => {
    verification.assessStoredDocument.mockResolvedValue({
      ...providerAssessment,
      route: 'AI_PRECLEARED',
    });

    await assess();

    expect(tx.qualificationEvaluation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ humanReviewRequired: true }),
      }),
    );
  });

  it('rejects a stale assessment before creating an evaluation or audit', async () => {
    tx.kycDocument.updateMany.mockResolvedValue({ count: 0 });

    await expect(assess()).rejects.toBeInstanceOf(ConflictException);
    expect(tx.qualificationEvaluation.create).not.toHaveBeenCalled();
    expect(tx.qualificationAuditLog.create).not.toHaveBeenCalled();
  });

  it('fails closed when provider enums, reasons, or nullable scores are malformed', async () => {
    verification.assessStoredDocument.mockResolvedValue({
      ...providerAssessment,
      route: 'APPROVED',
      faceMatchConfidence: '99',
      reasonCodes: ['DOCUMENT_VALID', 'INVENTED_REASON'],
    } as any);

    await expect(assess()).resolves.toMatchObject({
      evidenceStatus: 'UNCHECKED',
      route: 'NEEDS_REVIEW',
      confidence: null,
      faceMatchConfidence: null,
      reasonCodes: ['PROVIDER_UNAVAILABLE', 'HUMAN_REVIEW_REQUIRED'],
    });
  });
});
