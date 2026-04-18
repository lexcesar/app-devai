import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('/api/health (GET) responds 200 with db status', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    const envelope = res.body as { data: { status: string; db: string } };
    expect(envelope.data.status).toBeDefined();
    expect(envelope.data.db).toBeDefined();
  });
});
