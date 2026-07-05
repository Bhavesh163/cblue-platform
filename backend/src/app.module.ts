import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { FixerModule } from './modules/fixer/fixer.module';
import { OrderModule } from './modules/order/order.module';
import { MatchingModule } from './modules/matching/matching.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ReviewModule } from './modules/review/review.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { PropertyModule } from './modules/property/property.module';
import { PropertyInquiryModule } from './modules/property-inquiry/property-inquiry.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { QueueModule } from './queue/queue.module';
import { BlueBridgeModule } from './modules/blue-bridge/blue-bridge.module';
import configuration from './config/configuration';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', 'backend/.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 3000 }],
    }),

    // Event-driven communication between modules
    EventEmitterModule.forRoot(),

    // Database
    PrismaModule,

    // Message queue (RabbitMQ)
    QueueModule,

    // Feature modules
    AuthModule,
    UserModule,
    FixerModule,
    OrderModule,
    MatchingModule,
    PaymentModule,
    ReviewModule,
    NotificationModule,
    AdminModule,
    PropertyModule,
    PropertyInquiryModule,
    SubscriptionModule,
    BlueBridgeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
