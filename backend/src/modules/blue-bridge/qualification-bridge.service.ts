import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QualificationBridgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getSnapshot(legacySubjectId: string, bridgeKey?: string) {
    this.assertBridgeKey(bridgeKey);
    const subject = String(legacySubjectId || '').trim();
    if (!subject) throw new NotFoundException('Qualification not found');

    const userIds = await this.resolveUserIds(subject);
    if (userIds.length === 0) throw new NotFoundException('Qualification not found');
    const fixer = await this.prisma.fixer.findFirst({
      where: { userId: { in: userIds } },
      include: {
        user: { select: { id: true, name: true } },
        qualificationSubmissions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            documents: {
              select: {
                id: true,
                documentType: true,
                contentType: true,
                sizeBytes: true,
                evidenceStatus: true,
                extractedAt: true,
                credentialVerifiedAt: true,
                expiresAt: true,
                retentionDeleteAt: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'asc' },
            },
            evaluations: {
              orderBy: { createdAt: 'desc' },
              take: 3,
              select: {
                id: true,
                provider: true,
                model: true,
                policyVersion: true,
                status: true,
                deterministicScore: true,
                aiScore: true,
                risk: true,
                recommendedTier: true,
                confidence: true,
                identityConfidence: true,
                documentAuthenticityConfidence: true,
                faceMatchConfidence: true,
                livenessConfidence: true,
                credentialConfidence: true,
                tierEligibilityScore: true,
                humanReviewRequired: true,
                completedAt: true,
                createdAt: true,
              },
            },
            reviewTasks: {
              where: { status: { not: 'DECIDED' } },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                status: true,
                priority: true,
                assignedAt: true,
                proposedDecision: true,
                proposedTier: true,
                proposedAt: true,
                checkedAt: true,
                decidedAt: true,
                createdAt: true,
              },
            },
          },
        },
        tierQualifications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            recommendedTier: true,
            approvedTier: true,
            source: true,
            policyVersion: true,
            reason: true,
            effectiveAt: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!fixer) throw new NotFoundException('Qualification not found');
    const submission = fixer.qualificationSubmissions[0] || null;
    const tierQualification = fixer.tierQualifications[0] || null;
    const evidenceStatuses = submission?.documents.map((document) => document.evidenceStatus) || [];
    const kycEvaluation =
      submission?.evaluations.find(
        (evaluation) => evaluation.provider !== 'DETERMINISTIC_POLICY',
      ) || submission?.evaluations[0] || null;
    const tierEvaluation =
      submission?.evaluations.find(
        (evaluation) => evaluation.provider === 'DETERMINISTIC_POLICY',
      ) || null;

    return {
      sourceVersion: 'cblue-fixer-qualification-v2',
      subject: { id: fixer.user.id, displayName: fixer.user.name || 'Partner' },
      fixer: {
        id: fixer.id,
        status: fixer.status,
        verified: fixer.verified,
        tier: fixer.tier,
        yearsExperience: fixer.yearsExperience,
        aiScore: fixer.aiScore,
        aiTier: fixer.aiTier,
        aiCredentialStatus: fixer.aiCredentialStatus,
      },
      submission: submission
        ? {
            id: submission.id,
            version: submission.version,
            status: submission.status,
            policyVersion: submission.policyVersion,
            submittedAt: submission.submittedAt,
            documents: submission.documents,
            evaluations: submission.evaluations,
            reviewTask: submission.reviewTasks[0] || null,
          }
        : null,
      tierQualification,
      kyc: {
        status: submission?.status || null,
        identityConfidence: kycEvaluation?.identityConfidence ?? null,
        documentAuthenticityConfidence:
          kycEvaluation?.documentAuthenticityConfidence ?? null,
        faceMatchConfidence: kycEvaluation?.faceMatchConfidence ?? null,
        livenessConfidence: kycEvaluation?.livenessConfidence ?? null,
        fraudRisk: kycEvaluation?.risk || null,
        humanReviewRequired: kycEvaluation?.humanReviewRequired ?? null,
      },
      tier: {
        eligibilityScore: tierEvaluation?.tierEligibilityScore ?? null,
        recommendedTier:
          tierQualification?.recommendedTier ||
          tierEvaluation?.recommendedTier ||
          null,
        approvedTier: tierQualification?.approvedTier || null,
        humanReviewRequired: tierEvaluation?.humanReviewRequired ?? null,
      },
      verification: {
        documentCount: evidenceStatuses.length,
        validatedCount: evidenceStatuses.filter((status) => status === 'VALIDATED').length,
        contradictedCount: evidenceStatuses.filter((status) => status === 'CONTRADICTED').length,
        insufficientCount: evidenceStatuses.filter((status) => status === 'INSUFFICIENT').length,
        uncheckedCount: evidenceStatuses.filter((status) => status === 'UNCHECKED').length,
        makerCheckerStatus: submission?.reviewTasks[0]?.proposedAt
          ? 'AWAITING_CHECKER'
          : submission?.reviewTasks[0]?.status || null,
      },
    };
  }

  private assertBridgeKey(providedKey?: string) {
    const expectedKey = String(
      this.config.get<string>('blueBridge.apiKey') || '',
    ).trim();
    if (!expectedKey || String(providedKey || '').trim() !== expectedKey) {
      throw new UnauthorizedException('Invalid BLUE bridge key');
    }
  }

  private async resolveUserIds(subject: string) {
    const subscriber = await this.prisma.subscriber.findFirst({
      where: {
        OR: [
          { id: subject },
          { email: { equals: subject, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true },
    });
    const email = String(subscriber?.email || subject).trim();
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { id: subject },
          { subscriberId: subject },
          ...(subscriber?.id ? [{ subscriberId: subscriber.id }] : []),
          ...(email.includes('@')
            ? [{ email: { equals: email, mode: 'insensitive' as const } }]
            : []),
        ],
      },
      select: { id: true },
    });
    return Array.from(new Set(users.map((user) => user.id)));
  }
}
