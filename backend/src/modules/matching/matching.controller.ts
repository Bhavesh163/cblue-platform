import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('matching')
@UseGuards(JwtAuthGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('suggestions/:orderId')
  getSuggestions(@Param('orderId') orderId: string) {
    return this.matchingService.getSuggestions(orderId);
  }
}
