import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { QUALIFICATION_DOCUMENT_TYPES } from './dto/upload-qualification-document.dto';
import { QualificationDocumentAssessment } from './qualification-assessment.types';
import { QualificationStorageService } from './qualification-storage.service';
import {
  hasValidThaiNationalId,
  identityMetadata,
  identityNameHash,
  normalizeThaiDigits,
} from './identity-evidence.util';

type ExtractedCredentialFields = {
  detectedDocumentType: string | null;
  documentName: string | null;
  issuerName: string | null;
  credentialNumber: string | null;
  projectName: string | null;
  projectLocation: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  credentialLevel: string | null;
  projectValue: number | null;
  companyName: string | null;
  companyRegistrationNumber: string | null;
  directorNames: string[];
  authorityHolderName: string | null;
  authorityType: string | null;
  contactEmail: string | null;
  intentToJoinCblue: boolean | null;
  authorizedApplicantName: string | null;
  confidence: number;
};

const EXTRACTION_KEYS = new Set<keyof ExtractedCredentialFields>([
  'detectedDocumentType',
  'documentName',
  'issuerName',
  'credentialNumber',
  'projectName',
  'projectLocation',
  'issuedAt',
  'expiresAt',
  'credentialLevel',
  'projectValue',
  'companyName',
  'companyRegistrationNumber',
  'directorNames',
  'authorityHolderName',
  'authorityType',
  'contactEmail',
  'intentToJoinCblue',
  'authorizedApplicantName',
  'confidence',
]);
const REQUIRED_EXTRACTION_KEYS = new Set<keyof ExtractedCredentialFields>([
  'detectedDocumentType',
  'documentName',
  'issuerName',
  'credentialNumber',
  'projectName',
  'projectLocation',
  'issuedAt',
  'expiresAt',
  'credentialLevel',
  'projectValue',
  'confidence',
]);
const IDENTITY_TYPES = new Set(['id-front', 'selfie-with-id']);
const ID_FRONT_TYPES = new Set(['id-front']);
const COMPANY_TYPES = new Set([
  'company-affidavit',
  'company-letter-of-intent',
]);
const DOCUMENT_TYPES = new Set<string>([
  ...QUALIFICATION_DOCUMENT_TYPES,
  'id-back',
]);
const KYC_PREFLIGHT_MAX_BYTES = 300 * 1024;
const KYC_PREFLIGHT_TYPES = new Set(['id-front', 'selfie-with-id']);
const KYC_IMAGE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

class QualificationUnusableEvidenceError extends Error {}

function detectImageContentType(buffer: Buffer): string | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  )
    return 'image/jpeg';
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return 'image/png';
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return 'image/webp';
  return null;
}

