import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
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
  token(@Body() dto: TokenExchangeDto) {
    return this.oauthService.exchangeToken(dto);
  }
}
