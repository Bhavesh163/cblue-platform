import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  QualificationEvaluationStatus,
  QualificationRisk,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QUALIFICATION_POLICY_VERSION } from './qualification-policy.service';
import { QualificationVerificationService } from './qualification-verification.service';
import { QualificationDocumentAssessment } from './qualification-assessment.types';

@Injectable()
export class QualificationAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verification: QualificationVerificationService,
  ) {}

  async assessDocument(input: {
    submissionId: string;
    documentId: string;
    registeredName: string;
  }): Promise<QualificationDocumentAssessment> {
    const document = await this.prisma.kycDocument.findFirst({
      where: { id: input.documentId, submissionId: input.submissionId },
      select: { id: true, checksumSha256: true },
    });
    if (!document) {
      throw new NotFoundException('Qualification document not found');
    }

    const assessment = await this.verification.assessStoredDocument(input);
    await this.prisma.$transaction(async (tx) => {
      await tx.kycDocument.update({
        where: { id: document.id },
        data: {
          evidenceStatus: assessment.evidenceStatus,
          assessmentReasonCodes: assessment.reasonCodes,
          assessedAt: assessment.assessedAt,
          extractionProvider: assessment.provider,
          extractionModel: assessment.model,
          extractedAt: assessment.assessedAt,
          extractionErrorCode: assessment.reasonCodes.includes(
            'PROVIDER_UNAVAILABLE',
          )
            ? 'PROVIDER_UNAVAILABLE'
            : null,
        },
      });
      await tx.qualificationEvaluation.create({
        data: {
          submissionId: input.submissionId,
          provider: assessment.provider,
          model: assessment.model,
          promptVersion: 'cblue-qualification-document-assessment-v1',
          policyVersion: QUALIFICATION_POLICY_VERSION,
          status: QualificationEvaluationStatus.COMPLETED,
          risk: this.riskFor(assessment),
          confidence: assessment.confidence,
          identityConfidence: assessment.identityConfidence,
          documentAuthenticityConfidence:
            assessment.documentAuthenticityConfidence,
          faceMatchConfidence: assessment.faceMatchConfidence,
          livenessConfidence: assessment.livenessConfidence,
          humanReviewRequired: assessment.route !== 'AI_PRECLEARED',
          inputHash: document.checksumSha256,
          output: this.json({
            evidenceStatus: assessment.evidenceStatus,
            route: assessment.route,
            reasonCodes: assessment.reasonCodes,
          }),
          completedAt: assessment.assessedAt,
        },
      });
    });
    return assessment;
  }

  private riskFor(assessment: QualificationDocumentAssessment) {
    if (
      assessment.evidenceStatus === 'CONTRADICTED' ||
      assessment.reasonCodes.includes('PROVIDER_UNAVAILABLE')
    ) {
      return QualificationRisk.HIGH;
    }
    return assessment.route === 'AI_PRECLEARED'
      ? QualificationRisk.LOW
      : QualificationRisk.MEDIUM;
  }

  private json(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
