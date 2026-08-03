import { QualificationCredentialVerificationService } from './qualification-credential-verification.service';

describe('QualificationCredentialVerificationService', () => {
  it('persists a verified corporate completion certificate with audit provenance', async () => {
    const prisma = {
      qualificationReviewTask: {
        findFirst: jest.fn().mockResolvedValue({ id: 'task-1' }),
      },
      kycDocument: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'document-1',
          submissionId: 'submission-1',
          documentType: 'project-completion-certificate',
          isActive: true,
          lifecycleState: 'READY',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      qualificationCredentialVerification: {
        create: jest.fn().mockResolvedValue({
          id: 'verification-1',
          documentId: 'document-1',
          status: 'VERIFIED',
          issuerType: 'SET_LISTED_COMPANY',
          projectValueBaht: 1000000,
          verifiedBy: 'admin-1',
        }),
      },
      qualificationAuditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(prisma),
      ),
    } as never;
    const service = new QualificationCredentialVerificationService(prisma);

    const result = await service.verifyDocument(
      'admin-1',
      'submission-1',
      'document-1',
      {
        status: 'VERIFIED',
        issuerType: 'SET_LISTED_COMPANY',
        issuerName: 'Example Public Company',
        verificationMethod: 'REGISTRY_REVIEW',
        externalReference: 'registry-case-1',
        projectValueBaht: 1000000,
        corporateEndorsement: true,
        reason:
          'Issuer and project completion evidence verified against the submitted source.',
      },
    );

    expect(result.status).toBe('VERIFIED');
    expect(
      prisma.qualificationCredentialVerification.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          documentId: 'document-1',
          submissionId: 'submission-1',
          verifiedBy: 'admin-1',
          issuerType: 'SET_LISTED_COMPANY',
          corporateEndorsement: true,
          projectValueBaht: 1000000,
        }),
      }),
    );
    expect(prisma.qualificationAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'CREDENTIAL_VERIFICATION_RECORDED',
          actorId: 'admin-1',
        }),
      }),
    );
  });
});
