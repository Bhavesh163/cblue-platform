import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QualificationService } from './qualification.service';

describe('QualificationService', () => {
  const prisma = {
    fixer: { findUnique: jest.fn() },
    kycSubmission: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    kycDocument: { create: jest.fn(), findFirst: jest.fn() },
    qualificationAuditLog: { create: jest.fn() },
  } as any;
  const policy = { evaluate: jest.fn() } as any;
  const storage = {
    putPrivateObject: jest.fn(),
    createReadUrl: jest.fn(),
  } as any;
  const service = new QualificationService(prisma, policy, storage);

  beforeEach(() => jest.clearAllMocks());

  it('creates a submission for the authenticated fixer profile', async () => {
    prisma.fixer.findUnique.mockResolvedValue({ id: 'fixer-1' });
    prisma.kycSubmission.findFirst.mockResolvedValue(null);
    prisma.kycSubmission.create.mockResolvedValue({ id: 'submission-1' });

    await expect(service.createSubmissionForUser('user-1', 'pdpa-v1'))
      .resolves.toEqual({ id: 'submission-1' });
    expect(prisma.kycSubmission.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        fixerId: 'fixer-1',
        consentVersion: 'pdpa-v1',
        status: 'SUBMITTED',
      }),
    }));
  });

  it('rejects a submission request without a fixer profile', async () => {
    prisma.fixer.findUnique.mockResolvedValue(null);
    await expect(service.createSubmissionForUser('user-unknown', 'pdpa-v1'))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('stores uploaded documents privately and never accepts a client storage key', async () => {
    prisma.kycSubmission.findFirst.mockResolvedValue({ id: 'submission-1', fixerId: 'fixer-1' });
    prisma.kycDocument.create.mockImplementation(async ({ data, select }: any) => ({
      id: 'document-1',
      documentType: data.documentType,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
      evidenceStatus: 'UNCHECKED',
      expiresAt: null,
      createdAt: new Date('2026-07-24T00:00:00.000Z'),
      select,
    }));

    const result = await service.uploadDocumentForUser('user-1', 'submission-1', 'id-front', {
      originalname: '../../identity.pdf',
      mimetype: 'application/pdf',
      size: 4,
      buffer: Buffer.from('id-1'),
    } as Express.Multer.File);

    expect(storage.putPrivateObject).toHaveBeenCalledWith(expect.objectContaining({
      body: Buffer.from('id-1'),
      contentType: 'application/pdf',
      key: expect.stringMatching(/^qualification\/fixer-1\/submission-1\/[a-f0-9-]+-\.\._\.\._identity\.pdf$/),
    }));
    const call = prisma.kycDocument.create.mock.calls[0][0];
    expect(call.data.storageKey).not.toContain('../../');
    expect(call.data.checksumSha256).toHaveLength(64);
    expect(call.data.encrypted).toBe(true);
    expect(result.id).toBe('document-1');
  });

  it('rejects unsupported document content without touching storage', async () => {
    await expect(service.uploadDocumentForUser('user-1', 'submission-1', 'id-front', {
      originalname: 'id.exe',
      mimetype: 'application/x-msdownload',
      size: 4,
      buffer: Buffer.from('nope'),
    } as Express.Multer.File)).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.putPrivateObject).not.toHaveBeenCalled();
  });

  it('creates a short-lived admin review URL and audit record', async () => {
    prisma.kycDocument.findFirst.mockResolvedValue({
      id: 'document-1',
      storageKey: 'qualification/fixer-1/submission-1/document-1',
      documentType: 'id-front',
    });
    storage.createReadUrl.mockResolvedValue('https://private.example/document');

    await expect(service.createAdminDocumentUrl('admin-1', 'submission-1', 'document-1'))
      .resolves.toEqual({
        documentId: 'document-1',
        documentType: 'id-front',
        expiresInSeconds: 300,
        url: 'https://private.example/document',
      });
    expect(prisma.qualificationAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        submissionId: 'submission-1',
        actorId: 'admin-1',
        action: 'DOCUMENT_VIEW_URL_CREATED',
      }),
    });
  });
});
