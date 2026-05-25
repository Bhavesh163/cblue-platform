import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { LoginSubscriberDto } from './dto/login-subscriber.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  register(@Body() dto: CreateSubscriberDto) {
    return this.subscriptionService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  login(@Body() dto: LoginSubscriberDto) {
    return this.subscriptionService.login(dto);
  }

  @Post('refresh-session')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  refreshSession(@Headers('authorization') authorization?: string) {
    return this.subscriptionService.refreshSession(authorization);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.subscriptionService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.subscriptionService.resetPassword(dto);
  }

  // Note: listSubscribers requires admin auth guard in production
  // @Get('subscribers')
  // listSubscribers() {
  //   return this.subscriptionService.listSubscribers();
  // }
}
