import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { OauthController } from './oauth.controller';
import { OauthService } from './oauth.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, JwtModule, AuthModule],
  controllers: [OauthController],
  providers: [OauthService],
})
export class OauthModule {}
