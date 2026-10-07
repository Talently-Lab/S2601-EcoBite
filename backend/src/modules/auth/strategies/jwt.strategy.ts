// NOTE: Extracts and validates access JWTs for Passport authentication.

import { Inject, Injectable } from '@nestjs/common';

import type { ConfigType } from '@nestjs/config';

import { PassportStrategy } from '@nestjs/passport';

import type { Request } from 'express';

import { ExtractJwt, Strategy } from 'passport-jwt';

import authConfig from '../../../config/auth.config';

import { AppException } from '../../../common/errors/app.exception';

import { ErrorCode } from '../../../common/errors/error-codes';

import { PrismaService } from '../../../prisma/prisma.service';

import { readCookie } from '../auth.utils';

export type JwtAccessPayload = {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(authConfig.KEY)
    auth: ConfigType<typeof authConfig>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null => {
          return readCookie(req, auth.accessCookieName) ?? null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: auth.jwtAccessSecret,
      issuer: auth.jwtIssuer,
      audience: auth.jwtAudience,
    });
  }

  async validate(payload: JwtAccessPayload): Promise<Express.User> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new AppException(ErrorCode.AUTH_UNAUTHENTICATED);
    }

    return {
      userId: user.id,
      email: user.email,
    };
  }
}
