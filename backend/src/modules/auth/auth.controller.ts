// NOTE: Exposes authentication, session, CSRF, and profile endpoints.

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';

import {
  ApiExtraModels,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import type { Request, Response } from 'express';

import { Throttle } from '@nestjs/throttler';

import type { UserSafe } from './auth-user.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthUserResponseDto } from './dto/user-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';

import { wrappedSuccessSchema } from '../../common/swagger/wrapped-success.schema';
import { emailTakenExample } from '../../common/swagger/error-examples';

type AuthSignupPort = {
  completeSignup(dto: SignupDto, res: Response): Promise<UserSafe>;
};

@ApiTags('auth')
@ApiExtraModels(LoginDto, SignupDto, AuthUserResponseDto, LogoutResponseDto)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Public signup',
  })
  @ApiBody({ type: SignupDto })
  @ApiOkResponse({
    description: 'Created user in data; session cookies are set.',
    schema: wrappedSuccessSchema(AuthUserResponseDto, {
      statusCode: 201,
      statusText: 'Created',
      pathExample: '/auth/signup',
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'DTO validation',
  })
  @ApiResponse({
    status: 409,
    description: 'Email ya registrado',
    schema: { example: emailTakenExample },
  })
  async signUp(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserSafe> {
    const auth = this.authService as unknown as AuthSignupPort;

    const user: UserSafe = await auth.completeSignup(dto, res);

    return user;
  }

  @Post('login')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in',
  })
  @ApiOkResponse({
    description: 'User in data; access and refresh cookies are set.',
    schema: wrappedSuccessSchema(AuthUserResponseDto, {
      pathExample: '/auth/login',
    }),
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  logIn(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserSafe> {
    return this.authService.login(dto.email, dto.password, res);
  }

  @Post('refresh')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renew access with refresh cookie',
  })
  @ApiOkResponse({
    schema: wrappedSuccessSchema(AuthUserResponseDto, {
      pathExample: '/auth/refresh',
    }),
  })
  refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserSafe> {
    return this.authService.refresh(req, res);
  }

  @Get('csrf')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Issue CSRF cookie for cookie-based mutations',
  })
  @ApiOkResponse({
    schema: wrappedSuccessSchema(LogoutResponseDto, {
      pathExample: '/auth/csrf',
    }),
  })
  csrf(@Res({ passthrough: true }) res: Response): { token: string } {
    return this.authService.issueCsrfCookie(res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign out and revoke refresh family',
  })
  @ApiOkResponse({
    schema: wrappedSuccessSchema(LogoutResponseDto, {
      pathExample: '/auth/logout',
    }),
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    await this.authService.logout(req, res);

    return { ok: true };
  }

  @Get('me')
  @ApiOperation({
    summary: 'Authenticated user profile',
  })
  @ApiOkResponse({
    schema: wrappedSuccessSchema(AuthUserResponseDto, {
      pathExample: '/auth/me',
    }),
  })
  me(@CurrentUser() user: Express.User): Promise<UserSafe> {
    return this.authService.me(user.userId);
  }
}
