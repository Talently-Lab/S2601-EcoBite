import {
  INestApplication,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Prisma, UserRole } from '@prisma/client';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types';

import { DashboardService } from '../src/modules/dashboard/dashboard.service';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';
import { DashboardController } from '../src/modules/dashboard/dashboard.controller';
import type { DashboardStatsResponseDto } from '../src/modules/dashboard/dto/dashboard-stats-response.dto';
import type { ApiEnvelope } from './api-envelope';

describe('Dashboard (e2e)', () => {
  let app: INestApplication<App>;

  const prisma = {
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    restaurant: {
      findMany: jest.fn(),
    },
    user: { count: jest.fn() },
  };

  const testAuthGuard: CanActivate = {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest<{
        headers: Record<string, string | string[] | undefined>;
        user?: { role: UserRole };
      }>();

      const role = req.headers['x-test-role'];

      if (role !== 'ADMIN' && role !== 'CLIENT') {
        throw new UnauthorizedException('No auth token');
      }

      req.user = {
        role: role === 'ADMIN' ? UserRole.ADMIN : UserRole.CLIENT,
      };

      return true;
    },
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: APP_GUARD,
          useValue: testAuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: RolesGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.order.count.mockResolvedValue(0);
    prisma.order.aggregate.mockResolvedValue({
      _sum: { totalAmount: null, co2SavedG: null },
      _avg: { totalAmount: null },
      _count: { _all: 0 },
    });
    prisma.user.count.mockResolvedValue(0);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /dashboard/stats', () => {
    it('conserva los campos acumulados y agrega comparacion con ceros sin datos', async () => {
      const response = await request(app.getHttpServer())
        .get('/dashboard/stats')
        .set('x-test-role', 'ADMIN')
        .expect(200);
      const { data } = response.body as ApiEnvelope<DashboardStatsResponseDto>;
      const metrics = {
        completedOrders: 0,
        totalRevenue: '0.00',
        averageTicket: 0,
        registeredUsers: 0,
        co2SavedG: 0,
        avgCo2SavedG: 0,
      };
      expect(data).toMatchObject({
        ...metrics,
        comparison: {
          timeZone: 'America/Argentina/Buenos_Aires',
          current: metrics,
          previous: metrics,
          percentageChange: { ...metrics, totalRevenue: 0 },
        },
      });
      expect(
        new Date(data.comparison.current.startInclusive)
          .toISOString()
          .endsWith('T03:00:00.000Z'),
      ).toBe(true);
      expect(data.comparison.previous.endExclusive).toBe(
        data.comparison.current.startInclusive,
      );
      for (const period of [
        data.comparison.current,
        data.comparison.previous,
      ]) {
        expect(
          new Date(period.endExclusive).getTime() -
            new Date(period.startInclusive).getTime(),
        ).toBe(30 * 24 * 60 * 60 * 1000);
      }
      expect(Object.keys(data).sort()).toEqual(
        [...Object.keys(metrics), 'comparison'].sort(),
      );
    });

    it('serializa promedios fraccionarios y variaciones null sin cambiar los campos existentes', async () => {
      for (const value of [1000, 100, 0]) {
        prisma.order.aggregate
          .mockResolvedValueOnce({
            _sum: { totalAmount: new Prisma.Decimal(value) },
            _avg: {
              totalAmount: value ? new Prisma.Decimal(value).div(3) : null,
            },
          })
          .mockResolvedValueOnce({
            _sum: { co2SavedG: value },
            _count: { _all: value ? 3 : 0 },
          });
      }
      prisma.order.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0);
      prisma.user.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0);

      const response = await request(app.getHttpServer())
        .get('/dashboard/stats')
        .set('x-test-role', 'ADMIN')
        .expect(200);
      const { data } = response.body as ApiEnvelope<DashboardStatsResponseDto>;
      expect(data.totalRevenue).toBe('1000.00');
      expect(data.registeredUsers).toBe(5);
      expect(data.comparison.current.avgCo2SavedG).toBe(100 / 3);
      expect(data.comparison.current.averageTicket).toBe(100 / 3);
      expect(Object.values(data.comparison.percentageChange)).toEqual([
        null,
        null,
        null,
        null,
        null,
        null,
      ]);
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { role: UserRole.CLIENT },
      });
    });

    it('rechaza solicitudes sin autenticacion con 401', async () => {
      await request(app.getHttpServer()).get('/dashboard/stats').expect(401);
      expect(prisma.order.aggregate).not.toHaveBeenCalled();
    });

    it('rechaza usuarios CLIENT con 403', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/stats')
        .set('x-test-role', 'CLIENT')
        .expect(403);
      expect(prisma.user.count).not.toHaveBeenCalled();
    });

    it('documenta metricas, periodos y porcentajes nullable en Swagger', () => {
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().build(),
      );
      const schemas = document.components?.schemas;
      expect(schemas?.DashboardStatsResponseDto).toMatchObject({
        properties: {
          completedOrders: { type: 'number' },
          totalRevenue: { type: 'string' },
          averageTicket: { type: 'number' },
          registeredUsers: { type: 'number' },
          co2SavedG: { type: 'number' },
          avgCo2SavedG: { type: 'number' },
          comparison: {
            allOf: [{ $ref: '#/components/schemas/DashboardComparisonDto' }],
          },
        },
      });
      expect(schemas?.DashboardPercentageChangeDto).toMatchObject({
        properties: {
          totalRevenue: { type: 'number', nullable: true },
          avgCo2SavedG: { type: 'number', nullable: true },
        },
      });
    });
  });

  describe('GET /dashboard/recent-orders', () => {
    it('devuelve 200 para ADMIN', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/dashboard/recent-orders')
        .set('x-test-role', 'ADMIN')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('rechaza solicitudes sin autenticación con 401', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/recent-orders')
        .expect(401);
    });

    it('rechaza usuarios CLIENT con 403', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/recent-orders')
        .set('x-test-role', 'CLIENT')
        .expect(403);
    });
  });

  describe('GET /dashboard/impact-ranking', () => {
    it('devuelve 200 para ADMIN', async () => {
      prisma.restaurant.findMany.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/dashboard/impact-ranking')
        .set('x-test-role', 'ADMIN')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('rechaza solicitudes sin autenticación con 401', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/impact-ranking')
        .expect(401);
    });

    it('rechaza usuarios CLIENT con 403', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/impact-ranking')
        .set('x-test-role', 'CLIENT')
        .expect(403);
    });
  });
});
