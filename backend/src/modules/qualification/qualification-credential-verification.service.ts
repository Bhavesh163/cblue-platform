import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { QualificationCredentialVerificationDto } from './dto/qualification-credential-verification.dto';

@Injectable()
export class QualificationCredentialVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyDocument(
    adminId: string,
    submissionId: string,
    documentId: string,
    dto: QualificationCredentialVerificationDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.qualificationReviewTask.findFirst({
        where: {
          submissionId,
          status: 'ASSIGNED',
          assignedTo: adminId,
          proposedAt: null,
        },
        select: { id: true },
      });
      if (!task) {
        throw new ConflictException(
          'Credential verification requires the assigned administrator',
        );
      }

      const document = await tx.kycDocument.findFirst({
        where: {
          id: documentId,
          submissionId,
          isActive: true,
          lifecycleState: 'READY',
        },
        select: { id: true, checksumSha256: true, documentType: true },
      });
      if (!document)
        throw new NotFoundException('Qualification document not found');

      const verifiedAt = dto.status === 'VERIFIED' ? new Date() : null;
      const sourceSnapshotHash = createHash('sha256')
        .update(
          JSON.stringify({
            documentId,
            checksumSha256: document.checksumSha256,
            ...dto,
          }),
        )
        .digest('hex');
      const verification = await tx.qualificationCredentialVerification.create({
        data: {
          documentId,
          submissionId,
          status: dto.status,
          issuerType: dto.issuerType,
          issuerName: dto.issuerName?.trim() || null,
          credentialType: dto.credentialType?.trim() || document.documentType,
          credentialCount: dto.credentialCount ?? 1,
          verificationMethod: dto.verificationMethod.trim(),
          externalReference: dto.externalReference?.trim() || null,
          projectValueBaht: dto.projectValueBaht ?? null,
          corporateEndorsement: dto.corporateEndorsement,
          sourceSnapshotHash,
          reason: dto.reason.trim(),
          verifiedBy: adminId,
          verifiedAt,
        },
      });

      await tx.kycDocument.update({
        where: { id: documentId },
        data: {
          credentialVerification: {
            status: dto.status,
            issuerType: dto.issuerType || null,
            issuerName: dto.issuerName?.trim() || null,
            credentialType: dto.credentialType?.trim() || document.documentType,
            credentialCount: dto.credentialCount ?? 1,
            verificationMethod: dto.verificationMethod.trim(),
            externalReference: dto.externalReference?.trim() || null,
            projectValueBaht: dto.projectValueBaht ?? null,
            corporateEndorsement: dto.corporateEndorsement,
            sourceSnapshotHash,
            reason: dto.reason.trim(),
            verifiedBy: adminId,
            verifiedAt: verifiedAt?.toISOString() || null,
          },
          credentialVerifiedAt: verifiedAt,
        },
      });
      await tx.qualificationAuditLog.create({
        data: {
          submissionId,
          actorId: adminId,
          action: 'CREDENTIAL_VERIFICATION_RECORDED',
          entityType: 'QualificationCredentialVerification',
          entityId: verification.id,
          reason: dto.reason.trim(),
          metadata: {
            documentId,
            status: dto.status,
            issuerType: dto.issuerType || null,
            credentialCount: dto.credentialCount ?? 1,
            corporateEndorsement: dto.corporateEndorsement,
            sourceSnapshotHash,
          },
        },
      });
      return verification;
    });
  }
}
