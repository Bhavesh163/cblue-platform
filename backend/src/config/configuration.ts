export default () => ({
  port: parseInt(process.env.PORT ?? '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiration: process.env.JWT_EXPIRATION || '15m',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'dev-refresh-secret-change-in-production',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  },
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES ?? '5', 10),
    length: parseInt(process.env.OTP_LENGTH ?? '6', 10),
  },
  recaptcha: {
    secretKey: process.env.RECAPTCHA_SECRET_KEY || '',
    minimumScore: Number(process.env.RECAPTCHA_MINIMUM_SCORE ?? '0') || 0,
  },
  spaces: {
    endpoint: process.env.SPACES_ENDPOINT,
    key: process.env.SPACES_KEY,
    secret: process.env.SPACES_SECRET,
    bucket: process.env.SPACES_BUCKET,
  },
  mailjet: {
    apiKey:
      process.env.MAILJET_API_KEY ||
      process.env.MAILJET_KEY ||
      process.env.MAILJET_APIKEY ||
      process.env.MAILJET_API_SUBACCOUNT ||
      process.env.MAILJET_SUBACCOUNT_KEY ||
      process.env.MAILJET_API_SUBACCOUNT_KEY ||
      process.env.MAILJET_API_KEY_PUBLIC ||
      process.env.MAILJET_APIKEY_PUBLIC ||
      process.env.MAILJET_SUBACCOUNT_API_KEY ||
      process.env.MAILJET_PUBLIC_KEY ||
      process.env.MJ_API_KEY_PUBLIC ||
      process.env.MJ_APIKEY_PUBLIC ||
      '',
    apiSecret:
      process.env.MAILJET_SECRET_KEY ||
      process.env.MAILJET_SECRET ||
      process.env.MAILJET_SECRETKEY ||
      process.env.MAILJET_SECRET_SUBACCOUNT ||
      process.env.MAILJET_SUBACCOUNT_SECRET ||
      process.env.MAILJET_SECRET_SUBACCOUNT_KEY ||
      process.env.MAILJET_SUBACCOUNT_SECRET_KEY ||
      process.env.MAILJET_API_SECRET ||
      process.env.MAILJET_API_KEY_PRIVATE ||
      process.env.MAILJET_APIKEY_PRIVATE ||
      process.env.MAILJET_PRIVATE_KEY ||
      process.env.MJ_API_KEY_PRIVATE ||
      process.env.MJ_APIKEY_PRIVATE ||
      '',
    fromEmail:
      process.env.MAILJET_FROM_EMAIL ||
      process.env.MAILJET_FROM_EMAILD ||
      process.env.MAILJET_FROM_ADDRESS ||
      process.env.MAILJET_FROM ||
      process.env.MAILJET_SENDER_EMAIL ||
      process.env.MAILJET_SENDER ||
      process.env.MAIL_FROM_ADDRESS ||
      process.env.MAIL_FROM_EMAIL ||
      'noreply@lblue.tech',
  },
  frontendUrl: process.env.FRONTEND_URL || 'https://cblue.co.th',
  blueBridge: {
    apiKey: process.env.CBLUE_BRIDGE_API_KEY || '',
  },
  oauth: {
    issuer:
      process.env.CBLUE_OAUTH_ISSUER ||
      process.env.FRONTEND_URL ||
      'https://cblue.co.th',
    keyId: process.env.CBLUE_OAUTH_KEY_ID || 'cblue-oauth-key-1',
    privateKeyPem: process.env.CBLUE_OAUTH_PRIVATE_KEY_PEM || '',
    publicKeyPem: process.env.CBLUE_OAUTH_PUBLIC_KEY_PEM || '',
    accessTokenTtlSeconds: parseInt(
      process.env.CBLUE_OAUTH_ACCESS_TOKEN_TTL_SECONDS ?? '900',
      10,
    ),
    refreshEnabled:
      (process.env.CBLUE_OAUTH_REFRESH_ENABLED || 'true').toLowerCase() ===
      'true',
    allowedAudiences: (
      process.env.CBLUE_OAUTH_ALLOWED_AUDIENCES || 'CBLUE,LBLUE'
    )
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    blueIssuer: process.env.BLUE_OIDC_ISSUER || '',
    blueAudience: process.env.BLUE_OIDC_AUDIENCE || '',
    blueJwksUrl: process.env.BLUE_OIDC_JWKS_URL || '',
    blueJwksJson: process.env.BLUE_OIDC_JWKS_JSON || '',
    blueClientId: process.env.BLUE_OAUTH_CLIENT_ID || '',
    blueClientSecret: process.env.BLUE_OAUTH_CLIENT_SECRET || '',
  },
  visionService: {
    url: process.env.VISION_SERVICE_URL || 'http://localhost:8010',
  },
  typhoon: {
    apiKey: process.env.TYPHOON_API_KEY || '',
    baseUrl: process.env.TYPHOON_BASE_URL || 'https://api.opentyphoon.ai/v1',
    model: process.env.TYPHOON_MODEL || 'typhoon-v2.5-30b-a3b-instruct',
  },
});
