// NOTE: Verifies authentication controller delegation and responses.
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { makeUserSafe } from './fixtures/user.fixtures';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    completeSignup: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    issueCsrfCookie: jest.Mock;
    logout: jest.Mock;
    me: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      completeSignup: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      issueCsrfCookie: jest.fn(),
      logout: jest.fn(),
      me: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  describe('signUp', () => {
    it('delegates to completeSignup and returns the user', async () => {
      const safe = makeUserSafe();
      authService.completeSignup.mockResolvedValue(safe);
      const dto = { name: safe.name, email: safe.email, password: 'P@ss1' };

      const out = await controller.signUp(dto, {} as Response);
      expect(authService.completeSignup).toHaveBeenCalledWith(
        dto,
        expect.any(Object),
      );
      expect(out).toEqual(safe);
    });
  });

  describe('logIn', () => {
    it('delegates to login with DTO credentials', async () => {
      const safe = makeUserSafe();
      authService.login.mockResolvedValue(safe);
      const res = {} as Response;

      const out = await controller.logIn(
        { email: safe.email, password: 'x' },
        res,
      );
      expect(authService.login).toHaveBeenCalledWith(safe.email, 'x', res);
      expect(out).toEqual(safe);
    });
  });

  describe('logout', () => {
    it('devuelve envelope { ok: true }', async () => {
      authService.logout.mockResolvedValue(undefined);
      await expect(
        controller.logout({ cookies: {} } as never, {} as Response),
      ).resolves.toEqual({ ok: true });
      expect(authService.logout).toHaveBeenCalled();
    });
  });

  describe('csrf', () => {
    it('emite cookie CSRF', () => {
      authService.issueCsrfCookie.mockReturnValue({ token: 'csrf' });
      const res = {} as Response;

      expect(controller.csrf(res)).toEqual({ token: 'csrf' });
      expect(authService.issueCsrfCookie).toHaveBeenCalledWith(res);
    });
  });

  describe('me', () => {
    it('passes the JWT userId to AuthService', async () => {
      const safe = makeUserSafe();
      authService.me.mockResolvedValue(safe);
      const jwtUser = {
        userId: safe.id,
        email: safe.email,
        role: 'CLIENT' as const,
      };

      await expect(controller.me(jwtUser)).resolves.toEqual(safe);
      expect(authService.me).toHaveBeenCalledWith(safe.id);
    });
  });
});
