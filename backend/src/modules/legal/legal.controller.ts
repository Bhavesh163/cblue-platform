import { Controller, Get, Query } from '@nestjs/common';
import {
  LegalPoliciesQueryDto,
  LegalPoliciesResponseDto,
} from './legal-policy.dto';
import { LegalService } from './legal.service';

@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  @Get('policies')
  policies(@Query() query: LegalPoliciesQueryDto): LegalPoliciesResponseDto {
    return this.legalService.policies(query.locale);
  }
}
