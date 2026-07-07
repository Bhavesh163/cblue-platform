import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import helmet from 'helmet';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Increase body size limit to support base64-encoded file attachments (~10 MB)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Security headers
  app.use(helmet());

  // Global prefix
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: '.well-known/openid-configuration', method: RequestMethod.GET },
      { path: 'oauth/jwks.json', method: RequestMethod.GET },
      { path: 'oauth/token', method: RequestMethod.POST },
    ],
  });

  // CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = configService.get<number>('port') || 3002;
  await app.listen(port, '0.0.0.0');
  logger.log(`Application running on port ${port}`);
  logger.log(`Environment: ${configService.get('nodeEnv')}`);
}
void bootstrap();
