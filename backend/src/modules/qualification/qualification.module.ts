import { Module } from '@nestjs/common';
import { QualificationController } from './qualification.controller';
import { QualificationPolicyService } from './qualification-policy.service';
import { QualificationService } from './qualification.service';
import { QualificationStorageService } from './qualification-storage.service';
import { QualificationEvaluationService } from './qualification-evaluation.service';

@Module({
  controllers: [QualificationController],
  providers: [
    QualificationPolicyService,
    QualificationService,
    QualificationStorageService,
    QualificationEvaluationService,
  ],
  exports: [
    QualificationPolicyService,
    QualificationService,
    QualificationStorageService,
    QualificationEvaluationService,
  ],
})
export class QualificationModule {}
