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

    return {
      sourceVersion: 'cblue-fixer-qualification-v1',
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
