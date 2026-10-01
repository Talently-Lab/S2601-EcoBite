// NOTE: Implements signup, login, CSRF, logout, and profile workflows.

import { Inject, Injectable } from '@nestjs/common';

import type { ConfigType } from '@nestjs/config';

import { JwtService } from '@nestjs/jwt';

import type { User } from '@prisma/client';

import * as bcrypt from 'bcryptjs';

import type { CookieOptions, Request, Response } from 'express';

import { PrismaService } from '../../prisma/prisma.service';

import authConfig from '../../config/auth.config';

import { AppException } from '../../common/errors/app.exception';

import { ErrorCode } from '../../common/errors/error-codes';

import { UserService, type UserSafe } from './auth-user.service';

import { SignupDto } from './dto/signup.dto';

import type { JwtAccessPayload } from './strategies/jwt.strategy';

import { generateCsrfToken } from './csrf-token';

function toUserSafe(user: User): UserSafe {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    registeredAt: user.registeredAt,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly auth: ConfigType<typeof authConfig>,
    private readonly userService: UserService,
  ) {}

  private baseCookieOptions(): CookieOptions {
    const domain = this.auth.cookieDomain;
    const sameSite = this.auth.cookieSameSite;
    const secure = this.auth.cookieSecure;

    return {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      ...(domain ? { domain } : {}),
    };
  }

  private attachCsrfCookie(res: Response): string {
    const token = generateCsrfToken();

    res.cookie(this.auth.csrfCookieName, token, {
      ...this.baseCookieOptions(),
      httpOnly: false,
      maxAge: this.auth.cookieMaxAge,
    });

    return token;
  }

  private attachAccessCookie(res: Response, accessToken: string): void {
    res.cookie(this.auth.accessCookieName, accessToken, {
      ...this.baseCookieOptions(),
      maxAge: this.auth.cookieMaxAge,
    });
  }

  clearAuthCookies(res: Response): void {
    const base = this.baseCookieOptions();

    res.clearCookie(this.auth.accessCookieName, base);
    res.clearCookie(this.auth.refreshCookieName, base);
    res.clearCookie(this.auth.csrfCookieName, {
      ...base,
      httpOnly: false,
    });
  }

  issueCsrfCookie(res: Response): { token: string } {
    return { token: this.attachCsrfCookie(res) };
  }

  private async signAccessToken(
    user: Pick<User, 'id' | 'email'>,
  ): Promise<string> {
    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.signAsync(payload);
  }

  private async createAuthSession(
    user: User,
    res: Response,
  ): Promise<UserSafe> {
    const accessToken = await this.signAccessToken(user);

    this.attachAccessCookie(res, accessToken);

    return toUserSafe(user);
  }

  async completeSignup(dto: SignupDto, res: Response): Promise<UserSafe> {
    const created = await this.userService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
    });

    const user = await this.prisma.user.findUnique({
      where: { id: created.id },
    });

    if (!user) {
      throw new AppException(ErrorCode.INTERNAL_ERROR);
    }

    return this.createAuthSession(user, res);
  }

  async login(
    email: string,
    password: string,
    res: Response,
  ): Promise<UserSafe> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    const match = await bcrypt.compare(password, user.passwordHash);

    if (!match) {
      throw new AppException(ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    return this.createAuthSession(user, res);
  }

  refresh(req: Request, res: Response): Promise<UserSafe> {
    void req;
    void res;

    return Promise.reject(new AppException(ErrorCode.AUTH_REFRESH_INVALID));
  }

  logout(req: Request, res: Response): Promise<void> {
    void req;
    this.clearAuthCookies(res);
    return Promise.resolve();
  }

  async me(userId: string): Promise<UserSafe> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppException(ErrorCode.AUTH_UNAUTHENTICATED);
    }

    return toUserSafe(user);
  }
}
