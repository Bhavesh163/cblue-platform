import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  QualificationReviewStatus,
  UserRole,
} from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateQualificationSubmissionDto } from './dto/create-qualification-submission.dto';
import { QualificationReviewDecisionDto } from './dto/qualification-review-decision.dto';
import { UploadQualificationDocumentDto } from './dto/upload-qualification-document.dto';
import { QualificationEvaluationService } from './qualification-evaluation.service';
import { QualificationReviewService } from './qualification-review.service';
import { QualificationService } from './qualification.service';

@Controller('qualification')
@UseGuards(JwtAuthGuard)
export class QualificationController {
  constructor(
    private readonly qualification: QualificationService,
    private readonly evaluations: QualificationEvaluationService,
    private readonly reviews: QualificationReviewService,
  ) {}

  @Post('submissions')
  createSubmission(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateQualificationSubmissionDto,
  ) {
    return this.qualification.createSubmissionForUser(
      userId,
      dto.consentVersion,
    );
  }

  @Get('status')
  getStatus(@CurrentUser('id') userId: string) {
    return this.qualification.getStatusForUser(userId);
  }
  @Get('submissions/:submissionId')
  getSubmission(
    @CurrentUser('id') userId: string,
    @Param('submissionId') submissionId: string,
  ) {
    return this.qualification.getSubmissionForUser(userId, submissionId);
  }

  @Post('submissions/:submissionId/documents')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @CurrentUser('id') userId: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: UploadQualificationDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.qualification.uploadDocumentForUser(
      userId,
      submissionId,
      dto.documentType,
      file,
    );
  }

  @Post('submissions/:submissionId/evaluate')
  evaluateSubmission(
    @CurrentUser('id') userId: string,
    @Param('submissionId') submissionId: string,
  ) {
    return this.evaluations.evaluateSubmissionForUser(userId, submissionId);
  }

  @Get('submissions/:submissionId/evaluations')
  getEvaluations(
    @CurrentUser('id') userId: string,
    @Param('submissionId') submissionId: string,
  ) {
    return this.evaluations.getLatestForUser(userId, submissionId);
  }

  @Get('admin/audit')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  listAdminAudit(
    @Query('limit') limit?: string,
    @Query('submissionId') submissionId?: string,
  ) {
    return this.qualification.listAdminAuditLogs(Number(limit), submissionId);
  }
  @Get('admin/submissions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  listAdminSubmissions(@Query('status') status?: string) {
    return this.qualification.listAdminSubmissions(status);
  }

  @Get('admin/submissions/:submissionId/documents/:documentId/url')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  createAdminDocumentUrl(
    @CurrentUser('id') adminId: string,
    @Param('submissionId') submissionId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.qualification.createAdminDocumentUrl(
      adminId,
      submissionId,
      documentId,
    );
  }

  @Get('admin/submissions/:submissionId/evaluations')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminEvaluations(@Param('submissionId') submissionId: string) {
    return this.evaluations.getLatestForAdmin(submissionId);
  }

  @Get('admin/review-tasks')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  listReviewTasks(@Query('status') status?: QualificationReviewStatus) {
    return this.reviews.listTasks(status);
  }

  @Post('admin/review-tasks/:taskId/assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  assignReviewTask(
    @CurrentUser('id') adminId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.reviews.assignTask(adminId, taskId);
  }

  @Post('admin/review-tasks/:taskId/decision')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  decideReviewTask(
    @CurrentUser('id') adminId: string,
    @Param('taskId') taskId: string,
    @Body() dto: QualificationReviewDecisionDto,
  ) {
    return this.reviews.decideTask(adminId, taskId, dto);
  }
}
