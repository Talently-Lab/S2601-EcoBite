// NOTE: Verifies role-based authorization guard behavior.
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { AppException } from '../../../common/errors/app.exception';
import { ErrorCode } from '../../../common/errors/error-codes';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';
import { mockHttpExecutionContext } from '../../../testing/mock-execution-context';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndMerge: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndMerge: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows when no @Roles metadata (empty required list)', () => {
    reflector.getAllAndMerge.mockReturnValue([]);

    expect(guard.canActivate(mockHttpExecutionContext({ path: '/any' }))).toBe(
      true,
    );
  });

  it('throws AUTH_UNAUTHENTICATED when role required but no user', () => {
    reflector.getAllAndMerge.mockReturnValue([UserRole.ADMIN]);

    let thrown: unknown;

    try {
      guard.canActivate(mockHttpExecutionContext({ path: '/users' }));
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(AppException);
    expect((thrown as AppException).code).toBe(
      ErrorCode.AUTH_UNAUTHENTICATED.code,
    );
  });

  it('throws AUTH_FORBIDDEN when user role not in list', () => {
    reflector.getAllAndMerge.mockReturnValue([UserRole.ADMIN]);

    let thrown: unknown;

    try {
      guard.canActivate(
        mockHttpExecutionContext({
          path: '/users',
          user: {
            userId: '1',
            email: 'client@example.com',
            role: UserRole.CLIENT,
          },
        }),
      );
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(AppException);
    expect((thrown as AppException).code).toBe(ErrorCode.AUTH_FORBIDDEN.code);
  });

  it('allows when user role matches', () => {
    reflector.getAllAndMerge.mockReturnValue([UserRole.ADMIN]);

    expect(
      guard.canActivate(
        mockHttpExecutionContext({
          user: {
            userId: '1',
            email: 'admin@example.com',
            role: UserRole.ADMIN,
          },
        }),
      ),
    ).toBe(true);

    expect(reflector.getAllAndMerge).toHaveBeenCalledWith(
      ROLES_KEY,
      expect.any(Array),
    );
  });
});
