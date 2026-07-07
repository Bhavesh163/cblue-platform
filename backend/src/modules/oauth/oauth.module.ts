import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { OauthController } from './oauth.controller';
import { OauthService } from './oauth.service';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [OauthController],
  providers: [OauthService],
})
export class OauthModule {}
