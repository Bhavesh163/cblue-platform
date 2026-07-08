import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  generateKeyPairSync,
  KeyObject,
  timingSafeEqual,
  type JsonWebKey as CryptoJsonWebKey,
} from 'crypto';
import ms from 'ms';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenExchangeDto } from './dto/token-exchange.dto';

const TOKEN_EXCHANGE_GRANT = 'urn:ietf:params:oauth:grant-type:token-exchange';
const JWT_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:jwt';
const ACCESS_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:access_token';

type JwtClaims = Record<string, unknown> & {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  email?: string;
  email_verified?: boolean;
  verified_email?: boolean;
  name?: string;
  exp?: number;
  nbf?: number;
  iat?: number;
};

type Jwks = {
  keys?: Array<Record<string, unknown>>;
};

type OAuthUser = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: UserRole | string;
  isActive: boolean;
  subscriberId: string | null;
  fixer?: {
    id: string;
    status: string;
    verified: boolean;
  } | null;
};

@Injectable()
export class OauthService {
  private readonly runtimeKeyPair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  private blueJwksCache?: { expiresAt: number; jwks: Jwks };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  discovery() {
    const issuer = this.issuer();
    return {
      issuer,
      jwks_uri: `${issuer}/oauth/jwks.json`,
      token_endpoint: `${issuer}/oauth/token`,
      grant_types_supported: [TOKEN_EXCHANGE_GRANT],
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
      ],
      subject_token_types_supported: [JWT_TOKEN_TYPE],
      response_types_supported: ['token'],
      scopes_supported: ['offline_access'],
      claims_supported: [
        'sub',
        'email',
        'email_verified',
        'name',
        'capabilities',
      ],
    };
  }

  jwks() {
    const publicJwk = this.cbluePublicKey().export({ format: 'jwk' }) as Record<
      string,
      unknown
    >;

    return {
      keys: [
        {
          ...publicJwk,
          kid: this.cblueKeyId(),
          alg: 'RS256',
          use: 'sig',
          key_ops: ['verify'],
        },
      ],
    };
  }

  async exchangeToken(dto: TokenExchangeDto) {
    this.validateTokenExchangeRequest(dto);
    this.validateClient(dto.client_id || '', dto.client_secret || '');

    const allowedAudiences = this.allowedAudiences();
    if (!allowedAudiences.includes(dto.audience)) {
      throw new UnauthorizedException('Invalid audience');
    }

    const blueClaims = await this.verifyBlueSubjectToken(dto.subject_token);
    const user = await this.mapBlueUser(blueClaims);
    const capabilities = this.capabilitiesFor(user);
    const expiresIn = this.accessTokenTtlSeconds();
    const accessToken = this.signCblueAccessToken(user, capabilities, {
      audience: dto.audience,
      expiresIn,
    });

    const response: Record<string, unknown> = {
      access_token: accessToken,
      issued_token_type: ACCESS_TOKEN_TYPE,
      token_type: 'Bearer',
      expires_in: expiresIn,
      scope: capabilities.join(' '),
      subject_id: user.id,
      email: user.email,
      email_verified: true,
      display_name: user.name || user.email || user.id,
      capabilities,
    };

    if (this.shouldIssueRefreshToken(dto.scope)) {
      response.refresh_token = await this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email ?? undefined,
          phone: user.phone ?? undefined,
          role: user.role,
          capabilities,
        },
        {
          secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
          expiresIn: this.configService.getOrThrow<ms.StringValue>(
            'jwt.refreshExpiration',
          ),
        },
      );
    }

    return response;
  }

  private validateTokenExchangeRequest(dto: TokenExchangeDto) {
    if (dto.grant_type !== TOKEN_EXCHANGE_GRANT) {
      throw new BadRequestException('Unsupported grant_type');
    }
    if (dto.subject_token_type !== JWT_TOKEN_TYPE) {
      throw new BadRequestException('Unsupported subject_token_type');
    }
  }

  private validateClient(clientId: string, clientSecret: string) {
    const expectedId =
      this.configService.get<string>('oauth.blueClientId') || '';
    const expectedSecret =
      this.configService.get<string>('oauth.blueClientSecret') || '';
    if (
      !expectedId ||
      !expectedSecret ||
      !this.safeEqual(clientId, expectedId) ||
      !this.safeEqual(clientSecret, expectedSecret)
    ) {
      throw new UnauthorizedException('Invalid client');
    }
  }

  private async verifyBlueSubjectToken(token: string): Promise<JwtClaims> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid subject token');
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = this.parseBase64Json(encodedHeader);
    const payload = this.parseBase64Json(encodedPayload) as JwtClaims;

    if (header.alg !== 'RS256') {
      throw new UnauthorizedException('Invalid subject token algorithm');
    }

    const kid = typeof header.kid === 'string' ? header.kid : '';
    const jwk = await this.findBlueJwk(kid);
    const publicKey = createPublicKey({
      key: jwk as CryptoJsonWebKey,
      format: 'jwk',
    });
    const verified = createVerify('RSA-SHA256')
      .update(`${encodedHeader}.${encodedPayload}`)
      .end()
      .verify(publicKey, Buffer.from(encodedSignature, 'base64url'));

    if (!verified) {
      throw new UnauthorizedException('Invalid subject token signature');
    }

    this.validateBlueClaims(payload);
    return payload;
  }

  private validateBlueClaims(payload: JwtClaims) {
    const expectedIssuer =
      this.configService.get<string>('oauth.blueIssuer') || '';
    const expectedAudience =
      this.configService.get<string>('oauth.blueAudience') || '';
    const now = Math.floor(Date.now() / 1000);

    if (!expectedIssuer || payload.iss !== expectedIssuer) {
      throw new UnauthorizedException('Invalid subject token issuer');
    }
    if (
      !expectedAudience ||
      !this.audienceMatches(payload.aud, expectedAudience)
    ) {
      throw new UnauthorizedException('Invalid subject token audience');
    }
    if (typeof payload.exp !== 'number' || payload.exp <= now) {
      throw new UnauthorizedException('Subject token expired');
    }
    if (typeof payload.nbf === 'number' && payload.nbf > now) {
      throw new UnauthorizedException('Subject token not active');
    }
    if (!payload.sub || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Missing subject');
    }
    if (
      typeof payload.email !== 'string' ||
      !(payload.email_verified === true || payload.verified_email === true)
    ) {
      throw new UnauthorizedException('Verified email required');
    }
  }

  private async mapBlueUser(payload: JwtClaims): Promise<OAuthUser> {
    const email = this.normalizeEmail(payload.email as string);

    const userByEmail = await this.prisma.user.findUnique({
      where: { email },
      include: { fixer: true },
    });
    if (userByEmail?.isActive) {
      return userByEmail;
    }

    const legacySubjectId = this.legacySubjectId(payload);
    if (legacySubjectId) {
      const userByLegacyLink = await this.prisma.user.findUnique({
        where: { subscriberId: legacySubjectId },
        include: { fixer: true },
      });
      if (userByLegacyLink?.isActive) {
        return userByLegacyLink;
      }
    }

    const subscriber = await this.prisma.subscriber.findUnique({
      where: { email },
    });
    if (!subscriber) {
      throw new UnauthorizedException('User is not linked to CBLUE');
    }

    const userBySubscriber = await this.prisma.user.findUnique({
      where: { subscriberId: subscriber.id },
      include: { fixer: true },
    });
    if (userBySubscriber?.isActive) {
      return userBySubscriber;
    }

    const created = await this.prisma.user.create({
      data: {
        email: subscriber.email,
        phone: subscriber.phone || undefined,
        name: subscriber.name,
        company: subscriber.company,
        subscriberId: subscriber.id,
        role: UserRole.USER,
      },
      include: { fixer: true },
    });

    if (!created.isActive) {
      throw new UnauthorizedException('User is not active');
    }
    return created;
  }

  private legacySubjectId(payload: JwtClaims) {
    const keys = [
      'legacySubjectId',
      'legacy_subject_id',
      'subscriberId',
      'subscriber_id',
      'cblue_legacy_subject_id',
    ];
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  }

  private capabilitiesFor(user: OAuthUser) {
    const capabilities = new Set([
      'cblue:user:self:read',
      'cblue:workflow:self:read',
      'cblue:orders:self:read',
    ]);

    if (user.role === UserRole.ADMIN || user.role === 'ADMIN') {
      capabilities.add('cblue:admin:read');
      capabilities.add('cblue:admin:write');
    }

    if (user.role === UserRole.FIXER || user.role === 'FIXER' || user.fixer) {
      capabilities.add('cblue:fixer:self:read');
      capabilities.add('cblue:fixer:workflow:write');
    }

    return Array.from(capabilities).sort();
  }

  private signCblueAccessToken(
    user: OAuthUser,
    capabilities: string[],
    options: { audience: string; expiresIn: number },
  ) {
    const now = Math.floor(Date.now() / 1000);
    const useAsymmetricSigning = this.hasConfiguredPrivateKey();
    const header = useAsymmetricSigning
      ? { alg: 'RS256', kid: this.cblueKeyId(), typ: 'JWT' }
      : { alg: 'HS256', typ: 'JWT' };
    const payload = {
      iss: this.issuer(),
      aud: options.audience,
      sub: user.id,
      email: user.email ?? undefined,
      email_verified: Boolean(user.email),
      name: user.name ?? undefined,
      role: user.role,
      capabilities,
      iat: now,
      exp: now + options.expiresIn,
    };
    const signingInput = `${this.base64url(JSON.stringify(header))}.${this.base64url(
      JSON.stringify(payload),
    )}`;
    if (useAsymmetricSigning) {
      const signature = createSign('RSA-SHA256')
        .update(signingInput)
        .end()
        .sign(this.cbluePrivateKey());
      return `${signingInput}.${this.base64url(signature)}`;
    }

    const signature = createHmac(
      'sha256',
      this.configService.getOrThrow<string>('jwt.secret'),
    )
      .update(signingInput)
      .digest();
    return `${signingInput}.${this.base64url(signature)}`;
  }

  private async findBlueJwk(kid: string) {
    const jwks = await this.blueJwks();
    const keys = Array.isArray(jwks.keys) ? jwks.keys : [];
    const jwk =
      keys.find((key) => (kid ? key.kid === kid : true)) ??
      keys.find((key) => key.alg === 'RS256' || key.kty === 'RSA');
    if (!jwk) {
      throw new UnauthorizedException('BLUE signing key not found');
    }
    return jwk;
  }

  private async blueJwks(): Promise<Jwks> {
    const inline = this.configService.get<string>('oauth.blueJwksJson');
    if (inline) {
      return JSON.parse(inline) as Jwks;
    }

    const now = Date.now();
    if (this.blueJwksCache && this.blueJwksCache.expiresAt > now) {
      return this.blueJwksCache.jwks;
    }

    const url = this.configService.get<string>('oauth.blueJwksUrl') || '';
    if (!url) {
      throw new UnauthorizedException('BLUE JWKS is not configured');
    }

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new UnauthorizedException('Unable to load BLUE JWKS');
    }
    const jwks = (await response.json()) as Jwks;
    this.blueJwksCache = {
      expiresAt: now + 5 * 60 * 1000,
      jwks,
    };
    return jwks;
  }

  private hasConfiguredPrivateKey() {
    return Boolean(
      this.normalizePem(this.configService.get<string>('oauth.privateKeyPem')),
    );
  }

  private cbluePrivateKey(): KeyObject {
    const configured = this.normalizePem(
      this.configService.get<string>('oauth.privateKeyPem'),
    );
    if (configured) {
      return createPrivateKey(configured);
    }
    return this.runtimeKeyPair.privateKey;
  }

  private cbluePublicKey(): KeyObject {
    const configured = this.normalizePem(
      this.configService.get<string>('oauth.publicKeyPem'),
    );
    if (configured) {
      return createPublicKey(configured);
    }

    const privateKey = this.normalizePem(
      this.configService.get<string>('oauth.privateKeyPem'),
    );
    if (privateKey) {
      return createPublicKey(createPrivateKey(privateKey));
    }

    return this.runtimeKeyPair.publicKey;
  }

  private cblueKeyId() {
    return this.configService.get<string>('oauth.keyId') || 'cblue-oauth-key-1';
  }

  private issuer() {
    const configured =
      this.configService.get<string>('oauth.issuer') ||
      this.configService.get<string>('frontendUrl') ||
      'https://cblue.co.th';
    return configured.replace(/\/+$/, '');
  }

  private accessTokenTtlSeconds() {
    return (
      Number(this.configService.get<number>('oauth.accessTokenTtlSeconds')) ||
      900
    );
  }

  private allowedAudiences() {
    const configured = this.configService.get<string[] | string>(
      'oauth.allowedAudiences',
    );
    if (Array.isArray(configured)) return configured;
    if (typeof configured === 'string' && configured.trim()) {
      return configured
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
    return ['CBLUE', 'LBLUE'];
  }

  private shouldIssueRefreshToken(scope?: string) {
    const refreshEnabled =
      this.configService.get<boolean>('oauth.refreshEnabled') === true;
    return refreshEnabled && scope?.split(/\s+/).includes('offline_access');
  }

  private parseBase64Json(value: string) {
    try {
      return JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as Record<string, unknown>;
    } catch {
      throw new UnauthorizedException('Invalid subject token');
    }
  }

  private base64url(value: Buffer | string) {
    return Buffer.from(value).toString('base64url');
  }

  private normalizePem(value?: string) {
    return value?.replace(/\\n/g, '\n').trim() || '';
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private audienceMatches(
    actual: string | string[] | undefined,
    expected: string,
  ) {
    if (Array.isArray(actual)) return actual.includes(expected);
    return actual === expected;
  }

  private safeEqual(actual: string, expected: string) {
    const actualHash = createHash('sha256').update(actual).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    return timingSafeEqual(actualHash, expectedHash);
  }
}
