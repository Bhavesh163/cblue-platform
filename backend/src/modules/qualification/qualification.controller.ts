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
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateQualificationSubmissionDto } from './dto/create-qualification-submission.dto';
import { UploadQualificationDocumentDto } from './dto/upload-qualification-document.dto';
import { QualificationService } from './qualification.service';

@Controller('qualification')
@UseGuards(JwtAuthGuard)
export class QualificationController {
  constructor(private readonly qualification: QualificationService) {}

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
}
