// NOTE: Verifies JWT strategy payload validation behavior.
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import authConfig from '../../../config/auth.config';
import { ErrorCode } from '../../../common/errors/error-codes';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: { user: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-uuid',
          email: 'fresh@example.com',
          role: UserRole.CLIENT,
        }),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        {
          provide: authConfig.KEY,
          useValue: {
            jwtAccessSecret: 'test-secret-at-least-32-chars-long!!',
            jwtIssuer: 'test-issuer',
            jwtAudience: 'test-audience',
            accessCookieName: 'access_token',
          },
        },
      ],
    }).compile();

    strategy = moduleRef.get(JwtStrategy);
  });

  describe('validate', () => {
    it('maps current DB user to Express.User', async () => {
      const out = await strategy.validate({
        sub: 'user-uuid',
        email: 'u@example.com',
      });

      expect(out).toEqual({
        userId: 'user-uuid',
        email: 'fresh@example.com',
        role: UserRole.CLIENT,
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-uuid' },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });
    });

    it('throws AUTH_UNAUTHENTICATED when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        strategy.validate({
          sub: 'nonexistent-user',
          email: 'a@b.co',
        }),
      ).rejects.toMatchObject({
        code: ErrorCode.AUTH_UNAUTHENTICATED.code,
      });
    });

    it('uses the current ADMIN role from the database', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-uuid',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });

      const out = await strategy.validate({
        sub: 'user-uuid',
        email: 'old@example.com',
      });

      expect(out).toEqual({
        userId: 'user-uuid',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });
    });
  });
});
