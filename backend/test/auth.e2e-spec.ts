// NOTE: Verifies authentication flows through e2e requests.
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import appConfig from '../src/config/app.config';
import { setupHttpLayer } from '../src/bootstrap/http-app.setup';
import type { ApiEnvelope } from './api-envelope';
import { CSRF_HEADER, fetchCsrf } from './csrf';

function getSetCookie(
  headers: Record<string, string | string[] | undefined>,
): string[] {
  const raw = headers['set-cookie'];
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    return [raw];
  }
  return [];
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const appCfg = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
    setupHttpLayer(app, appCfg);
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('signup creates user and sets session cookies', async () => {
    const agent = request.agent(app.getHttpServer());
    const csrf = await fetchCsrf(agent);
    const email = `signup-e2e-${Date.now()}@example.com`;
    const res = await agent
      .post('/auth/signup')
      .set(CSRF_HEADER, csrf)
      .send({
        name: 'E2E Signup',
        email,
        password: 'Password123',
      })
      .expect(201);
    const body = res.body as ApiEnvelope<{ email: string; id: string }>;
    expect(body.success).toBe(true);
    expect(body.data.email).toBe(email);
    expect(
      getSetCookie(res.headers).some((c) => c.startsWith('access_token=')),
    ).toBe(true);
  });

  it('login, me, refresh, logout with cookie jar', async () => {
    const agent = request.agent(app.getHttpServer());

    const email = `signup-then-login-e2e-${Date.now()}@example.com`;
    const password = 'Password123';

    let csrf = await fetchCsrf(agent);
    await agent
      .post('/auth/signup')
      .set(CSRF_HEADER, csrf)
      .send({ name: 'E2E Session', email, password })
      .expect(201);

    await agent.post('/auth/logout').set(CSRF_HEADER, csrf).expect(200);

    csrf = await fetchCsrf(agent);
    const login = await agent
      .post('/auth/login')
      .set(CSRF_HEADER, csrf)
      .send({ email, password })
      .expect(200);
    expect(
      (login.body as ApiEnvelope<{ email: string; id: string }>).data.email,
    ).toBe(email);

    const me = await agent.get('/auth/me').expect(200);
    expect((me.body as ApiEnvelope<{ id: string }>).data.id).toBe(
      (login.body as ApiEnvelope<{ id: string }>).data.id,
    );

    await agent.post('/auth/refresh').set(CSRF_HEADER, csrf).expect(401);

    await agent.post('/auth/logout').set(CSRF_HEADER, csrf).expect(200);

    await agent.get('/auth/me').expect(401);
  });
});
