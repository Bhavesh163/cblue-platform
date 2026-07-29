import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  QualificationEvidenceStatus,
  QualificationEvaluationStatus,
  QualificationRisk,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { QualificationStorageService } from './qualification-storage.service';
import { QUALIFICATION_POLICY_VERSION } from './qualification-policy.service';
import { QualificationDocumentAssessment } from './qualification-assessment.types';

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

type CredentialProviderResult = {
  status: 'VERIFIED' | 'NOT_FOUND' | 'CONTRADICTED';
  confidence: number;
  sourceRefs: string[];
  checkedAt: string;
};

const IDENTITY_TYPES = new Set(['id-front', 'id-back']);
const EXTERNAL_CREDENTIAL_TYPES = new Set([
  'education-certificate',
  'professional-certificate',
  'corporate-certificate',
  'project-completion-certificate',
  'international-award',
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
    if (!document)
      throw new NotFoundException('Qualification document not found');

    const assessedAt = new Date();
    const provider = 'TYPHOON_OCR';
    const model =
      this.config.get<string>('typhoon.model') ||
      process.env.TYPHOON_MODEL ||
      'typhoon-v2.5-30b-a3b-instruct';
    const unavailable = (): QualificationDocumentAssessment => ({
      evidenceStatus: 'UNCHECKED',
      route: 'NEEDS_REVIEW',
      confidence: null,
      identityConfidence: null,
      documentAuthenticityConfidence: null,
      faceMatchConfidence: null,
      livenessConfidence: null,
      reasonCodes: ['PROVIDER_UNAVAILABLE', 'HUMAN_REVIEW_REQUIRED'],
      provider,
      model,
      assessedAt,
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
      const base = {
        confidence: fields.confidence,
        identityConfidence: null,
        documentAuthenticityConfidence: null,
        faceMatchConfidence: null,
        livenessConfidence: null,
        provider,
        model,
        assessedAt,
      };
      if (
        IDENTITY_TYPES.has(document.documentType) &&
        fields.detectedDocumentType &&
        fields.detectedDocumentType !== document.documentType
      ) {
        return {
          ...base,
          evidenceStatus: 'INSUFFICIENT',
          route: 'NEEDS_RESUBMISSION',
          reasonCodes: ['WRONG_DOCUMENT_TYPE'],
        };
      }
      if (fields.confidence < 70 || !fields.documentName) {
        return {
          ...base,
          evidenceStatus: 'INSUFFICIENT',
          route: 'NEEDS_RESUBMISSION',
          reasonCodes: ['UNREADABLE_DOCUMENT'],
        };
      }
      const expiresAt = fields.expiresAt ? new Date(fields.expiresAt) : null;
      if (
        expiresAt &&
        !Number.isNaN(expiresAt.getTime()) &&
        expiresAt < assessedAt
      ) {
        return {
          ...base,
          evidenceStatus: 'EXPIRED',
          route: 'NEEDS_RESUBMISSION',
          reasonCodes: ['EXPIRED_ID'],
        };
      }
      if (!this.namesMatch(input.registeredName, fields.documentName)) {
        return {
          ...base,
          evidenceStatus: 'CONTRADICTED',
          route: 'NEEDS_REVIEW',
          reasonCodes: ['IDENTITY_CONTRADICTION', 'HUMAN_REVIEW_REQUIRED'],
        };
      }
      return {
        ...base,
        evidenceStatus: 'VALIDATED',
        route: 'NEEDS_REVIEW',
        reasonCodes: ['DOCUMENT_VALID', 'HUMAN_REVIEW_REQUIRED'],
      };
    } catch {
      return unavailable();
    }
  }

  async verifyDocument(
    adminId: string,
    submissionId: string,
    documentId: string,
  ): Promise<QualificationDocumentAssessment> {
    const context = await this.prisma.kycDocument.findFirst({
      where: { id: documentId, submissionId },
      include: {
        submission: {
          include: {
            fixer: { include: { user: { select: { name: true } } } },
            reviewTasks: {
              where: {
                status: 'ASSIGNED',
                assignedTo: adminId,
                proposedAt: null,
              },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
    });
    if (!context)
      throw new NotFoundException('Qualification document not found');
    if (!context.submission.reviewTasks.length) {
      throw new ConflictException(
        'Qualification document verification requires the assigned maker',
      );
    }
    return this.assessStoredDocument({
      submissionId,
      documentId,
      registeredName: context.submission.fixer.user.name || '',
    });
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
    if (!text || text.startsWith('[Typhoon OCR error:')) {
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
                'Extract only facts explicitly present in OCR text. Return JSON only. Never invent names, issuers, credential numbers, projects, places, or dates.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                documentType,
                ocrText,
                schema: {
                  detectedDocumentType: 'string|null',
                  documentName: 'string|null',
                  issuerName: 'string|null',
                  credentialNumber: 'string|null',
                  projectName: 'string|null',
                  projectLocation: 'string|null',
                  issuedAt: 'ISO date|string|null',
                  expiresAt: 'ISO date|string|null',
                  credentialLevel:
                    'bachelor|master|doctorate|professional|string|null',
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
    const raw = payload.choices?.[0]?.message?.content || '';
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw.replace(/^\`\`\`json\s*|\s*\`\`\`$/g, ''));
    } catch {
      throw new ServiceUnavailableException(
        'Qualification extraction returned invalid data',
      );
    }
    const confidence = Number(parsed.confidence);
    if (!Number.isInteger(confidence) || confidence < 0 || confidence > 100) {
      throw new ServiceUnavailableException(
        'Qualification extraction confidence is invalid',
      );
    }
    const value = (key: string) =>
      typeof parsed[key] === 'string' && String(parsed[key]).trim()
        ? String(parsed[key]).trim().slice(0, 500)
        : null;
    return {
      detectedDocumentType: value('detectedDocumentType'),
      documentName: value('documentName'),
      issuerName: value('issuerName'),
      credentialNumber: value('credentialNumber'),
      projectName: value('projectName'),
      projectLocation: value('projectLocation'),
      issuedAt: value('issuedAt'),
      expiresAt: value('expiresAt'),
      credentialLevel: value('credentialLevel'),
      projectValue:
        typeof parsed.projectValue === 'number' &&
        Number.isFinite(parsed.projectValue) &&
        parsed.projectValue >= 0
          ? parsed.projectValue
          : null,
      confidence,
    };
  }

  private async verifyCredential(
    documentType: string,
    fields: ExtractedCredentialFields,
    registeredName: string,
  ): Promise<CredentialProviderResult | null> {
    const url =
      this.config.get<string>('qualificationVerification.credentialUrl') ||
      process.env.QUALIFICATION_CREDENTIAL_VERIFIER_URL ||
      '';
    const apiKey =
      this.config.get<string>('qualificationVerification.credentialApiKey') ||
      process.env.QUALIFICATION_CREDENTIAL_VERIFIER_API_KEY ||
      '';
    if (!url || !apiKey) return null;

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ documentType, fields, registeredName }),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Credential verification provider failed',
      );
    }
    const payload = (await response.json()) as Record<string, unknown>;
    if (
      payload.status !== 'VERIFIED' &&
      payload.status !== 'NOT_FOUND' &&
      payload.status !== 'CONTRADICTED'
    ) {
      throw new ServiceUnavailableException(
        'Credential verifier returned an invalid status',
      );
    }
    const confidence = Number(payload.confidence);
    if (!Number.isInteger(confidence) || confidence < 0 || confidence > 100) {
      throw new ServiceUnavailableException(
        'Credential verifier confidence is invalid',
      );
    }
    return {
      status: payload.status,
      confidence,
      sourceRefs: Array.isArray(payload.sourceRefs)
        ? payload.sourceRefs
            .filter((item): item is string => typeof item === 'string')
            .slice(0, 10)
        : [],
      checkedAt: new Date().toISOString(),
    };
  }

  private evidenceStatus(
    documentType: string,
    fields: ExtractedCredentialFields,
    nameMatch: boolean,
    credential: CredentialProviderResult | null,
  ) {
    if (!nameMatch && fields.documentName) {
      return QualificationEvidenceStatus.CONTRADICTED;
    }
    if (fields.confidence < 70 || !nameMatch) {
      return QualificationEvidenceStatus.INSUFFICIENT;
    }
    if (IDENTITY_TYPES.has(documentType)) {
      return QualificationEvidenceStatus.VALIDATED;
    }
    if (EXTERNAL_CREDENTIAL_TYPES.has(documentType)) {
      if (credential?.status === 'VERIFIED') {
        return QualificationEvidenceStatus.VALIDATED;
      }
      if (credential?.status === 'CONTRADICTED') {
        return QualificationEvidenceStatus.CONTRADICTED;
      }
      return QualificationEvidenceStatus.INSUFFICIENT;
    }
    return QualificationEvidenceStatus.INSUFFICIENT;
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
      .replace(/^(mr|mrs|ms|miss|dr|2"|2|2*2'|#)\.?\s*/u, '')
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

  private json(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
