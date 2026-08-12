import { QualificationVerificationService } from './qualification-verification.service';

describe('QualificationVerificationService', () => {
  const prisma = {
    kycDocument: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
  } as any;
  const storage = { getPrivateObject: jest.fn() } as any;
  const configValues: Record<string, string> = {
    'typhoon.apiKey': 'private-typhoon-key',
    'typhoon.baseUrl': 'https://typhoon.example/v1',
    'typhoon.model': 'typhoon-model',
  };
  const config = {
    get: jest.fn((key: string) => configValues[key]),
  } as any;
  const service = new QualificationVerificationService(prisma, config, storage);

  const validFields = {
    detectedDocumentType: 'id-front',
    documentName: 'Suppadesh Fungprasertsuk',
    issuerName: null,
    credentialNumber: '1101700203450',
    projectName: null,
    projectLocation: null,
    issuedAt: null,
    expiresAt: '2035-01-01',
    credentialLevel: null,
    projectValue: null,
    confidence: 96,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.kycDocument.findFirst.mockResolvedValue({
      documentType: 'id-front',
      storageKey: 'qualification/private/document',
      contentType: 'image/jpeg',
    });
    storage.getPrivateObject.mockResolvedValue(Buffer.from('private-document'));
    prisma.user.findUnique.mockResolvedValue({
      name: 'Suppadesh Fungprasertsuk',
    });
  });

  afterEach(() => jest.restoreAllMocks());

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
            choices: [{ message: { content: JSON.stringify(fields) } }],
          }),
          { status: 200 },
        ),
      );

  it.each([
    [
      { ...validFields, detectedDocumentType: 'id-back' },
      'INSUFFICIENT',
      'WRONG_DOCUMENT_TYPE',
    ],
    [
      { ...validFields, detectedDocumentType: null },
      'INSUFFICIENT',
      'UNREADABLE_DOCUMENT',
    ],
    [
      { ...validFields, documentName: null, confidence: 20 },
      'INSUFFICIENT',
      'UNREADABLE_DOCUMENT',
    ],
    [{ ...validFields, expiresAt: '2020-01-01' }, 'EXPIRED', 'EXPIRED_ID'],
    [
      { ...validFields, documentName: 'Different Person' },
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

  it('rejects a detected identity-card image uploaded in the selfie slot', async () => {
    prisma.kycDocument.findFirst.mockResolvedValue({
      documentType: 'selfie-with-id',
      storageKey: 'qualification/private/selfie',
      contentType: 'image/jpeg',
    });
    respond({ ...validFields, detectedDocumentType: 'id-front' });

    await expect(assess()).resolves.toMatchObject({
      evidenceStatus: 'INSUFFICIENT',
      route: 'NEEDS_RESUBMISSION',
      reasonCodes: expect.arrayContaining(['WRONG_DOCUMENT_TYPE']),
    });
  });

  it('keeps a model-readable identity document non-authoritative', async () => {
    respond(validFields);

    await expect(assess()).resolves.toMatchObject({
      evidenceStatus: 'INSUFFICIENT',
      route: 'NEEDS_REVIEW',
      identityConfidence: null,
      documentAuthenticityConfidence: null,
      faceMatchConfidence: null,
      livenessConfidence: null,
      reasonCodes: ['DOCUMENT_VALID', 'HUMAN_REVIEW_REQUIRED'],
    });
  });

  it('rejects a non-document image during authenticated applicant preflight', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ text: '' }), { status: 200 }),
      );

    await expect(
      service.assessUploadForUser('user-1', 'id-front', {
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x01]),
        mimetype: 'image/jpeg',
        size: 4,
      } as Express.Multer.File),
    ).resolves.toEqual({
      evidenceStatus: 'INSUFFICIENT',
      route: 'NEEDS_RESUBMISSION',
      confidence: null,
      reasonCodes: ['UNREADABLE_DOCUMENT'],
    });
  });

  it('returns a sanitized preflight result for a readable identity document', async () => {
    respond(validFields);

    const assessment = await service.assessUploadForUser('user-1', 'id-front', {
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0x01]),
      mimetype: 'image/jpeg',
      size: 4,
    } as Express.Multer.File);

    expect(assessment).toEqual({
      evidenceStatus: 'INSUFFICIENT',
      route: 'NEEDS_REVIEW',
      confidence: 96,
      reasonCodes: ['DOCUMENT_VALID', 'HUMAN_REVIEW_REQUIRED'],
    });
    expect(assessment).not.toHaveProperty('provider');
    expect(assessment).not.toHaveProperty('model');
  });

  it('retains affidavit identity fields and flags a claimed-company contradiction', async () => {
    prisma.kycDocument.findFirst.mockResolvedValue({
      documentType: 'company-affidavit',
      storageKey: 'qualification/private/affidavit',
      contentType: 'application/pdf',
    });
    respond({
      detectedDocumentType: 'company-affidavit',
      documentName: 'Somchai Director',
      issuerName: 'Example Company Ltd',
      credentialNumber: null,
      projectName: null,
      projectLocation: null,
      issuedAt: new Date().toISOString().slice(0, 10),
      expiresAt: null,
      credentialLevel: null,
      projectValue: null,
      companyName: 'Example Company Ltd',
      companyRegistrationNumber: '0100000000000',
      directorNames: ['Somchai Director'],
      authorityHolderName: null,
      authorityType: 'director',
      confidence: 96,
    });

    await expect(
      service.assessStoredDocument({
        submissionId: 'submission-1',
        documentId: 'document-1',
        registeredName: 'Somchai Director',
        claimedCompanyName: 'Different Company Ltd',
      }),
    ).resolves.toMatchObject({
      evidenceStatus: 'CONTRADICTED',
      route: 'NEEDS_REVIEW',
      reasonCodes: expect.arrayContaining(['COMPANY_NAME_CONTRADICTION']),
      extractedFields: expect.objectContaining({
        companyName: 'Example Company Ltd',
        directorNames: ['Somchai Director'],
      }),
    });
  });

  it('validates a current complete affidavit while retaining administrator review', async () => {
    prisma.kycDocument.findFirst.mockResolvedValue({
      documentType: 'company-affidavit',
      storageKey: 'qualification/private/company-affidavit',
      contentType: 'application/pdf',
    });
    respond({
      ...validFields,
      detectedDocumentType: 'company-affidavit',
      documentName: 'Example Company Limited',
      issuedAt: new Date().toISOString().slice(0, 10),
      companyName: 'Example Company Limited',
      companyRegistrationNumber: '0100000000000',
      directorNames: ['Somchai Director'],
      authorityHolderName: 'Somchai Director',
      authorityType: 'director',
      contactEmail: null,
      intentToJoinCblue: null,
      authorizedApplicantName: null,
      confidence: 96,
    });

    await expect(
      service.assessStoredDocument({
        submissionId: 'submission-1',
        documentId: 'document-1',
        registeredName: 'Somchai Director',
        claimedCompanyName: 'Example Company Limited',
      }),
    ).resolves.toMatchObject({
      evidenceStatus: 'VALIDATED',
      route: 'NEEDS_REVIEW',
      reasonCodes: expect.arrayContaining([
        'AFFIDAVIT_REVIEW_REQUIRED',
        'HUMAN_REVIEW_REQUIRED',
      ]),
    });
  });

  it('extracts company application intent and contact for administrator review', async () => {
    prisma.kycDocument.findFirst.mockResolvedValue({
      documentType: 'company-letter-of-intent',
      storageKey: 'qualification/private/company-letter',
      contentType: 'application/pdf',
    });
    respond({
      detectedDocumentType: 'company-letter-of-intent',
      documentName: 'Somchai Director',
      issuerName: 'Example Company Limited',
      credentialNumber: null,
      projectName: null,
      projectLocation: null,
      issuedAt: new Date().toISOString().slice(0, 10),
      expiresAt: null,
      credentialLevel: null,
      projectValue: null,
      companyName: 'Example Company Limited',
      companyRegistrationNumber: '0100000000000',
      directorNames: ['Somchai Director'],
      authorityHolderName: 'Somchai Director',
      authorityType: 'director',
      contactEmail: 'DIRECTOR@EXAMPLE.COM',
      intentToJoinCblue: true,
      authorizedApplicantName: 'Applicant Person',
      confidence: 94,
    });

    await expect(
      service.assessStoredDocument({
        submissionId: 'submission-1',
        documentId: 'document-1',
        registeredName: 'Applicant Person',
        claimedCompanyName: 'Example Company Limited',
      }),
    ).resolves.toMatchObject({
      evidenceStatus: 'VALIDATED',
      route: 'NEEDS_REVIEW',
      reasonCodes: expect.arrayContaining([
        'DOCUMENT_VALID',
        'HUMAN_REVIEW_REQUIRED',
      ]),
      extractedFields: expect.objectContaining({
        companyName: 'Example Company Limited',
        authorityHolderName: 'Somchai Director',
        contactEmail: 'director@example.com',
        intentToJoinCblue: true,
        authorizedApplicantName: 'Applicant Person',
      }),
    });
  });

  it('rejects a director letter that authorizes a different applicant', async () => {
    prisma.kycDocument.findFirst.mockResolvedValue({
      documentType: 'company-letter-of-intent',
      storageKey: 'qualification/private/company-letter',
      contentType: 'application/pdf',
    });
    respond({
      ...validFields,
      detectedDocumentType: 'company-letter-of-intent',
      companyName: 'Example Company Limited',
      companyRegistrationNumber: '0100000000000',
      directorNames: ['Somchai Director'],
      authorityHolderName: 'Somchai Director',
      authorityType: 'director',
      contactEmail: 'director@example.com',
      intentToJoinCblue: true,
      authorizedApplicantName: 'Different Applicant',
      confidence: 94,
    });

    await expect(
      service.assessStoredDocument({
        submissionId: 'submission-1',
        documentId: 'document-1',
        registeredName: 'Applicant Person',
        claimedCompanyName: 'Example Company Limited',
      }),
    ).resolves.toMatchObject({
      evidenceStatus: 'CONTRADICTED',
      route: 'NEEDS_REVIEW',
      reasonCodes: expect.arrayContaining(['COMPANY_APPLICANT_CONTRADICTION']),
    });
  });

  it.each([
    [
      'unknown document enum',
      { ...validFields, detectedDocumentType: 'passport' },
    ],
    ['wrong nullable string type', { ...validFields, issuerName: 42 }],
    [
      'missing field',
      Object.fromEntries(
        Object.entries(validFields).filter(
          ([key]) => key !== 'credentialNumber',
        ),
      ),
    ],
    ['unknown field', { ...validFields, approval: true }],
    ['wrong nullable number type', { ...validFields, projectValue: '1000' }],
    ['malformed date', { ...validFields, expiresAt: 'tomorrow' }],
    ['coerced confidence', { ...validFields, confidence: '96' }],
  ])('fails closed on malformed provider field: %s', async (_name, fields) => {
    respond(fields as Record<string, unknown>);

    await expect(assess()).resolves.toMatchObject({
      evidenceStatus: 'UNCHECKED',
      route: 'NEEDS_REVIEW',
      confidence: null,
      reasonCodes: ['PROVIDER_UNAVAILABLE', 'HUMAN_REVIEW_REQUIRED'],
    });
  });

  it('keeps readable generic portfolio evidence available for tier review', async () => {
    prisma.kycDocument.findFirst.mockResolvedValue({
      documentType: 'portfolio',
      storageKey: 'qualification/private/portfolio',
      contentType: 'application/pdf',
    });
    respond({
      ...validFields,
      detectedDocumentType: 'portfolio',
      documentName: null,
      credentialNumber: null,
      expiresAt: null,
      confidence: 88,
    });

    await expect(assess()).resolves.toMatchObject({
      route: 'NEEDS_REVIEW',
      reasonCodes: expect.arrayContaining(['DOCUMENT_VALID']),
    });
  });

  it.each(['timeout', 'invalid JSON'])(
    'fails closed on provider %s',
    async (kind) => {
      if (kind === 'timeout') {
        jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
      } else {
        jest
          .spyOn(global, 'fetch')
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ text: 'text' }), { status: 200 }),
          )
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify({
                choices: [{ message: { content: '{invalid' } }],
              }),
              { status: 200 },
            ),
          );
      }

      await expect(assess()).resolves.toMatchObject({
        evidenceStatus: 'UNCHECKED',
        route: 'NEEDS_REVIEW',
        reasonCodes: ['PROVIDER_UNAVAILABLE', 'HUMAN_REVIEW_REQUIRED'],
      });
    },
  );
});
