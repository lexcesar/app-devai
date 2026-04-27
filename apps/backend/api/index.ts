// Vercel Serverless entry point — wraps NestJS app
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import { AppModule } from '../src/app.module';

const server = express();
let cachedApp: any;

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

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const app = await bootstrap();
  app(req, res);
}
