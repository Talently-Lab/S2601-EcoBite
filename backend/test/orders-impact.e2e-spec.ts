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

    prismaMock.order.aggregate
      .mockResolvedValueOnce({ _sum: { co2SavedG: 489 } })
      .mockResolvedValueOnce({
        _sum: { co2SavedG: 100 },
        _count: { _all: 3 },
      });

    prismaMock.order.count.mockResolvedValue(3);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('rechaza solicitudes sin autenticación', async () => {
    await request(app.getHttpServer()).get('/orders/me/impact').expect(401);
  });

  async function accessToken() {
    const jwtService = app.get(JwtService);
    const auth = app.get<ConfigType<typeof authConfig>>(authConfig.KEY);

    return jwtService.signAsync(
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
  }

  it('devuelve los cuatro indicadores del usuario autenticado sin aceptar otro userId', async () => {
    const token = await accessToken();

    const response = await request(app.getHttpServer())
      .get('/orders/me/impact?userId=another-user')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = response.body as ApiEnvelope<{
      totalCo2SavedG: number;
      ordersWithImpact: number;
      avgCo2SavedG: number;
      sustainableOrdersCount: number;
    }>;

    expect(body.data).toEqual({
      totalCo2SavedG: 489,
      ordersWithImpact: 3,
      avgCo2SavedG: 100 / 3,
      sustainableOrdersCount: 3,
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
    expect(prismaMock.order.aggregate).toHaveBeenNthCalledWith(2, {
      where: { userId, orderStatus: 'COMPLETED', deliveryMethod: 'BIKE' },
      _sum: { co2SavedG: true },
      _count: { _all: true },
    });
    expect(prismaMock.order.aggregate).toHaveBeenCalledTimes(2);
    expect(prismaMock.order.count).toHaveBeenCalledTimes(1);
  });

  it.each([
    { sum: null, count: 0 },
    { sum: 0, count: 2 },
  ])(
    'devuelve promedio cero con suma $sum y denominador $count',
    async ({ sum, count }) => {
      prismaMock.order.aggregate
        .mockReset()
        .mockResolvedValueOnce({ _sum: { co2SavedG: 489 } })
        .mockResolvedValueOnce({
          _sum: { co2SavedG: sum },
          _count: { _all: count },
        });
      const token = await accessToken();

      const response = await request(app.getHttpServer())
        .get('/orders/me/impact')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as ApiEnvelope<{
        totalCo2SavedG: number;
        ordersWithImpact: number;
        avgCo2SavedG: number;
        sustainableOrdersCount: number;
      }>;
      expect(body.data).toEqual({
        totalCo2SavedG: 489,
        ordersWithImpact: 3,
        avgCo2SavedG: 0,
        sustainableOrdersCount: count,
      });
    },
  );
});
