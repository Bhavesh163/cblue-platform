import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { QualificationController } from './qualification.controller';
import { QualificationPolicyService } from './qualification-policy.service';
import { QualificationService } from './qualification.service';
import {
  createQualificationS3Client,
  QUALIFICATION_S3_CLIENT_FACTORY,
  QualificationStorageReadinessService,
} from './qualification-storage-readiness.service';
import { QualificationStorageService } from './qualification-storage.service';
import { QualificationEvaluationService } from './qualification-evaluation.service';
import { QualificationReviewService } from './qualification-review.service';
import { QualificationVerificationService } from './qualification-verification.service';
import { QualificationAssessmentService } from './qualification-assessment.service';
import { QualificationRoutingService } from './qualification-routing.service';
import { QualificationDocumentCleanupWorker } from './qualification-document-cleanup.worker';
import { QualificationHandoffWorker } from './qualification-handoff.worker';
import { QualificationRetentionWorker } from './qualification-retention.worker';
import { QualificationEvidenceAssessmentWorker } from './qualification-evidence-assessment.worker';
import { QualificationCredentialVerificationService } from './qualification-credential-verification.service';
import { QualificationExpiryWorker } from './qualification-expiry.worker';

@Module({
  imports: [NotificationModule],
  controllers: [QualificationController],
  providers: [
    QualificationPolicyService,
    QualificationService,
    {
      provide: QUALIFICATION_S3_CLIENT_FACTORY,
      useValue: createQualificationS3Client,
    },
    QualificationStorageReadinessService,
    QualificationStorageService,
    QualificationEvaluationService,
    QualificationReviewService,
    QualificationVerificationService,
    QualificationAssessmentService,
    QualificationRoutingService,
    QualificationDocumentCleanupWorker,
    QualificationHandoffWorker,
    QualificationRetentionWorker,
    QualificationEvidenceAssessmentWorker,
    QualificationCredentialVerificationService,
    QualificationExpiryWorker,
  ],
  exports: [
    QualificationPolicyService,
    QualificationService,
    QualificationStorageReadinessService,
    QualificationStorageService,
    QualificationEvaluationService,
    QualificationReviewService,
    QualificationVerificationService,
    QualificationAssessmentService,
    QualificationRoutingService,
    QualificationCredentialVerificationService,
  ],
})
export class QualificationModule {}
