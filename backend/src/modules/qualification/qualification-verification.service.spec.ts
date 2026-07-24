import {
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QualificationVerificationService } from './qualification-verification.service';

describe('QualificationVerificationService', () => {
  const tx = {
    kycDocument: { update: jest.fn() },
    qualificationEvaluation: { create: jest.fn() },
    qualificationAuditLog: { create: jest.fn() },
  } as any;
  const prisma = {
    kycDocument: { findFirst: jest.fn() },
    $transaction: jest.fn(async (callback: (client: any) => unknown) => callback(tx)),
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

  it('validates identity evidence only after OCR name matching', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        results: [{ message: { choices: [{ message: { content: JSON.stringify({
          natural_text: 'Name Suppadesh Fungprasertsuk',
        }) } }] } }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          documentName: 'Suppadesh Fungprasertsuk',
          issuerName: 'Government Authority',
          credentialNumber: 'ID-1',
          projectName: null,
          projectLocation: null,
          issuedAt: '2025-01-01',
          expiresAt: '2035-01-01',
          confidence: 96,
        }) } }],
      }), { status: 200 }));

    const result = await service.verifyDocument(
      'maker-1',
      'submission-1',
      'document-1',
    );

    expect(result.document.evidenceStatus).toBe('VALIDATED');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(tx.kycDocument.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        extractionProvider: 'TYPHOON_OCR',
        evidenceStatus: 'VALIDATED',
      }),
    }));
    const output = tx.qualificationEvaluation.create.mock.calls[0][0].data.output;
    expect(output).not.toHaveProperty('rawText');
    expect(output.rawTextHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('requires an authoritative credential provider before validating a certificate', async () => {
    prisma.kycDocument.findFirst.mockResolvedValue(context('professional-certificate'));
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ text: 'Professional certificate' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          documentName: 'Suppadesh Fungprasertsuk',
          issuerName: 'Professional Council',
          credentialNumber: 'LIC-1',
          projectName: null,
          projectLocation: null,
          issuedAt: '2025-01-01',
          expiresAt: null,
          confidence: 93,
        }) } }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: 'VERIFIED',
        confidence: 98,
        sourceRefs: ['registry:professional-council:LIC-1'],
      }), { status: 200 }));

    const result = await service.verifyDocument(
      'maker-1',
      'submission-1',
      'document-1',
    );

    expect(result.document.evidenceStatus).toBe('VALIDATED');
    expect(result.document.credentialVerification).toEqual(expect.objectContaining({
      status: 'VERIFIED',
      confidence: 98,
    }));
  });

  it('marks a conflicting registered name as contradicted', async () => {
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ text: 'Different Person' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({
          documentName: 'Different Person',
          issuerName: null,
          credentialNumber: null,
          projectName: null,
          projectLocation: null,
          issuedAt: null,
          expiresAt: null,
          confidence: 90,
        }) } }],
      }), { status: 200 }));

    const result = await service.verifyDocument(
      'maker-1',
      'submission-1',
      'document-1',
    );

    expect(result.document.evidenceStatus).toBe('CONTRADICTED');
  });

  it('rejects verification when the admin does not own the maker task', async () => {
    prisma.kycDocument.findFirst.mockResolvedValue({
      ...context(),
      submission: {
        ...context().submission,
        reviewTasks: [],
      },
    });

    await expect(service.verifyDocument(
      'other-admin',
      'submission-1',
      'document-1',
    )).rejects.toBeInstanceOf(ConflictException);
    expect(storage.getPrivateObject).not.toHaveBeenCalled();
  });

  it('fails closed when the OCR provider is not configured', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'typhoon.apiKey' ? '' : configValues[key],
    );
    const previous = process.env.TYPHOON_API_KEY;
    delete process.env.TYPHOON_API_KEY;
    try {
      await expect(service.verifyDocument(
        'maker-1',
        'submission-1',
        'document-1',
      )).rejects.toBeInstanceOf(ServiceUnavailableException);
    } finally {
      process.env.TYPHOON_API_KEY = previous;
      config.get.mockImplementation((key: string) => configValues[key]);
    }
  });
});
