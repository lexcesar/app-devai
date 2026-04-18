import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function assertSafeEnv() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.DISABLE_CLERK_AUTH === 'true'
  ) {
    // Fail fast: running with authentication disabled in production would
    // expose every protected endpoint to anyone who knows a seeded clerk_id.
    console.error(
      '[FATAL] DISABLE_CLERK_AUTH=true is forbidden when NODE_ENV=production.',
    );
    process.exit(1);
  }
}

async function bootstrap() {
  assertSafeEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const { Logger } = await import('nestjs-pino');
  app.useLogger(app.get(Logger));

  // CORS — allow requests from the Next.js frontend
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  // Global /api prefix
  app.setGlobalPrefix('api');

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Obra Fácil API')
    .setDescription('REST API for the Obra Fácil platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on port ${port}`);
}
void bootstrap();
