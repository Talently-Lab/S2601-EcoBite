import { INestApplication } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { setupHttpLayer } from '../src/bootstrap/http-app.setup';
import appConfig from '../src/config/app.config';
import authConfig from '../src/config/auth.config';
import { PrismaService } from '../src/prisma/prisma.service';
import type { ApiEnvelope } from './api-envelope';

describe('Orders impact (e2e)', () => {
  let app: INestApplication<App>;

  const userId = 'f07a62df-ca20-450e-bd33-14d7bcbc2cf0';

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
    },
    order: {
      aggregate: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();

    const appCfg = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

    setupHttpLayer(app, appCfg);
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();

    prismaMock.user.findUnique.mockResolvedValue({
      id: userId,
      email: 'maria@example.com',
      role: 'USER',
    });

    prismaMock.order.aggregate.mockResolvedValue({
      _sum: { co2SavedG: 489 },
    });

    prismaMock.order.count.mockResolvedValue(3);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('rechaza solicitudes sin autenticación', async () => {
    await request(app.getHttpServer()).get('/orders/me/impact').expect(401);
  });

  it('devuelve el impacto del usuario solo con CO2 de bicicleta', async () => {
    const jwtService = app.get(JwtService);
    const auth = app.get<ConfigType<typeof authConfig>>(authConfig.KEY);

    const token = await jwtService.signAsync(
      {
        sub: userId,
        email: 'maria@example.com',
      },
      {
        secret: auth.jwtAccessSecret,
        issuer: auth.jwtIssuer,
        audience: auth.jwtAudience,
        expiresIn: '15m',
      },
    );

    const response = await request(app.getHttpServer())
      .get('/orders/me/impact')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = response.body as ApiEnvelope<{
      totalCo2SavedG: number;
      ordersWithImpact: number;
    }>;

    expect(body.data).toEqual({
      totalCo2SavedG: 489,
      ordersWithImpact: 3,
    });

    expect(prismaMock.order.aggregate).toHaveBeenCalledWith({
      where: {
        userId,
        deliveryMethod: 'BIKE',
      },
      _sum: {
        co2SavedG: true,
      },
    });

    expect(prismaMock.order.count).toHaveBeenCalledWith({
      where: {
        userId,
        co2SavedG: { gt: 0 },
      },
    });
  });
});
