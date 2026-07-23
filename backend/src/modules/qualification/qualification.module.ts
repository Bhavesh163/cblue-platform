import { Module } from '@nestjs/common';
import { QualificationPolicyService } from './qualification-policy.service';
import { QualificationService } from './qualification.service';

@Module({
  providers: [QualificationPolicyService, QualificationService],
  exports: [QualificationPolicyService, QualificationService],
})
export class QualificationModule {}
