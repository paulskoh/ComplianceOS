import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Environment validation
  validateEnvironment();

  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // SECURITY: Helmet - Security headers (CSP, HSTS, etc.)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Swagger needs unsafe-inline
          scriptSrc: ["'self'", "'unsafe-inline'"], // Swagger needs unsafe-inline
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // SECURITY: CORS - Strict origin control
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3004'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`Blocked CORS request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 3600, // Cache preflight for 1 hour
  });

  // Global validation pipe (already good, but adding error messages)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('ComplianceOS API')
    .setDescription('Inspection Readiness & Evidence System API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 ComplianceOS API running on http://localhost:${port}/api`);
  logger.log(`📚 API Documentation available at http://localhost:${port}/api/docs`);
  logger.log(`🔒 Security: Helmet enabled, CORS configured`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}

/**
 * SECURITY: Validate required environment variables at startup
 */
function validateEnvironment() {
  const logger = new Logger('EnvValidation');
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'S3_ENDPOINT',
    'S3_ACCESS_KEY',
    'S3_SECRET_KEY',
  ];

  const missing: string[] = [];
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    logger.error('Application cannot start without these variables');
    process.exit(1);
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.length < 32) {
    logger.error('JWT_SECRET must be at least 32 characters long for security');
    process.exit(1);
  }

  logger.log('✓ Environment variables validated');
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application:', error);
  process.exit(1);
});
