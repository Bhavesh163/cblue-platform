import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QUALIFICATION_POLICY_VERSION,
  QualificationEvidenceInput,
  QualificationPolicyService,
} from './qualification-policy.service';

@Injectable()
export class QualificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: QualificationPolicyService,
  ) {}

  async createSubmission(fixerId: string, consentAt: Date, consentVersion: string) {
    const latest = await this.prisma.kycSubmission.findFirst({
      where: { fixerId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return this.prisma.kycSubmission.create({
      data: {
        fixerId,
        version: (latest?.version ?? 0) + 1,
        status: 'SUBMITTED',
        policyVersion: QUALIFICATION_POLICY_VERSION,
        consentAt,
        consentVersion,
        submittedAt: new Date(),
      },
    });
  }

  evaluateEvidence(input: QualificationEvidenceInput) {
    return this.policy.evaluate(input);
  }
}
