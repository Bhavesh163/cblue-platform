import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type RecaptchaVerifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  'error-codes'?: string[];
};

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);

  constructor(private readonly configService: ConfigService) {}

  async verify(token: string | undefined, action: string): Promise<void> {
    const secretKey = this.configService.get<string>('recaptcha.secretKey') || '';
    const nodeEnv = this.configService.get<string>('nodeEnv') || 'development';

    if (!secretKey) {
      if (nodeEnv === 'production') {
        throw new BadRequestException('reCAPTCHA is not configured');
      }
      this.logger.warn(
        `Skipping reCAPTCHA verification for ${action}; secret key is not configured`,
      );
      return;
    }

    const normalizedToken = token?.trim();
    if (!normalizedToken) {
      throw new BadRequestException('reCAPTCHA verification required');
    }

    let payload: RecaptchaVerifyResponse;
    try {
      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: secretKey,
          response: normalizedToken,
        }),
      });
      payload = (await response.json()) as RecaptchaVerifyResponse;
    } catch (error) {
      this.logger.warn(
        `reCAPTCHA verification request failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw new BadRequestException('Unable to verify reCAPTCHA');
    }

    if (!payload.success) {
      this.logger.warn(
        `reCAPTCHA verification failed for ${action}: ${(payload['error-codes'] || []).join(', ') || 'unknown'}`,
      );
      throw new BadRequestException('reCAPTCHA verification failed');
    }

    const minimumScore = this.configService.get<number>('recaptcha.minimumScore') ?? 0;
    if (typeof payload.score === 'number' && payload.score < minimumScore) {
      throw new BadRequestException('reCAPTCHA risk score too low');
    }

    if (payload.action && payload.action !== action) {
      throw new BadRequestException('reCAPTCHA action mismatch');
    }
  }
}