@Injectable()
export class QualificationVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: QualificationStorageService,
  ) {}

  async assessUploadForUser(
    userId: string,
    documentType: 'id-front' | 'selfie-with-id',
    file?: Express.Multer.File,
  ) {
    if (!file?.buffer || file.size <= 0) {
      throw new BadRequestException('A non-empty identity photo is required');
    }
    if (!KYC_PREFLIGHT_TYPES.has(documentType)) {
      throw new BadRequestException('Unsupported identity evidence type');
    }
    if (
      file.buffer.length > KYC_PREFLIGHT_MAX_BYTES ||
      !KYC_IMAGE_CONTENT_TYPES.has(file.mimetype) ||
      detectImageContentType(file.buffer) !== file.mimetype
    ) {
      throw new BadRequestException(
        'Identity evidence must be a valid JPEG, PNG, or WebP image no larger than 0.3 MB',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const result = (
      evidenceStatus: QualificationDocumentAssessment['evidenceStatus'],
      route: QualificationDocumentAssessment['route'],
      confidence: number | null,
      reasonCodes: QualificationDocumentAssessment['reasonCodes'],
    ) => ({ evidenceStatus, route, confidence, reasonCodes });
    const unavailable = () =>
      result('UNCHECKED', 'NEEDS_REVIEW', null, [
        'PROVIDER_UNAVAILABLE',
        'HUMAN_REVIEW_REQUIRED',
      ]);

    try {
      const apiKey =
        this.config.get<string>('typhoon.apiKey') ||
        process.env.TYPHOON_API_KEY ||
        '';
      if (!apiKey) return unavailable();
      const ocrText = await this.extractText(
        file.buffer,
        file.mimetype,
        documentType,
        apiKey,
      );
      const fields = await this.extractFields(ocrText, documentType, apiKey);
      if (
        fields.detectedDocumentType !== null &&
        fields.detectedDocumentType !== documentType
      ) {
        return result('INSUFFICIENT', 'NEEDS_RESUBMISSION', fields.confidence, [
          'WRONG_DOCUMENT_TYPE',
        ]);
      }
      if (
        fields.confidence < 70 ||
        fields.detectedDocumentType === null ||
        (documentType === 'id-front' && !fields.documentName)
      ) {
        return result('INSUFFICIENT', 'NEEDS_RESUBMISSION', fields.confidence, [
          'UNREADABLE_DOCUMENT',
        ]);
      }
      if (documentType === 'id-front') {
        const identityNumber = normalizeThaiDigits(fields.credentialNumber);
        if (
          identityNumber.length !== 13 ||
          !hasValidThaiNationalId(identityNumber)
        ) {
          return result(
            'INSUFFICIENT',
            'NEEDS_RESUBMISSION',
            fields.confidence,
            ['INVALID_ID_NUMBER'],
          );
        }
        const expiresAt = fields.expiresAt
          ? new Date(`${fields.expiresAt}T00:00:00.000Z`)
          : null;
        if (expiresAt && expiresAt < new Date()) {
          return result('EXPIRED', 'NEEDS_RESUBMISSION', fields.confidence, [
            'EXPIRED_ID',
          ]);
        }
        if (!this.namesMatch(user.name || '', fields.documentName)) {
          return result('CONTRADICTED', 'NEEDS_REVIEW', fields.confidence, [
            'IDENTITY_CONTRADICTION',
            'HUMAN_REVIEW_REQUIRED',
          ]);
        }
      }
      return result('INSUFFICIENT', 'NEEDS_REVIEW', fields.confidence, [
        'DOCUMENT_VALID',
        ...(documentType === 'selfie-with-id'
          ? (['SELFIE_REVIEW_REQUIRED'] as const)
          : []),
        'HUMAN_REVIEW_REQUIRED',
      ]);
    } catch (error) {
      if (error instanceof QualificationUnusableEvidenceError) {
        return result('INSUFFICIENT', 'NEEDS_RESUBMISSION', null, [
          'UNREADABLE_DOCUMENT',
        ]);
      }
      return unavailable();
    }
  }

  async assessStoredDocument(input: {
    submissionId: string;
    documentId: string;
    registeredName: string;
    claimedCompanyName?: string;
  }): Promise<QualificationDocumentAssessment> {
    const document = await this.prisma.kycDocument.findFirst({
      where: { id: input.documentId, submissionId: input.submissionId },
      select: { documentType: true, storageKey: true, contentType: true },
    });
    if (!document) {
      throw new NotFoundException('Qualification document not found');
    }

    const provider = 'TYPHOON_OCR';
    const model =
      this.config.get<string>('typhoon.model') ||
      process.env.TYPHOON_MODEL ||
      'typhoon-v2.5-30b-a3b-instruct';
    const result = (
      values: Pick<
        QualificationDocumentAssessment,
        'evidenceStatus' | 'route' | 'confidence' | 'reasonCodes'
      >,
    ): QualificationDocumentAssessment => ({
      ...values,
      identityConfidence: null,
      documentAuthenticityConfidence: null,
      faceMatchConfidence: null,
      livenessConfidence: null,
      provider,
      model,
      assessedAt: new Date(),
    });
    const unavailable = () =>
      result({
        evidenceStatus: 'UNCHECKED',
        route: 'NEEDS_REVIEW',
        confidence: null,
        reasonCodes: ['PROVIDER_UNAVAILABLE', 'HUMAN_REVIEW_REQUIRED'],
      });

    try {
      const apiKey =
        this.config.get<string>('typhoon.apiKey') ||
        process.env.TYPHOON_API_KEY ||
        '';
      if (!apiKey) return unavailable();
      const file = await this.storage.getPrivateObject(document.storageKey);
      const ocrText = await this.extractText(
        file,
        document.contentType,
        document.documentType,
        apiKey,
      );
      const fields = await this.extractFields(
        ocrText,
        document.documentType,
        apiKey,
      );

      if (
        (IDENTITY_TYPES.has(document.documentType) ||
          COMPANY_TYPES.has(document.documentType)) &&
        fields.detectedDocumentType !== null &&
        fields.detectedDocumentType !== document.documentType
      ) {
        return result({
          evidenceStatus: 'INSUFFICIENT',
          route: 'NEEDS_RESUBMISSION',
          confidence: fields.confidence,
          reasonCodes: ['WRONG_DOCUMENT_TYPE'],
        });
      }
      if (
        fields.confidence < 70 ||
        ((IDENTITY_TYPES.has(document.documentType) ||
          COMPANY_TYPES.has(document.documentType)) &&
          fields.detectedDocumentType === null) ||
        (document.documentType === 'id-front' && !fields.documentName)
      ) {
        return result({
          evidenceStatus: 'INSUFFICIENT',
          route: 'NEEDS_RESUBMISSION',
          confidence: fields.confidence,
          reasonCodes: ['UNREADABLE_DOCUMENT'],
        });
      }
      const expiresAt = fields.expiresAt
        ? new Date(`${fields.expiresAt}T00:00:00.000Z`)
        : null;
      const identityNumber = normalizeThaiDigits(fields.credentialNumber);
      const withIdentity = (assessment: QualificationDocumentAssessment) =>
        ID_FRONT_TYPES.has(document.documentType)
          ? {
              ...assessment,
              ...identityMetadata(
                fields.credentialNumber,
                expiresAt,
                fields.documentName,
              ),
            }
          : {
              ...assessment,
              subjectNameHash: identityNameHash(fields.documentName),
            };
      if (
        ID_FRONT_TYPES.has(document.documentType) &&
        (identityNumber.length !== 13 ||
          !hasValidThaiNationalId(identityNumber))
      ) {
        return withIdentity(
          result({
            evidenceStatus: 'INSUFFICIENT',
            route: 'NEEDS_RESUBMISSION',
            confidence: fields.confidence,
            reasonCodes: ['INVALID_ID_NUMBER'],
          }),
        );
      }
      if (
        IDENTITY_TYPES.has(document.documentType) &&
        expiresAt &&
        expiresAt < new Date()
      ) {
        return withIdentity(
          result({
            evidenceStatus: 'EXPIRED',
            route: 'NEEDS_RESUBMISSION',
            confidence: fields.confidence,
            reasonCodes: ['EXPIRED_ID'],
          }),
        );
      }

      if (document.documentType === 'company-affidavit') {
        const issuedAt = fields.issuedAt
          ? new Date(`${fields.issuedAt}T00:00:00.000Z`)
          : null;
        if (
          !issuedAt ||
          issuedAt.getTime() < Date.now() - 183 * 24 * 60 * 60 * 1000
        ) {
          return withIdentity(
            result({
              evidenceStatus: 'INSUFFICIENT',
              route: 'NEEDS_REVIEW',
              confidence: fields.confidence,
              reasonCodes: ['AFFIDAVIT_EXPIRED', 'HUMAN_REVIEW_REQUIRED'],
            }),
          );
        }
        const affidavitFields = {
          detectedDocumentType: fields.detectedDocumentType,
          documentName: fields.documentName,
          issuerName: fields.issuerName,
          credentialNumber: fields.credentialNumber,
          projectName: fields.projectName,
          projectLocation: fields.projectLocation,
          issuedAt: fields.issuedAt,
          expiresAt: fields.expiresAt,
          credentialLevel: fields.credentialLevel,
          projectValue: fields.projectValue,
          companyName: fields.companyName,
          companyRegistrationNumber: fields.companyRegistrationNumber,
          directorNames: fields.directorNames,
          authorityHolderName: fields.authorityHolderName,
          authorityType: fields.authorityType,
          confidence: fields.confidence,
        };
        const companyNameContradiction =
          Boolean(input.claimedCompanyName && fields.companyName) &&
          !this.namesMatch(input.claimedCompanyName || '', fields.companyName);
        const authorityNames = [
          ...fields.directorNames,
          fields.authorityHolderName,
        ].filter((name): name is string => Boolean(name));
        const affidavitFieldsMissing =
          !fields.companyName ||
          !fields.companyRegistrationNumber ||
          authorityNames.length === 0;
        const applicantHasAuthority = authorityNames.some((name) =>
          this.namesMatch(input.registeredName, name),
        );
        return withIdentity({
          ...result({
            evidenceStatus: companyNameContradiction
              ? 'CONTRADICTED'
              : affidavitFieldsMissing
                ? 'INSUFFICIENT'
                : 'VALIDATED',
            route: 'NEEDS_REVIEW',
            confidence: fields.confidence,
            reasonCodes: companyNameContradiction
              ? ['COMPANY_NAME_CONTRADICTION', 'HUMAN_REVIEW_REQUIRED']
              : applicantHasAuthority
                ? ['AFFIDAVIT_REVIEW_REQUIRED', 'HUMAN_REVIEW_REQUIRED']
                : [
                    'COMPANY_AUTHORITY_REVIEW_REQUIRED',
                    'HUMAN_REVIEW_REQUIRED',
                  ],
          }),
          extractedFields: affidavitFields,
        });
      }
      if (document.documentType === 'company-letter-of-intent') {
        const companyNameContradiction =
          Boolean(input.claimedCompanyName && fields.companyName) &&
          !this.namesMatch(input.claimedCompanyName || '', fields.companyName);
        const contactEmail = fields.contactEmail?.trim().toLowerCase() || null;
        const contactAvailable = Boolean(
          contactEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail),
        );
        const authorizedApplicantName =
          fields.authorizedApplicantName?.trim() || null;
        const applicantContradiction = Boolean(
          authorizedApplicantName &&
          !this.namesMatch(input.registeredName, authorizedApplicantName),
        );
        const requiredFieldsMissing =
          !fields.companyName ||
          fields.intentToJoinCblue !== true ||
          !contactAvailable ||
          !authorizedApplicantName;
        const reasonCodes: QualificationDocumentAssessment['reasonCodes'] = [
          'DOCUMENT_VALID',
          'HUMAN_REVIEW_REQUIRED',
        ];
        if (!fields.intentToJoinCblue) {
          reasonCodes.unshift('COMPANY_INTENT_MISSING');
        }
        if (!contactAvailable) reasonCodes.unshift('COMPANY_CONTACT_MISSING');
        if (!authorizedApplicantName) {
          reasonCodes.unshift('COMPANY_APPLICANT_MISSING');
        }
        if (applicantContradiction) {
          reasonCodes.unshift('COMPANY_APPLICANT_CONTRADICTION');
        }
        if (companyNameContradiction) {
          reasonCodes.unshift('COMPANY_NAME_CONTRADICTION');
        }
        return withIdentity({
          ...result({
            evidenceStatus:
              companyNameContradiction || applicantContradiction
                ? 'CONTRADICTED'
                : requiredFieldsMissing
                  ? 'INSUFFICIENT'
                  : 'VALIDATED',
            route: 'NEEDS_REVIEW',
            confidence: fields.confidence,
            reasonCodes,
          }),
          extractedFields: {
            detectedDocumentType: fields.detectedDocumentType,
            documentName: fields.documentName,
            companyName: fields.companyName,
            companyRegistrationNumber: fields.companyRegistrationNumber,
            directorNames: fields.directorNames,
            authorityHolderName: fields.authorityHolderName,
            authorityType: fields.authorityType,
            contactEmail,
            intentToJoinCblue: fields.intentToJoinCblue,
            authorizedApplicantName,
            confidence: fields.confidence,
          },
        });
      }

      const nameMustMatch =
        document.documentType !== 'portfolio' &&
        document.documentType !== 'selfie-with-id' &&
        document.documentType !== 'company-affidavit' &&
        document.documentType !== 'company-letter-of-intent' &&
        Boolean(fields.documentName);
      if (
        nameMustMatch &&
        !this.namesMatch(input.registeredName, fields.documentName)
      ) {
        return withIdentity(
          result({
            evidenceStatus: 'CONTRADICTED',
            route: 'NEEDS_REVIEW',
            confidence: fields.confidence,
            reasonCodes: ['IDENTITY_CONTRADICTION', 'HUMAN_REVIEW_REQUIRED'],
          }),
        );
      }

      return withIdentity({
        ...result({
          evidenceStatus: 'INSUFFICIENT',
          route: 'NEEDS_REVIEW',
          confidence: fields.confidence,
          reasonCodes:
            document.documentType === 'selfie-with-id'
              ? [
                  'DOCUMENT_VALID',
                  'SELFIE_REVIEW_REQUIRED',
                  'HUMAN_REVIEW_REQUIRED',
                ]
              : ['DOCUMENT_VALID', 'HUMAN_REVIEW_REQUIRED'],
        }),
        extractedFields: {
          detectedDocumentType: fields.detectedDocumentType,
          documentName: IDENTITY_TYPES.has(document.documentType)
            ? null
            : fields.documentName,
          issuerName: IDENTITY_TYPES.has(document.documentType)
            ? null
            : fields.issuerName,
          credentialNumber: IDENTITY_TYPES.has(document.documentType)
            ? null
            : fields.credentialNumber,
          projectName: fields.projectName,
          projectLocation: fields.projectLocation,
          issuedAt: fields.issuedAt,
          expiresAt: fields.expiresAt,
          credentialLevel: fields.credentialLevel,
          projectValue: fields.projectValue,
          companyName: fields.companyName,
          companyRegistrationNumber: fields.companyRegistrationNumber,
          directorNames: fields.directorNames,
          authorityHolderName: fields.authorityHolderName,
          authorityType: fields.authorityType,
          contactEmail: fields.contactEmail,
          intentToJoinCblue: fields.intentToJoinCblue,
          authorizedApplicantName: fields.authorizedApplicantName,
          confidence: fields.confidence,
        },
      });
    } catch (error) {
      if (error instanceof QualificationUnusableEvidenceError) {
        return result({
          evidenceStatus: 'INSUFFICIENT',
          route: 'NEEDS_RESUBMISSION',
          confidence: null,
          reasonCodes: ['UNREADABLE_DOCUMENT'],
        });
      }
      return unavailable();
    }
  }

  private async extractText(
    content: Buffer,
    contentType: string,
    documentType: string,
    apiKey: string,
  ) {
    const baseUrl = (
      this.config.get<string>('typhoon.baseUrl') ||
      process.env.TYPHOON_BASE_URL ||
      'https://api.opentyphoon.ai/v1'
    ).replace(/\/$/, '');
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(content)], { type: contentType }),
      documentType + (contentType === 'application/pdf' ? '.pdf' : '.jpg'),
    );
    const response = await this.fetchWithTimeout(baseUrl + '/ocr', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey },
      body: form,
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Qualification OCR provider rejected the document',
      );
    }
    const payload = (await response.json()) as unknown;
    const text = this.findText(payload).trim();
    if (!text || text.startsWith('[blue AI OCR error:')) {
      throw new QualificationUnusableEvidenceError();
    }
    return text.slice(0, 20000);
  }

  private async extractFields(
    ocrText: string,
    documentType: string,
    apiKey: string,
  ): Promise<ExtractedCredentialFields> {
    const baseUrl = (
      this.config.get<string>('typhoon.baseUrl') ||
      process.env.TYPHOON_BASE_URL ||
      'https://api.opentyphoon.ai/v1'
    ).replace(/\/$/, '');
    const model =
      this.config.get<string>('typhoon.model') ||
      process.env.TYPHOON_MODEL ||
      'typhoon-v2.5-30b-a3b-instruct';
    const response = await this.fetchWithTimeout(
      baseUrl + '/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Extract only facts explicitly present in OCR text. Return every schema key as strict JSON. Never invent identity, authenticity, face, or liveness results.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                documentType,
                ocrText,
                schema: {
                  detectedDocumentType: 'qualification document type|null',
                  documentName: 'string|null',
                  issuerName: 'string|null',
                  credentialNumber: 'string|null',
                  projectName: 'string|null',
                  projectLocation: 'string|null',
                  issuedAt: 'YYYY-MM-DD|null',
                  expiresAt: 'YYYY-MM-DD|null',
                  credentialLevel: 'string|null',
                  projectValue: 'number|null',
                  companyName: 'string|null',
                  companyRegistrationNumber: 'string|null',
                  directorNames: 'string[]',
                  authorityHolderName: 'string|null',
                  authorityType: 'director|power-of-attorney|consent|null',
                  confidence: 'integer 0..100',
                  contactEmail: 'string|null',
                  intentToJoinCblue: 'boolean|null',
                  authorizedApplicantName: 'string|null',
                },
              }),
            },
          ],
        }),
      },
    );
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Qualification extraction provider failed',
      );
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content;
    if (typeof raw !== 'string' || !raw.trim()) {
      throw new ServiceUnavailableException(
        'Qualification extraction returned invalid data',
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ''));
    } catch {
      throw new ServiceUnavailableException(
        'Qualification extraction returned invalid data',
      );
    }
    return this.validateExtractedFields(parsed);
  }

  private validateExtractedFields(value: unknown): ExtractedCredentialFields {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ServiceUnavailableException(
        'Qualification extraction returned invalid fields',
      );
    }
    const parsed = value as Record<string, unknown>;
    const keys = Object.keys(parsed);
    if (
      Array.from(REQUIRED_EXTRACTION_KEYS).some((key) => !keys.includes(key)) ||
      keys.some(
        (key) => !EXTRACTION_KEYS.has(key as keyof ExtractedCredentialFields),
      )
    ) {
      throw new ServiceUnavailableException(
        'Qualification extraction returned an invalid field set',
      );
    }

    const nullableString = (key: keyof ExtractedCredentialFields) => {
      const field = parsed[key];
      if (field === null || field === undefined) return null;
      if (
        typeof field !== 'string' ||
        field.trim().length === 0 ||
        field.length > 500
      ) {
        throw new ServiceUnavailableException(
          `Qualification extraction field ${key} is invalid`,
        );
      }
      return field.trim();
    };
    const stringArray = (key: keyof ExtractedCredentialFields) => {
      const field = parsed[key];
      if (field === null || field === undefined) return [];
      if (!Array.isArray(field) || field.length > 20) {
        throw new ServiceUnavailableException(
          `Qualification extraction field ${key} is invalid`,
        );
      }
      if (
        field.some(
          (item) =>
            typeof item !== 'string' ||
            item.trim().length === 0 ||
            item.length > 500,
        )
      ) {
        throw new ServiceUnavailableException(
          `Qualification extraction field ${key} is invalid`,
        );
      }
      return field.map((item) => (item as string).trim());
    };
    const nullableBoolean = (key: keyof ExtractedCredentialFields) => {
      const field = parsed[key];
      if (field === null || field === undefined) return null;
      if (typeof field !== 'boolean') {
        throw new ServiceUnavailableException(
          `Qualification extraction field ${key} is invalid`,
        );
      }
      return field;
    };
    const date = (key: 'issuedAt' | 'expiresAt') => {
      const field = nullableString(key);
      if (field === null) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(field)) {
        throw new ServiceUnavailableException(
          `Qualification extraction field ${key} is invalid`,
        );
      }
      const parsedDate = new Date(`${field}T00:00:00.000Z`);
      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== field
      ) {
        throw new ServiceUnavailableException(
          `Qualification extraction field ${key} is invalid`,
        );
      }
      return field;
    };

    const detectedDocumentType = nullableString('detectedDocumentType');
    if (
      detectedDocumentType !== null &&
      !DOCUMENT_TYPES.has(detectedDocumentType)
    ) {
      throw new ServiceUnavailableException(
        'Qualification extraction document type is invalid',
      );
    }
    const projectValue = parsed.projectValue;
    if (
      projectValue !== null &&
      (typeof projectValue !== 'number' ||
        !Number.isFinite(projectValue) ||
        projectValue < 0)
    ) {
      throw new ServiceUnavailableException(
        'Qualification extraction project value is invalid',
      );
    }
    const confidence = parsed.confidence;
    if (
      typeof confidence !== 'number' ||
      !Number.isInteger(confidence) ||
      confidence < 0 ||
      confidence > 100
    ) {
      throw new ServiceUnavailableException(
        'Qualification extraction confidence is invalid',
      );
    }

    return {
      detectedDocumentType,
      documentName: nullableString('documentName'),
      issuerName: nullableString('issuerName'),
      credentialNumber: nullableString('credentialNumber'),
      projectName: nullableString('projectName'),
      projectLocation: nullableString('projectLocation'),
      issuedAt: date('issuedAt'),
      expiresAt: date('expiresAt'),
      credentialLevel: nullableString('credentialLevel'),
      projectValue,
      companyName: nullableString('companyName'),
      companyRegistrationNumber: nullableString('companyRegistrationNumber'),
      directorNames: stringArray('directorNames'),
      authorityHolderName: nullableString('authorityHolderName'),
      authorityType: nullableString('authorityType'),
      contactEmail: nullableString('contactEmail'),
      intentToJoinCblue: nullableBoolean('intentToJoinCblue'),
      authorizedApplicantName: nullableString('authorizedApplicantName'),
      confidence,
    };
  }

  private namesMatch(registeredName: string, documentName: string | null) {
    const registered = this.normalizeName(registeredName);
    const documented = this.normalizeName(documentName || '');
    if (registered.length < 3 || documented.length < 3) return false;
    return (
      registered === documented ||
      registered.includes(documented) ||
      documented.includes(registered)
    );
  }

  private normalizeName(value: string) {
    return value
      .normalize('NFKC')
      .toLocaleLowerCase('en-US')
      .replace(/^(mr|mrs|ms|miss|dr)\.?\s*/u, '')
      .replace(
        /^(\u0e19\u0e32\u0e22|\u0e19\u0e32\u0e07\u0e2a\u0e32\u0e27|\u0e19\u0e32\u0e07|\u0e14\u0e23\.)\s*/u,
        '',
      )
      .replace(/(\u5148\u751f|\u5973\u58eb)$/u, '')
      .replace(/[^\p{L}\p{N}]/gu, '');
  }

  private findText(value: unknown): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      return value
        .map((item) => this.findText(item))
        .filter(Boolean)
        .join('\n');
    }
    if (!value || typeof value !== 'object') return '';
    const record = value as Record<string, unknown>;
    for (const key of ['natural_text', 'text', 'content', 'message']) {
      const found = this.findText(record[key]);
      if (found) return found;
    }
    return this.findText(record.results) || this.findText(record.choices);
  }

  private async fetchWithTimeout(url: string, init: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch {
      throw new ServiceUnavailableException(
        'Qualification verification provider unavailable',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
