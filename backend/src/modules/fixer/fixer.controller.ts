import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FixerService } from './fixer.service';
import { RegisterFixerDto } from './dto/register-fixer.dto';
import { AddSkillDto } from './dto/add-skill.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('fixers')
export class FixerController {
  constructor(private readonly fixerService: FixerService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  register(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterFixerDto,
  ) {
    return this.fixerService.register(userId, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.fixerService.getMyFixerProfile(userId);
  }

  @Get(':fixerId')
  getProfile(@Param('fixerId') fixerId: string) {
    return this.fixerService.getProfile(fixerId);
  }

  // ── Skills ──

  @Post('me/skills')
  @UseGuards(JwtAuthGuard)
  addSkill(
    @CurrentUser('id') userId: string,
    @Body() dto: AddSkillDto,
  ) {
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
}
