import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LEGAL_POLICY_LOCALES,
  LegalPoliciesResponseDto,
  LegalPolicyLocale,
} from './legal-policy.dto';

const DEFAULT_PUBLIC_WEB_ORIGIN = 'https://www.cblue.co.th';

@Injectable()
export class LegalService {
  constructor(private readonly configService: ConfigService) {}

  policies(locale: LegalPolicyLocale = 'en'): LegalPoliciesResponseDto {
    const selectedLocale = LEGAL_POLICY_LOCALES.includes(locale) ? locale : 'en';
    const origin = this.publicWebOrigin();

    return {
      termsOfUseUrl: `${origin}/${selectedLocale}/terms`,
      refundPolicyUrl: `${origin}/${selectedLocale}/refund-policy`,
      retentionPolicyUrl: `${origin}/${selectedLocale}/retention-policy`,
    };
  }

  private publicWebOrigin(): string {
    const configured = this.configService.get<string>('frontendUrl')?.trim();

    try {
      const parsed = new URL(configured || DEFAULT_PUBLIC_WEB_ORIGIN);
      if (parsed.protocol !== 'https:') return DEFAULT_PUBLIC_WEB_ORIGIN;
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString().replace(/\/$/, '') || DEFAULT_PUBLIC_WEB_ORIGIN;
    } catch {
      return DEFAULT_PUBLIC_WEB_ORIGIN;
    }
  }
}
