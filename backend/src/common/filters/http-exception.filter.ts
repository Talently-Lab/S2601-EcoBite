import type { ArgumentsHost } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import {
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'http';
import { isAbsolute, relative, resolve, sep } from 'path';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { AppException } from '../errors/app.exception';
import { ErrorCode } from '../errors/error-codes';
import { mapOrmUniqueViolationToAppException } from '../errors/unique-violation.map';
import { VALIDATION_FAILED_KEY } from '../validation/validation-bad-request';
import {
  INTERNAL_ERROR_HTTP_STATUS,
  isInvalidJsonBadRequest,
  isLegacyValidationArrayMessage,
  messageFromHttpExceptionBody,
} from './http-exception.filter.helpers';
import { Prisma } from '@prisma/client';
import {
  diagnosticRequestId,
  temporaryOrdersDiagnostic,
} from './orders-diagnostic';

const diagnosticErrorClasses = {
  PrismaClientKnownRequestError: Prisma.PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError: Prisma.PrismaClientUnknownRequestError,
  PrismaClientValidationError: Prisma.PrismaClientValidationError,
  PrismaClientInitializationError: Prisma.PrismaClientInitializationError,
  PrismaClientRustPanicError: Prisma.PrismaClientRustPanicError,
  TypeError,
  RangeError,
  SyntaxError,
  ReferenceError,
  Error,
};

const diagnosticFiles = new Set([
  'modules/orders/orders.service',
  'modules/orders/orders.controller',
  'modules/auth/strategies/jwt.strategy',
  'modules/auth/guards/jwt-auth.guard',
  'modules/auth/guards/csrf.guard',
  'modules/auth/guards/roles.guard',
  'prisma/prisma.service',
  'common/interceptors/response.interceptor',
  'common/pipes/custom-validation.pipe',
]);

const diagnosticMessages = new Set([
  'DATABASE_URL is not set',
  'Internal server error',
  'Internal Server Error',
]);

function diagnosticMessage(exception: unknown): string {
  try {
    if (exception instanceof Error) {
      const message = exception.message;
      if (diagnosticMessages.has(message)) return message;
    }
  } catch {
    // An exception may expose a throwing message getter.
  }
  return 'Unexpected error (details omitted)';
}

function classifyDiagnosticError(exception: unknown): string {
  for (const [label, errorClass] of Object.entries(diagnosticErrorClasses)) {
    if (exception instanceof errorClass) return label;
  }
  return 'Other';
}

function diagnosticPrismaCode(exception: unknown): string | undefined {
  const code =
    exception instanceof Prisma.PrismaClientKnownRequestError
      ? exception.code
      : exception instanceof Prisma.PrismaClientInitializationError
        ? exception.errorCode
        : undefined;
  return typeof code === 'string' &&
    code.length === 5 &&
    /^P[0-9]{4}$/.test(code)
    ? code
    : undefined;
}

function diagnosticStack(exception: unknown): { file: string; line: number }[] {
  if (!(exception instanceof Error)) return [];

  try {
    const stack = exception.stack;
    if (typeof stack !== 'string') return [];

    const backendRoot = resolve(
      __dirname,
      __filename.endsWith('.js') ? '../../../..' : '../../..',
    );
    const frames: { file: string; line: number }[] = [];
    for (const frame of stack.slice(0, 16384).split('\n').slice(1, 33)) {
      const match =
        /^\s+at (?:[^()\r\n]+ \()?([^()\r\n]+):([1-9][0-9]{0,6}):[1-9][0-9]{0,6}\)?$/.exec(
          frame,
        );
      if (!match || !isAbsolute(match[1])) continue;

      const file = relative(backendRoot, match[1]).split(sep).join('/');
      const ownFile = /^(?:src\/(.+)\.ts|dist\/src\/(.+)\.js)$/.exec(file);
      if (ownFile && diagnosticFiles.has(ownFile[1] ?? ownFile[2])) {
        frames.push({ file, line: Number(match[2]) });
        if (frames.length === 5) break;
      }
    }
    return frames;
  } catch {
    return [];
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const err = mapOrmUniqueViolationToAppException(exception) ?? exception;

    const status: number =
      err instanceof HttpException
        ? err.getStatus()
        : INTERNAL_ERROR_HTTP_STATUS;

    if (
      status === INTERNAL_ERROR_HTTP_STATUS &&
      request.method === 'POST' &&
      request.path === '/api/orders'
    ) {
      const prismaCode = diagnosticPrismaCode(exception);
      const stack = diagnosticStack(exception);
      const location = stack[0];
      const temporary = temporaryOrdersDiagnostic(exception);
      const requestId = diagnosticRequestId(request.id);
      this.logger.error(
        {
          errorType: classifyDiagnosticError(exception),
          message: diagnosticMessage(exception),
          method: request.method,
          path: request.path,
          ...(prismaCode ? { prismaCode } : {}),
          ...(location ? { location } : {}),
          ...(stack.length ? { stack } : {}),
          ...(temporary
            ? {
                ...temporary,
                ...(requestId !== undefined ? { requestId } : {}),
              }
            : {}),
        },
        'Unhandled HTTP exception',
      );
    }

    const exceptionResponse =
      err instanceof HttpException
        ? err.getResponse()
        : 'Internal server error';

    let message: unknown;
    let validationErrors: unknown;
    const invalidJson = isInvalidJsonBadRequest(err);

    if (err instanceof BadRequestException) {
      const raw = err.getResponse();
      if (typeof raw === 'object' && raw !== null) {
        const rec = raw as Record<string, unknown>;
        if (rec[VALIDATION_FAILED_KEY] === true && Array.isArray(rec.errors)) {
          message =
            typeof rec.message === 'string'
              ? rec.message
              : ErrorCode.VALIDATION_ERROR.message;
          validationErrors = rec.errors;
        } else if (isLegacyValidationArrayMessage(err)) {
          const msgs = rec.message;
          message = ErrorCode.VALIDATION_ERROR.message;
          validationErrors = [
            {
              property: 'body',
              messages: Array.isArray(msgs) ? msgs.map(String) : [],
            },
          ];
        }
      }
    }

    if (invalidJson) {
      message = ErrorCode.INVALID_JSON.message;
      validationErrors = [
        {
          property: 'body',
          messages: [ErrorCode.INVALID_JSON.message],
        },
      ];
    } else if (message === undefined) {
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : messageFromHttpExceptionBody(exceptionResponse);
    }

    const body: Record<string, unknown> = {
      success: false,
      statusCode: status,
      statusText: STATUS_CODES[status] ?? 'Unknown',
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    };

    if (validationErrors !== undefined) {
      body.errors = validationErrors;
    }

    if (err instanceof AppException) {
      body.code = err.code;
    } else if (invalidJson) {
      body.code = ErrorCode.INVALID_JSON.code;
    } else if (validationErrors !== undefined) {
      body.code = ErrorCode.VALIDATION_ERROR.code;
    } else if (status === INTERNAL_ERROR_HTTP_STATUS) {
      body.code = ErrorCode.INTERNAL_ERROR.code;
    }

    response.status(status).json(body);
  }
}
