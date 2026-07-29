import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { QualificationVerificationService } from './qualification-verification.service';

describe('QualificationVerificationService', () => {
  const tx = {
    kycDocument: { update: jest.fn() },
    qualificationEvaluation: { create: jest.fn() },
    qualificationAuditLog: { create: jest.fn() },
  } as any;
  const prisma = {
    kycDocument: { findFirst: jest.fn() },
    $transaction: jest.fn(async (callback: (client: any) => unknown) =>
      callback(tx),
    ),
  } as any;
  const storage = { getPrivateObject: jest.fn() } as any;
  const configValues: Record<string, string> = {
    'typhoon.apiKey': 'private-typhoon-key',
    'typhoon.baseUrl': 'https://typhoon.example/v1',
    'typhoon.model': 'typhoon-model',
    'qualificationVerification.credentialUrl': 'https://verifier.example/check',
    'qualificationVerification.credentialApiKey': 'private-verifier-key',
  };
  const config = {
    get: jest.fn((key: string) => configValues[key]),
  } as any;
  const service = new QualificationVerificationService(prisma, config, storage);

  const context = (documentType = 'id-front') => ({
    id: 'document-1',
    submissionId: 'submission-1',
    documentType,
    storageKey: 'qualification/private/document',
    checksumSha256: 'checksum-1',
    contentType: 'image/jpeg',
    submission: {
      fixer: { user: { name: 'Suppadesh Fungprasertsuk' } },
      reviewTasks: [{ id: 'task-1' }],
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.kycDocument.findFirst.mockResolvedValue(context());
    storage.getPrivateObject.mockResolvedValue(Buffer.from('private-document'));
    tx.kycDocument.update.mockImplementation(async ({ data }: any) => ({
      id: 'document-1',
      documentType: 'id-front',
      ...data,
    }));
    tx.qualificationEvaluation.create.mockResolvedValue({
      id: 'evaluation-1',
      completedAt: new Date('2026-07-25T00:00:00.000Z'),
    });
    tx.qualificationAuditLog.create.mockResolvedValue({ id: 'audit-1' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects verification when the admin does not own the maker task', async () => {
    prisma.kycDocument.findFirst.mockResolvedValue({
      ...context(),
      submission: {
        ...context().submission,
        reviewTasks: [],
      },
    });

    await expect(
      service.verifyDocument('other-admin', 'submission-1', 'document-1'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(storage.getPrivateObject).not.toHaveBeenCalled();
  });

  describe('assessStoredDocument', () => {
    const assess = () =>
      service.assessStoredDocument({
        submissionId: 'submission-1',
        documentId: 'document-1',
        registeredName: 'Suppadesh Fungprasertsuk',
      });
    const respond = (fields: Record<string, unknown>) =>
      jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ text: 'document text' }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      documentName: 'Suppadesh Fungprasertsuk',
                      detectedDocumentType: 'id-front',
                      expiresAt: '2035-01-01',
                      confidence: 96,
                      ...fields,
                    }),
                  },
                },
              ],
            }),
            { status: 200 },
          ),
        );

    it.each([
      [
        { detectedDocumentType: 'id-back' },
        'INSUFFICIENT',
        'WRONG_DOCUMENT_TYPE',
      ],
      [
        { documentName: null, confidence: 20 },
        'INSUFFICIENT',
        'UNREADABLE_DOCUMENT',
      ],
      [{ expiresAt: '2020-01-01' }, 'EXPIRED', 'EXPIRED_ID'],
      [
        { documentName: 'Different Person' },
        'CONTRADICTED',
        'IDENTITY_CONTRADICTION',
      ],
    ])(
      'classifies unsafe evidence without approval',
      async (fields, status, reason) => {
        respond(fields as Record<string, unknown>);
        await expect(assess()).resolves.toMatchObject({
          evidenceStatus: status,
          reasonCodes: expect.arrayContaining([reason]),
        });
      },
    );

    it.each(['timeout', 'invalid output'])(
      'fails closed on provider %s',
      async (kind) => {
        if (kind === 'timeout')
          jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
        else
          jest
            .spyOn(global, 'fetch')
            .mockResolvedValueOnce(
              new Response(JSON.stringify({ text: 'text' }), { status: 200 }),
            )
            .mockResolvedValueOnce(
              new Response(
                JSON.stringify({
                  choices: [
                    { message: { content: '{\"confidence\":\"invented\"}' } },
                  ],
                }),
                { status: 200 },
              ),
            );
        await expect(assess()).resolves.toMatchObject({
          evidenceStatus: 'UNCHECKED',
          route: 'NEEDS_REVIEW',
          reasonCodes: ['PROVIDER_UNAVAILABLE', 'HUMAN_REVIEW_REQUIRED'],
        });
      },
    );

    it('does not fabricate identity, authenticity, face, or liveness confidence', async () => {
      respond({});
      await expect(assess()).resolves.toMatchObject({
        route: 'NEEDS_REVIEW',
        identityConfidence: null,
        documentAuthenticityConfidence: null,
        faceMatchConfidence: null,
        livenessConfidence: null,
      });
    });
  });
});
