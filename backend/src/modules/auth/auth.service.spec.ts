// NOTE: Verifies authentication service session and token behavior.
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import authConfig from '../../config/auth.config';
import { ErrorCode } from '../../common/errors/error-codes';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from './auth-user.service';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcryptjs';

const mockedCompare = bcrypt.compare as jest.Mock;

const userRow = (
  overrides: Partial<{
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    registeredAt: Date;
    role: UserRole;
  }> = {},
) => ({
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Auth User',
  email: 'auth@example.com',
  passwordHash: 'stored-hash',
  registeredAt: new Date('2026-01-01T00:00:00.000Z'),
  role: UserRole.CLIENT,
  ...overrides,
});

function mockCookies(): Response {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    refreshSession: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };
  let userService: { create: jest.Mock };

  const mockAuthCfg = {
    accessCookieName: 'access_token',
    refreshCookieName: 'refresh_token',
    csrfCookieName: 'csrf_token',
    csrfHeaderName: 'x-csrf-token',
    cookieMaxAge: 900_000,
    refreshCookieMaxAge: 7 * 86_400_000,
    cookieSecure: false,
    cookieSameSite: 'strict' as const,
    cookieDomain: undefined,
    jwtIssuer: 'iss',
    jwtAudience: 'aud',
  };

  beforeEach(async () => {
    jwtService = { signAsync: jest.fn().mockResolvedValue('access.jwt') };
    userService = { create: jest.fn() };
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      refreshSession: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn(async (arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: typeof prisma) => unknown)(prisma);
        }
        if (Array.isArray(arg)) {
          await Promise.all(
            arg.map((op: unknown) =>
              Promise.resolve(op as PromiseLike<unknown>),
            ),
          );
        }
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: authConfig.KEY, useValue: mockAuthCfg },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    mockedCompare.mockReset();
    mockedCompare.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockedCompare.mockReset();
    mockedCompare.mockResolvedValue(false);
  });

  describe('login', () => {
    it('rejects login when the password is incorrect', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow());
      mockedCompare.mockResolvedValueOnce(false);

      await expect(
        service.login('auth@example.com', 'wrong-password', mockCookies()),
      ).rejects.toMatchObject({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS.code,
      });

      expect(mockedCompare).toHaveBeenCalledWith(
        'wrong-password',
        'stored-hash',
      );
    });

    it('lanza AUTH_INVALID_CREDENTIALS si bcrypt no coincide', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow());

      mockedCompare.mockResolvedValueOnce(false);

      await expect(
        service.login('auth@example.com', 'wrong', mockCookies()),
      ).rejects.toMatchObject({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS.code,
      });
    });

    it('sets the access cookie and returns UserSafe with valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow());
      mockedCompare.mockResolvedValueOnce(true);

      const res = mockCookies();

      const out = await service.login('auth@example.com', 'good', res);

      expect(out).toEqual({
        id: userRow().id,
        name: userRow().name,
        email: userRow().email,
        registeredAt: userRow().registeredAt,
      });

      expect(mockedCompare).toHaveBeenCalledWith('good', 'stored-hash');

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: userRow().id,
        email: userRow().email,
      });

      expect(res.cookie as jest.Mock).toHaveBeenCalledWith(
        'access_token',
        'access.jwt',
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('treats a missing user as invalid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login('missing@example.com', 'x', mockCookies()),
      ).rejects.toMatchObject({
        code: ErrorCode.AUTH_INVALID_CREDENTIALS.code,
      });
    });
  });

  describe('completeSignup', () => {
    it('delegates creation to UserService and throws INTERNAL_ERROR if the user cannot be read from the database', async () => {
      const createdSafe = {
        id: userRow().id,
        name: userRow().name,
        email: userRow().email,
        registeredAt: userRow().registeredAt,
      };

      userService.create.mockResolvedValue(createdSafe);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.completeSignup(
          {
            name: createdSafe.name,
            email: createdSafe.email,
            password: 'P@ss1234',
          },
          mockCookies(),
        ),
      ).rejects.toMatchObject({ code: ErrorCode.INTERNAL_ERROR.code });
    });
  });

  describe('refresh', () => {
    it('returns AUTH_REFRESH_INVALID without a refresh cookie', async () => {
      const req = { cookies: {} } as unknown as Request;

      await expect(service.refresh(req, mockCookies())).rejects.toMatchObject({
        code: ErrorCode.AUTH_REFRESH_INVALID.code,
      });
    });

    it('returns AUTH_REFRESH_INVALID when a refresh cookie is provided', async () => {
      const req = {
        cookies: { refresh_token: 'some-refresh-token' },
      } as unknown as Request;

      await expect(service.refresh(req, mockCookies())).rejects.toMatchObject({
        code: ErrorCode.AUTH_REFRESH_INVALID.code,
      });
    });
  });

  describe('logout', () => {
    it('clears authentication cookies without a refresh cookie', async () => {
      const res = mockCookies();

      await service.logout({ cookies: {} } as unknown as Request, res);

      expect(res.clearCookie as jest.Mock).toHaveBeenCalledTimes(3);
      expect(res.clearCookie as jest.Mock).toHaveBeenCalledWith(
        mockAuthCfg.accessCookieName,
        expect.any(Object),
      );
      expect(res.clearCookie as jest.Mock).toHaveBeenCalledWith(
        mockAuthCfg.refreshCookieName,
        expect.any(Object),
      );
      expect(res.clearCookie as jest.Mock).toHaveBeenCalledWith(
        mockAuthCfg.csrfCookieName,
        expect.any(Object),
      );
    });

    it('clears authentication cookies when a refresh cookie exists', async () => {
      const res = mockCookies();

      await service.logout(
        {
          cookies: { refresh_token: 'some-refresh-token' },
        } as unknown as Request,
        res,
      );

      expect(res.clearCookie as jest.Mock).toHaveBeenCalledTimes(3);
    });
  });

  describe('me', () => {
    it('returns AUTH_UNAUTHENTICATED when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.me(userRow().id)).rejects.toMatchObject({
        code: ErrorCode.AUTH_UNAUTHENTICATED.code,
      });
    });

    it('returns UserSafe when the user exists', async () => {
      const user = userRow();
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.me(user.id);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: user.id },
      });

      expect(result).toEqual({
        id: user.id,
        name: user.name,
        email: user.email,
        registeredAt: user.registeredAt,
      });
    });
  });

  describe('clearAuthCookies', () => {
    it('clears auth cookies', () => {
      const res = mockCookies();
      service.clearAuthCookies(res);
      expect(res.clearCookie as jest.Mock).toHaveBeenCalledWith(
        mockAuthCfg.accessCookieName,
        expect.any(Object),
      );
      expect(res.clearCookie as jest.Mock).toHaveBeenCalledWith(
        mockAuthCfg.refreshCookieName,
        expect.any(Object),
      );
      expect(res.clearCookie as jest.Mock).toHaveBeenCalledWith(
        mockAuthCfg.csrfCookieName,
        expect.objectContaining({ httpOnly: false }),
      );
    });
  });
});
