import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.create(userId, dto);
  }

  @Get('fixer/:fixerId')
  getByFixer(@Param('fixerId') fixerId: string) {
    return this.reviewService.getByFixer(fixerId);
  }

  @Get('order/:orderId')
  getByOrder(@Param('orderId') orderId: string) {
    return this.reviewService.getByOrder(orderId);
  }
}
