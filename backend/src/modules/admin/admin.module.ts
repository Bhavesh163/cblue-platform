import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminOperationsService } from './admin-operations.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminOperationsService],
  exports: [AdminService],
})
export class AdminModule {}
