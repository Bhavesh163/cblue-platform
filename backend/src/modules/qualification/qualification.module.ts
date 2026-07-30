import { Module } from '@nestjs/common';
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

@Module({
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
  ],
})
export class QualificationModule {}
