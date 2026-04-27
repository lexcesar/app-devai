// Vercel Serverless entry point — wraps NestJS app
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import { AppModule } from '../apps/backend/src/app.module';

const server = express();
let cachedApp: any;

// Headers the frontend sends in authenticated requests.
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Acting-As',
  'X-Dev-User-Id',
].join(', ');

async function bootstrap() {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
      logger: ['error', 'warn'],
    });
    // NestJS-level CORS is a secondary safeguard; primary handling is in the
    // handler below so OPTIONS preflight is answered before NestJS processes it.
    app.enableCors({
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    });
    app.setGlobalPrefix('api');
    await app.init();
    cachedApp = app;
  }
  return server;
}

export default async function handler(req: Request, res: Response) {
  const origin = process.env.CORS_ORIGIN ?? '';

  // Always inject CORS headers so they are present even on error responses.
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  }

  // Answer OPTIONS preflight immediately — no need to wake NestJS.
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const app = await bootstrap();
  app(req, res);
}
