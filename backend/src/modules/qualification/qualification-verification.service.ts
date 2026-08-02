import {
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
  'confidence',
]);
const IDENTITY_TYPES = new Set(['id-front']);
const DOCUMENT_TYPES = new Set<string>([
  ...QUALIFICATION_DOCUMENT_TYPES,
  'id-back',
]);

@Injectable()
export class QualificationVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: QualificationStorageService,
  ) {}

  async assessStoredDocument(input: {
    submissionId: string;
    documentId: string;
    registeredName: string;
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
        IDENTITY_TYPES.has(document.documentType) &&
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
        (!fields.documentName &&
          document.documentType !== 'company-affidavit') ||
        (IDENTITY_TYPES.has(document.documentType) &&
          fields.detectedDocumentType === null)
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
        IDENTITY_TYPES.has(document.documentType)
          ? {
              ...assessment,
              ...identityMetadata(fields.credentialNumber, expiresAt),
            }
          : assessment;
      if (
        document.documentType === 'id-front' &&
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
        return withIdentity({
          ...result({
            evidenceStatus: 'INSUFFICIENT',
            route: 'NEEDS_REVIEW',
            confidence: fields.confidence,
            reasonCodes: ['AFFIDAVIT_REVIEW_REQUIRED', 'HUMAN_REVIEW_REQUIRED'],
          }),
          extractedFields: {
            detectedDocumentType: fields.detectedDocumentType,
            documentName: null,
            issuerName: null,
            credentialNumber: null,
            projectName: fields.projectName,
            projectLocation: fields.projectLocation,
            issuedAt: fields.issuedAt,
            expiresAt: fields.expiresAt,
            credentialLevel: fields.credentialLevel,
            projectValue: fields.projectValue,
            confidence: fields.confidence,
          },
        });
      }

      if (!this.namesMatch(input.registeredName, fields.documentName)) {
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
          confidence: fields.confidence,
        },
      });
    } catch {
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
      throw new ServiceUnavailableException(
        'Qualification OCR returned no usable text',
      );
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
                  confidence: 'integer 0..100',
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
      keys.length !== EXTRACTION_KEYS.size ||
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
      if (field === null) return null;
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
