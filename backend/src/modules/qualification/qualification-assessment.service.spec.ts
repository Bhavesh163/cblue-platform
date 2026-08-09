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
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
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

  it('persists structured extracted evidence for later tier evaluation', async () => {
    const extractedFields = {
      detectedDocumentType: 'id-front',
      documentName: null,
      issuerName: null,
      credentialNumber: null,
      projectName: null,
      projectLocation: null,
      issuedAt: null,
      expiresAt: null,
      credentialLevel: null,
      projectValue: null,
      confidence: 94,
    };
    verification.assessStoredDocument.mockResolvedValue({
      ...providerAssessment,
      extractedFields,
    });

    await assess();

    expect(tx.kycDocument.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ extractedFields }),
      }),
    );
    expect(tx.qualificationEvaluation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          output: expect.objectContaining({ extractedFields }),
        }),
      }),
    );
  });

  it('binds portfolio identity to the active ID evidence', async () => {
    verification.assessStoredDocument.mockResolvedValue({
      ...providerAssessment,
      subjectNameHash: 'portfolio-name-hash',
    });
    prisma.kycDocument.findFirst
      .mockResolvedValueOnce({
        id: 'document-1',
        documentType: 'portfolio',
        checksumSha256: 'checksum-1',
        evidenceStatus: 'UNCHECKED',
        updatedAt: new Date('2026-07-30T00:00:00.000Z'),
      })
      .mockResolvedValueOnce({ subjectNameHash: 'id-name-hash' });

    const result = await assess();

    expect(result.evidenceStatus).toBe('CONTRADICTED');
    expect(result.reasonCodes).toContain('PORTFOLIO_IDENTITY_CONTRADICTION');
    expect(tx.kycDocument.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subjectNameHash: 'portfolio-name-hash',
          evidenceStatus: 'CONTRADICTED',
        }),
      }),
    );
  });

  it('persists company authority as inconclusive until administrator review', async () => {
    prisma.kycDocument.findFirst.mockResolvedValue({
      id: 'document-1',
      checksumSha256: 'checksum-1',
      evidenceStatus: 'UNCHECKED',
      updatedAt: new Date('2026-07-30T00:00:00.000Z'),
      documentType: 'company-letter-of-intent',
    });
    verification.assessStoredDocument.mockResolvedValue({
      ...providerAssessment,
      extractedFields: {
        companyName: 'Example Company Limited',
        contactEmail: 'director@example.com',
        intentToJoinCblue: true,
        authorizedApplicantName: 'Applicant Person',
      },
    });

    await assess();

    expect(tx.qualificationEvaluation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          findings: {
            create: expect.arrayContaining([
              expect.objectContaining({
                code: 'COMPANY_AUTHORITY',
                result: 'UNCHECKED',
                details: expect.objectContaining({
                  status: 'INCONCLUSIVE',
                  reasonCode: 'COMPANY_AUTHORITY_REVIEW_REQUIRED',
                }),
              }),
              expect.objectContaining({
                code: 'AUTHORIZED_APPLICANT',
                result: 'VALIDATED',
              }),
            ]),
          },
        }),
      }),
    );
  });

  it('fails closed when provider enums, reasons, or nullable scores are malformed', async () => {
    verification.assessStoredDocument.mockResolvedValue({
      ...providerAssessment,
      route: 'APPROVED',
      faceMatchConfidence: '99',
      reasonCodes: ['DOCUMENT_VALID', 'INVENTED_REASON'],
      checks: [
        {
          key: 'FACE_MATCH',
          status: 'CERTIFIED',
          confidence: 99,
          note: 'unsupported provider assertion',
          reasonCode: null,
        },
      ],
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
