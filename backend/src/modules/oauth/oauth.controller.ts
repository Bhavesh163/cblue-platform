import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { OauthService } from './oauth.service';
import { TokenExchangeDto } from './dto/token-exchange.dto';

@Controller()
export class OauthController {
  constructor(private readonly oauthService: OauthService) {}

  @Get('.well-known/openid-configuration')
  discovery() {
    return this.oauthService.discovery();
  }

  @Get('oauth/jwks.json')
  jwks() {
    return this.oauthService.jwks();
  }

  @Post('oauth/token')
  @HttpCode(HttpStatus.OK)
  token(
    @Body() dto: TokenExchangeDto,
    @Headers('authorization') authorization?: string,
  ) {
    const basicClient = this.basicClientCredentials(authorization);
    return this.oauthService.token({
      ...dto,
      client_id: dto.client_id || basicClient?.client_id || '',
      client_secret: dto.client_secret || basicClient?.client_secret || '',
    });
  }

  private basicClientCredentials(authorization?: string) {
    const match = String(authorization || '').match(/^Basic\s+(.+)$/i);
    if (!match?.[1]) return null;
    try {
      const decoded = Buffer.from(match[1], 'base64').toString('utf8');
      const separator = decoded.indexOf(':');
      if (separator < 0) return null;
      return {
        client_id: decoded.slice(0, separator),
        client_secret: decoded.slice(separator + 1),
      };
    } catch {
      return null;
    }
  }
}
