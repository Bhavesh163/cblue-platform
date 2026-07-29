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
  ],
  exports: [
    QualificationPolicyService,
    QualificationService,
    QualificationStorageReadinessService,
    QualificationStorageService,
    QualificationEvaluationService,
    QualificationReviewService,
    QualificationVerificationService,
  ],
})
export class QualificationModule {}
