import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { FixerService } from './fixer.service';
import { RegisterFixerDto } from './dto/register-fixer.dto';
import { AddSkillDto } from './dto/add-skill.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { UploadKycDto } from './dto/upload-kyc.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('fixers')
export class FixerController {
  constructor(private readonly fixerService: FixerService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  register(@CurrentUser('id') userId: string, @Body() dto: RegisterFixerDto) {
    return this.fixerService.register(userId, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.fixerService.getMyFixerProfile(userId);
  }

  @Get('match')
  matchFixers(@Query('service') service: string, @Query('district') district: string, @Query('province') province: string, @Query('nominateId') nominateId?: string) {
    return this.fixerService.matchFixers(service, district, province, nominateId);
  }

  @Get(':fixerId')
  getProfile(@Param('fixerId') fixerId: string) {
    return this.fixerService.getProfile(fixerId);
  }

  // ── KYC / Images ──

  @Post('me/upload-kyc')
  @UseGuards(JwtAuthGuard)
  uploadKyc(@CurrentUser('id') userId: string, @Body() dto: UploadKycDto) {
    return this.fixerService.uploadKyc(userId, dto);
  }

  @Post('me/upload-portfolio')
  @UseGuards(JwtAuthGuard)
  uploadPortfolio(
    @CurrentUser('id') userId: string,
    @Body() dto: UploadKycDto,
  ) {
    return this.fixerService.uploadPortfolio(userId, dto);
  }

  @Get('me/images')
  @UseGuards(JwtAuthGuard)
  getMyImages(@CurrentUser('id') userId: string) {
    return this.fixerService.getImages(userId);
  }

  // ── Skills ──

  @Post('me/skills')
  @UseGuards(JwtAuthGuard)
  addSkill(@CurrentUser('id') userId: string, @Body() dto: AddSkillDto) {
    return this.fixerService.addSkill(userId, dto);
  }

  @Delete('me/skills/:skillId')
  @UseGuards(JwtAuthGuard)
  removeSkill(
    @CurrentUser('id') userId: string,
    @Param('skillId') skillId: string,
  ) {
    return this.fixerService.removeSkill(userId, skillId);
  }

  // ── Availability ──

  @Post('me/availability')
  @UseGuards(JwtAuthGuard)
  setAvailability(
    @CurrentUser('id') userId: string,
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.fixerService.setAvailability(userId, dto);
  }

  @Get('me/availability')
  @UseGuards(JwtAuthGuard)
  getAvailability(@CurrentUser('id') userId: string) {
    return this.fixerService.getAvailability(userId);
  }

  // ── Portfolio AI Digest (no auth — called during registration before user has token) ──

  @Post('portfolio-digest')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseInterceptors(FilesInterceptor('files', 10))
  async digestPortfolio(@UploadedFiles() files: Express.Multer.File[]) {
    const ALLOWED_MIMES = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    for (const file of files) {
      if (!ALLOWED_MIMES.includes(file.mimetype)) {
        throw new BadRequestException(
          `Unsupported file type: ${file.originalname}`,
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException(
          `File too large: ${file.originalname} (max 50MB)`,
        );
      }
    }
    return this.fixerService.digestPortfolio(files);
  }
}
