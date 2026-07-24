import { Module } from '@nestjs/common';
import { QualificationController } from './qualification.controller';
import { QualificationPolicyService } from './qualification-policy.service';
import { QualificationService } from './qualification.service';
import { QualificationStorageService } from './qualification-storage.service';

@Module({
  controllers: [QualificationController],
  providers: [QualificationPolicyService, QualificationService, QualificationStorageService],
  exports: [QualificationPolicyService, QualificationService, QualificationStorageService],
})
export class QualificationModule {}
