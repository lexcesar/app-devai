import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DEV_USER_ID_HEADER } from '@obrafacil/shared';

import { AppModule } from '../src/app.module';
// ResponseEnvelopeInterceptor and HttpExceptionFilter are registered globally
// via APP_INTERCEPTOR / APP_FILTER in AppModule — do NOT re-register here.

const CARLOS_CLERK_ID = 'demo_client_001';
const JOANA_CLERK_ID = 'demo_client_002';
const PROFESSIONAL_CLERK_ID = 'demo_professional_001';
const CARLOS_PROFILE_ID = '00000000-0000-0000-0000-000000000001';
const JOANA_PROFILE_ID = '00000000-0000-0000-0000-000000000011';

type OrderRow = {
  id: string;
  client_id: string;
  order_number: string;
};

describe('Orders isolation (e2e)', () => {
  let app: INestApplication<App>;
  let originalBypassEnv: string | undefined;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL must be set for e2e tests (expects seeded DB from docker/01-schema.sql + 02-seed.sql)',
      );
    }

    originalBypassEnv = process.env.DISABLE_CLERK_AUTH;
    process.env.DISABLE_CLERK_AUTH = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (originalBypassEnv === undefined) {
      delete process.env.DISABLE_CLERK_AUTH;
    } else {
      process.env.DISABLE_CLERK_AUTH = originalBypassEnv;
    }
  });

  it('Carlos sees only his own orders', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/orders')
      .set(DEV_USER_ID_HEADER, CARLOS_CLERK_ID)
      .expect(200);

    const orders = (res.body as { data: OrderRow[] }).data;
    expect(orders.length).toBeGreaterThan(0);
    for (const o of orders) {
      expect(o.client_id).toBe(CARLOS_PROFILE_ID);
    }
  });

  it('Joana sees only her own orders', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/orders')
      .set(DEV_USER_ID_HEADER, JOANA_CLERK_ID)
      .expect(200);

    const orders = (res.body as { data: OrderRow[] }).data;
    expect(orders.length).toBeGreaterThan(0);
    for (const o of orders) {
      expect(o.client_id).toBe(JOANA_PROFILE_ID);
    }
  });

  it('Carlos and Joana never share an order id (bidirectional isolation)', async () => {
    const [carlosRes, joanaRes] = await Promise.all([
      request(app.getHttpServer())
        .get('/api/v1/orders')
        .set(DEV_USER_ID_HEADER, CARLOS_CLERK_ID),
      request(app.getHttpServer())
        .get('/api/v1/orders')
        .set(DEV_USER_ID_HEADER, JOANA_CLERK_ID),
    ]);

    const carlosIds = new Set(
      (carlosRes.body as { data: OrderRow[] }).data.map((o) => o.id),
    );
    const joanaIds = new Set(
      (joanaRes.body as { data: OrderRow[] }).data.map((o) => o.id),
    );

    for (const id of joanaIds) expect(carlosIds.has(id)).toBe(false);
    for (const id of carlosIds) expect(joanaIds.has(id)).toBe(false);
  });

  it('Professional profile gets 403 on /v1/orders', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/orders')
      .set(DEV_USER_ID_HEADER, PROFESSIONAL_CLERK_ID)
      .expect(403);
  });

  it('Unknown clerk_id gets 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/orders')
      .set(DEV_USER_ID_HEADER, 'ghost_user_does_not_exist')
      .expect(401);
  });
});
