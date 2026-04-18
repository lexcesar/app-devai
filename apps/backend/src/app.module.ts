import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { DatabaseModule } from './database/database.module';
import { ProfessionalsModule } from './modules/professionals/professionals.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { MaterialListsModule } from './modules/material-lists/material-lists.module';
import { OrdersModule } from './modules/orders/orders.module';
import { WorksModule } from './modules/works/works.module';
import { VisitsModule } from './modules/visits/visits.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { HealthModule } from './modules/health/health.module';
import { AiModule } from './modules/ai/ai.module';
import { ResponseEnvelopeInterceptor } from './core/interceptors/response-envelope.interceptor';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        genReqId: (req) => {
          const existing = (req.headers['x-request-id'] ??
            req.headers['x-correlation-id']) as string | undefined;
          return existing ?? randomUUID();
        },
        customProps: (req) => ({
          requestId: (req as unknown as { id: string }).id,
        }),
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: { singleLine: true, translateTime: 'SYS:HH:MM:ss' },
              },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-dev-user-id"]',
          ],
          censor: '[REDACTED]',
        },
      },
    }),
    DatabaseModule,
    HealthModule,
    AiModule,
    ProfessionalsModule,
    ConversationsModule,
    MessagesModule,
    MaterialListsModule,
    OrdersModule,
    WorksModule,
    VisitsModule,
    WebhooksModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
