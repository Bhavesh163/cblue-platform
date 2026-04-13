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
  spaces: {
    endpoint: process.env.SPACES_ENDPOINT,
    key: process.env.SPACES_KEY,
    secret: process.env.SPACES_SECRET,
    bucket: process.env.SPACES_BUCKET,
  },
  mailjet: {
    apiKey: process.env.MAILJET_API_KEY || '',
    apiSecret: process.env.MAILJET_API_SECRET || '',
    fromEmail: process.env.MAILJET_FROM_EMAIL || 'noreply@cblue.co.th',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  visionService: {
    url: process.env.VISION_SERVICE_URL || 'http://localhost:8010',
  },
});
