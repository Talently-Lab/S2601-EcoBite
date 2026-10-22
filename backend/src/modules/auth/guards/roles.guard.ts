// NOTE: Enforces role-based access rules on authenticated requests.

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

import { AppException } from '../../../common/errors/app.exception';
import { ErrorCode } from '../../../common/errors/error-codes';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndMerge<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{
      user?: Express.User;
    }>();

    if (!user) {
      throw new AppException(ErrorCode.AUTH_UNAUTHENTICATED);
    }

    if (!required.includes(user.role)) {
      throw new AppException(ErrorCode.AUTH_FORBIDDEN);
    }

    return true;
  }
}
