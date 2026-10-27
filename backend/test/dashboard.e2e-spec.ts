import {
  INestApplication,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';

import { DashboardService } from '../src/modules/dashboard/dashboard.service';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';
import { DashboardController } from '../src/modules/dashboard/dashboard.controller';

describe('Dashboard (e2e)', () => {
  let app: INestApplication<App>;

  const prisma = {
    order: {
      findMany: jest.fn(),
    },
    restaurant: {
      findMany: jest.fn(),
    },
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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
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
