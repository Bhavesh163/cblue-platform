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
import { QualificationReviewStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateQualificationSubmissionDto } from './dto/create-qualification-submission.dto';
import { CreateQualificationDraftDto } from './dto/create-qualification-draft.dto';
import { QualificationReviewDecisionDto } from './dto/qualification-review-decision.dto';
import { QualificationEvidenceDecisionDto } from './dto/qualification-evidence-decision.dto';
import { QualificationCredentialVerificationDto } from './dto/qualification-credential-verification.dto';
import { QualificationComplianceAccessDto } from './dto/qualification-compliance-access.dto';
import { QualificationReviewCheckDto } from './dto/qualification-review-check.dto';
import { UploadQualificationDocumentDto } from './dto/upload-qualification-document.dto';
import { QualificationEvaluationService } from './qualification-evaluation.service';

import { QualificationReviewService } from './qualification-review.service';
import { QualificationService } from './qualification.service';
import { QualificationCredentialVerificationService } from './qualification-credential-verification.service';
import { QualificationVerificationService } from './qualification-verification.service';
import { PreflightQualificationDocumentDto } from './dto/preflight-qualification-document.dto';

const QUALIFICATION_UPLOAD_TRANSPORT_MAX_BYTES = 25 * 1024 * 1024;

@Controller('qualification')
@UseGuards(JwtAuthGuard)
export class QualificationController {
  constructor(
    private readonly qualification: QualificationService,
    private readonly evaluations: QualificationEvaluationService,
    private readonly reviews: QualificationReviewService,
    private readonly credentialVerifications: QualificationCredentialVerificationService,
    private readonly verification: QualificationVerificationService,
  ) {}

  @Post('submissions/draft')
  createOrResumeDraft(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateQualificationDraftDto,
  ) {
    return this.qualification.createOrResumeDraftForUser(
      userId,
      dto.consentVersion,
    );
  }

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

  @Get('tier-review-target')
  getTierReviewTarget(@CurrentUser('id') userId: string) {
    return this.qualification.getTierReviewTargetForUser(userId);
  }

  @Get('submissions/:submissionId')
  getSubmission(
    @CurrentUser('id') userId: string,
    @Param('submissionId') submissionId: string,
  ) {
    return this.qualification.getSubmissionForUser(userId, submissionId);
  }

  @Post('submissions/:submissionId/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: QUALIFICATION_UPLOAD_TRANSPORT_MAX_BYTES },
    }),
  )
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

  @Post('evidence-preflight')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: QUALIFICATION_UPLOAD_TRANSPORT_MAX_BYTES },
    }),
  )
  preflightEvidence(
    @CurrentUser('id') userId: string,
    @Body() dto: PreflightQualificationDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.verification.assessUploadForUser(
      userId,
      dto.documentType,
      file,
    );
  }

  @Post('submissions/:submissionId/submit')
  submitQualification(
    @CurrentUser('id') userId: string,
    @Param('submissionId') submissionId: string,
  ) {
    return this.qualification.submitForUser(userId, submissionId);
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
  @Post('admin/submissions/:submissionId/re-evaluate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  evaluateAdminSubmission(
    @CurrentUser('id') adminId: string,
    @Param('submissionId') submissionId: string,
  ) {
    return this.evaluations.evaluateSubmissionForAdmin(adminId, submissionId);
  }
  @Get('admin/submissions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  listAdminSubmissions(@Query('status') status?: string) {
    return this.qualification.listAdminSubmissions(status);
  }

  @Post('admin/submissions/:submissionId/documents/:documentId/evidence')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  reviewEvidence(
    @CurrentUser('id') adminId: string,
    @Param('submissionId') submissionId: string,
    @Param('documentId') documentId: string,
    @Body() dto: QualificationEvidenceDecisionDto,
  ) {
    return this.qualification.reviewDocumentEvidence(
      adminId,
      submissionId,
      documentId,
      dto,
    );
  }
  @Post('admin/submissions/:submissionId/documents/:documentId/verify')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  verifyDocument(
    @CurrentUser('id') adminId: string,
    @Param('submissionId') submissionId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.qualification.verifyDocumentForAdmin(
      adminId,
      submissionId,
      documentId,
    );
  }

  @Post(
    'admin/submissions/:submissionId/documents/:documentId/credential-verification',
  )
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  verifyCredential(
    @CurrentUser('id') adminId: string,
    @Param('submissionId') submissionId: string,
    @Param('documentId') documentId: string,
    @Body() dto: QualificationCredentialVerificationDto,
  ) {
    return this.credentialVerifications.verifyDocument(
      adminId,
      submissionId,
      documentId,
      dto,
    );
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

  @Post('admin/submissions/:submissionId/documents/:documentId/compliance-url')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  createComplianceDocumentUrl(
    @CurrentUser('id') adminId: string,
    @Param('submissionId') submissionId: string,
    @Param('documentId') documentId: string,
    @Body() dto: QualificationComplianceAccessDto,
  ) {
    return this.qualification.createComplianceDocumentUrl(
      adminId,
      submissionId,
      documentId,
      dto,
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

  @Post('admin/review-tasks/:taskId/release')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  releaseReviewTask(
    @CurrentUser('id') adminId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.reviews.releaseTask(adminId, taskId);
  }

  @Post('admin/review-tasks/:taskId/check')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  checkReviewTask(
    @CurrentUser('id') adminId: string,
    @Param('taskId') taskId: string,
    @Body() dto: QualificationReviewCheckDto,
  ) {
    return this.reviews.checkTask(adminId, taskId, dto);
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
