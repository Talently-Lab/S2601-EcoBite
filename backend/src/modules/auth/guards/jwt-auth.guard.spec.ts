// NOTE: Verifies global JWT guard behavior and public route bypasses.
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { AppException } from '../../../common/errors/app.exception';
import { ErrorCode } from '../../../common/errors/error-codes';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { mockHttpExecutionContext } from '../../../testing/mock-execution-context';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
  });

  it('allows @Public() routes without invoking Passport', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    expect(
      guard.canActivate(mockHttpExecutionContext({ path: '/auth/login' })),
    ).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      IS_PUBLIC_KEY,
      expect.any(Array),
    );
  });

  it('allows /docs without authentication', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    expect(
      guard.canActivate(
        mockHttpExecutionContext({ path: '/docs/swagger-json' }),
      ),
    ).toBe(true);
  });

  describe('handleRequest', () => {
    it('rethrows passport error', () => {
      const err = new Error('invalid signature');
      expect(() => guard.handleRequest(err, undefined, undefined)).toThrow(err);
    });

    it('throws AUTH_UNAUTHENTICATED when user is falsy', () => {
      expect(() =>
        guard.handleRequest(
          undefined,
          false as unknown as undefined,
          undefined,
        ),
      ).toThrow(AppException);

      try {
        guard.handleRequest(undefined, null, undefined);
      } catch (e) {
        expect(e).toBeInstanceOf(AppException);
        expect((e as AppException).code).toBe(
          ErrorCode.AUTH_UNAUTHENTICATED.code,
        );
      }
    });

    it('includes JWT info message detail when provided', () => {
      let thrown: unknown;
      try {
        guard.handleRequest(undefined, undefined, {
          message: 'jwt expired',
        } as Error);
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toMatchObject({
        code: ErrorCode.AUTH_UNAUTHENTICATED.code,
        message: 'jwt expired',
      });
    });

    it('falls back when info has non-string message', () => {
      let thrown: unknown;
      try {
        guard.handleRequest(undefined, undefined, {} as Error);
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toMatchObject({
        code: ErrorCode.AUTH_UNAUTHENTICATED.code,
      });
    });

    it('returns user when present', () => {
      const user = {
        userId: 'id',
        email: 'x@y.com',
        role: UserRole.ADMIN,
      } satisfies Express.User;
      expect(guard.handleRequest(undefined, user, undefined)).toBe(user);
    });
  });
});
