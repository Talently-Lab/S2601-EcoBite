import {
  ArgumentsHost,
  BadRequestException,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  type INestApplication,
  Post,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { resolve } from 'path';
import { PassThrough } from 'stream';
import request from 'supertest';
import type { App } from 'supertest/types';
import { LoggerModule, PinoLogger } from 'nestjs-pino';
import appConfig from '../../config/app.config';
import { pinoRootParamsFromAppConfig } from '../logging/pino-root.params';
import { VALIDATION_FAILED_KEY } from '../validation/validation-bad-request';
import { ErrorCode, OrmKnownCodes } from '../errors/error-codes';
import { AppException } from '../errors/app.exception';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let logger: jest.Mocked<Pick<PinoLogger, 'error'>>;

  beforeEach(() => {
    logger = {
      error: jest.fn(),
    };

    filter = new HttpExceptionFilter(logger as unknown as PinoLogger);
  });

  function createHost(opts: {
    res: { status: jest.Mock; json: jest.Mock };
    req: { url: string; path: string; method: string; id?: number | string };
  }): ArgumentsHost {
    const { res, req } = opts;
    return {
      switchToHttp: () => ({
        getResponse: (): typeof res => res,
        getRequest: (): typeof req => req,
      }),
      switchToWs: jest.fn(),
      switchToRpc: jest.fn(),
      getType: jest.fn().mockReturnValue('http'),
    } as unknown as ArgumentsHost;
  }

  function mockRes(): { status: jest.Mock; json: jest.Mock } {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  }

  function mockReq(url = '/api/orders', method = 'POST') {
    return { url, path: url.split('?')[0], method };
  }

  it('temporarily preserves a technical message and a dependency frame without changing the response', () => {
    const enabled = process.env.ORDERS_DIAGNOSTICS_ENABLED;
    const until = process.env.ORDERS_DIAGNOSTICS_UNTIL;
    process.env.ORDERS_DIAGNOSTICS_ENABLED = 'true';
    process.env.ORDERS_DIAGNOSTICS_UNTIL = new Date(
      Date.now() + 60_000,
    ).toISOString();
    try {
      const error = new Error('Connection terminated unexpectedly');
      error.stack = `Error: Connection terminated unexpectedly\n    at query (${resolve(__dirname, '../../../node_modules/pg-pool/index.js')}:45:9)`;
      const res = mockRes();
      filter.catch(error, createHost({ res, req: { ...mockReq(), id: 57 } }));
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 57,
          errorName: 'Error',
          message: 'Connection terminated unexpectedly',
          stack: [
            { file: 'node_modules/pg-pool/index.js', line: 45, column: 9 },
          ],
        }),
        'Unhandled HTTP exception',
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          message: 'Internal server error',
          code: ErrorCode.INTERNAL_ERROR.code,
        }),
      );
      expect(res.json.mock.calls[0][0]).not.toHaveProperty('stack');
    } finally {
      if (enabled === undefined) delete process.env.ORDERS_DIAGNOSTICS_ENABLED;
      else process.env.ORDERS_DIAGNOSTICS_ENABLED = enabled;
      if (until === undefined) delete process.env.ORDERS_DIAGNOSTICS_UNTIL;
      else process.env.ORDERS_DIAGNOSTICS_UNTIL = until;
    }
  });

  it.each([
    ['DATABASE_URL is not set', 'DATABASE_URL is not set'],
    ['Internal server error', 'Internal server error'],
    ['Internal Server Error', 'Internal Server Error'],
    ['postgresql://secret SELECT secret', 'Unexpected error (details omitted)'],
    ['Internal server error\nsecret', 'Unexpected error (details omitted)'],
    [
      'password=secret token=secret user@example.com',
      'Unexpected error (details omitted)',
    ],
  ])('logs only an allowlisted message for %s', (message, expected) => {
    const error = new Error(message);
    error.stack = undefined;
    const res = mockRes();
    filter.catch(
      error,
      createHost({ res, req: mockReq('/api/orders?token=secret') }),
    );

    expect(logger.error).toHaveBeenCalledWith(
      {
        errorType: 'Error',
        message: expected,
        method: 'POST',
        path: '/api/orders',
      },
      'Unhandled HTTP exception',
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('secret');
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      statusCode: 500,
      statusText: 'Internal Server Error',
      timestamp: expect.any(String),
      path: '/api/orders?token=secret',
      message: 'Internal server error',
      code: ErrorCode.INTERNAL_ERROR.code,
    });
  });

  it('reads an allowlisted message only once before logging it', () => {
    const error = new Error();
    error.stack = undefined;
    const readMessage = jest
      .fn()
      .mockReturnValueOnce('Internal server error')
      .mockReturnValue('secret');
    Object.defineProperty(error, 'message', { get: readMessage });
    filter.catch(error, createHost({ res: mockRes(), req: mockReq() }));
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
      'Unhandled HTTP exception',
    );
    expect(readMessage).toHaveBeenCalledTimes(1);
  });

  it.each(['message', 'stack'])(
    'handles a throwing %s getter without changing the response',
    (property) => {
      const error = new Error('secret');
      error.stack = undefined;
      Object.defineProperty(error, property, {
        get: () => {
          throw new Error('secret');
        },
      });
      const res = mockRes();
      filter.catch(error, createHost({ res, req: mockReq() }));
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unexpected error (details omitted)',
        }),
        'Unhandled HTTP exception',
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(JSON.stringify(logger.error.mock.calls)).not.toContain('secret');
    },
  );

  it('adds INTERNAL_ERROR code for bare Error (500)', () => {
    const res = mockRes();
    filter.catch(new Error('unexpected'), createHost({ res, req: mockReq() }));

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        errorType: 'Error',
      }),
      'Unhandled HTTP exception',
    );

    expect(logger.error.mock.calls[0][0]).not.toHaveProperty('errorMessage');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: ErrorCode.INTERNAL_ERROR.code,
        statusCode: 500,
      }),
    );
  });

  it('copies AppException code and status', () => {
    const res = mockRes();
    filter.catch(
      new AppException(ErrorCode.USR_NOT_FOUND),
      createHost({ res, req: mockReq('/users/u') }),
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.USR_NOT_FOUND.code,
        statusCode: 404,
      }),
    );
  });

  it('maps Prisma unique violation to DB_UNIQUE_VIOLATION', () => {
    const res = mockRes();
    const err = new Prisma.PrismaClientKnownRequestError('uniq', {
      code: OrmKnownCodes.PrismaUniqueConstraint,
      clientVersion: 't',
    });
    filter.catch(err, createHost({ res, req: mockReq() }));
    expect(res.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.DB_UNIQUE_VIOLATION.code,
      }),
    );
  });

  it('handles validation errors with VALIDATION_ERROR code', () => {
    const res = mockRes();
    const body = {
      statusCode: 400,
      message: ErrorCode.VALIDATION_ERROR.message,
      error: 'Bad Request',
      [VALIDATION_FAILED_KEY]: true,
      errors: [{ property: 'email', messages: ['invalid'] }],
    };
    filter.catch(
      new BadRequestException(body),
      createHost({ res, req: mockReq() }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.VALIDATION_ERROR.code,
        errors: body.errors,
      }),
    );
  });

  it('detects malformed JSON BadRequest pattern as INVALID_JSON', () => {
    const res = mockRes();
    filter.catch(
      new BadRequestException('Unexpected token o in JSON at position 5'),
      createHost({ res, req: mockReq() }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: ErrorCode.INVALID_JSON.code,
      }),
    );
  });

  it('handles legacy Nest validation array messages', () => {
    const res = mockRes();
    filter.catch(
      new BadRequestException({
        statusCode: 400,
        message: ['a is required'],
      }),
      createHost({ res, req: mockReq() }),
    );
    const payload = res.json.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.code).toBe(ErrorCode.VALIDATION_ERROR.code);
    expect(Array.isArray(payload.errors)).toBe(true);
  });

  it('uses INTERNAL_ERROR branch only when HttpException is not domain AppException', () => {
    const res = mockRes();
    filter.catch(
      new HttpException('generic', HttpStatus.INTERNAL_SERVER_ERROR),
      createHost({ res, req: mockReq() }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        code: ErrorCode.INTERNAL_ERROR.code,
      }),
    );
  });

  it('logs Prisma error code without exposing its message', () => {
    const res = mockRes();

    const err = new Prisma.PrismaClientKnownRequestError(
      'Sensitive database error details',
      {
        code: 'P2022',
        clientVersion: 'test',
      },
    );

    filter.catch(err, createHost({ res, req: mockReq() }));

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        errorType: 'PrismaClientKnownRequestError',
        prismaCode: 'P2022',
      }),
      'Unhandled HTTP exception',
    );

    expect(logger.error.mock.calls[0][0]).not.toHaveProperty('errorMessage');

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it.each([
    [new TypeError('secret'), 'TypeError'],
    [new RangeError('secret'), 'RangeError'],
    [new Error('secret'), 'Error'],
    [
      new Prisma.PrismaClientValidationError('secret', {
        clientVersion: 'test',
      }),
      'PrismaClientValidationError',
    ],
    [
      new Prisma.PrismaClientUnknownRequestError('secret', {
        clientVersion: 'test',
      }),
      'PrismaClientUnknownRequestError',
    ],
    [
      new Prisma.PrismaClientInitializationError('secret', 'test', 'P1001'),
      'PrismaClientInitializationError',
    ],
    [
      new Prisma.PrismaClientRustPanicError('secret', 'test'),
      'PrismaClientRustPanicError',
    ],
    [{ name: 'secret', code: 'P2022', stack: 'secret' }, 'Other'],
    [null, 'Other'],
    ['secret', 'Other'],
  ])(
    'classifies errors without trusting their name: %s',
    (error, errorType) => {
      if (error instanceof Error) {
        error.name = 'secret-name';
        error.stack = undefined;
      }
      filter.catch(error, createHost({ res: mockRes(), req: mockReq() }));
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ errorType }),
        'Unhandled HTTP exception',
      );
      expect(JSON.stringify(logger.error.mock.calls)).not.toContain('secret');
    },
  );

  it.each([
    'P2022',
    'P1001',
    'secret',
    'P2022\n',
    'P2022\nsecret',
    'P20222',
    'p2022',
    'P２０２２',
  ])('validates Prisma code %s', (code) => {
    const error = new Prisma.PrismaClientKnownRequestError('secret', {
      code,
      clientVersion: 'test',
      meta: { password: 'secret' },
    });
    error.stack = undefined;
    filter.catch(error, createHost({ res: mockRes(), req: mockReq() }));
    expect(logger.error).toHaveBeenCalledWith(
      {
        errorType: 'PrismaClientKnownRequestError',
        message: 'Unexpected error (details omitted)',
        method: 'POST',
        path: '/api/orders',
        ...(['P2022', 'P1001'].includes(code) ? { prismaCode: code } : {}),
      },
      'Unhandled HTTP exception',
    );
  });

  it('reports a validated Prisma initialization code', () => {
    const error = new Prisma.PrismaClientInitializationError(
      'secret',
      'test',
      'P1001',
    );
    error.stack = undefined;
    filter.catch(error, createHost({ res: mockRes(), req: mockReq() }));
    expect(logger.error).toHaveBeenCalledWith(
      {
        errorType: 'PrismaClientInitializationError',
        prismaCode: 'P1001',
        message: 'Unexpected error (details omitted)',
        method: 'POST',
        path: '/api/orders',
      },
      'Unhandled HTTP exception',
    );
  });

  it.each([
    ['GET', '/api/orders', 500],
    ['POST', '/api/orders/other', 500],
    ['POST', '/api/orders/', 500],
    ['POST', '/other', 500],
    ['POST', '/api/orders', 400],
    ['POST', '/api/orders', 401],
    ['POST', '/api/orders', 403],
    ['POST', '/api/orders', 404],
    ['POST', '/api/orders', 409],
    ['POST', '/api/orders', 503],
  ])('does not diagnose %s %s with status %s', (method, url, status) => {
    const res = mockRes();
    filter.catch(
      new HttpException('existing response', status),
      createHost({ res, req: mockReq(url, method) }),
    );
    expect(logger.error).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'existing response',
        statusCode: status,
      }),
    );
  });

  it('logs only bounded own-code stack frames and keeps the first location', () => {
    const file = 'src/modules/orders/orders.service.ts';
    const controller = 'src/modules/orders/orders.controller.ts';
    const error = new Error('secret');
    error.stack = [
      'Error: secret',
      `    at secret (${resolve(__dirname, '../../../node_modules/secret.js')}:1:2)`,
      `    at secret (${resolve(__dirname, '../../..', file)}:100:12)`,
      ...Array.from(
        { length: 8 },
        (_, i) =>
          `    at secret (${resolve(__dirname, '../../..', controller)}:${i + 1}:3)`,
      ),
    ].join('\n');
    filter.catch(error, createHost({ res: mockRes(), req: mockReq() }));
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        location: { file, line: 100 },
        stack: [
          { file, line: 100 },
          ...[1, 2, 3, 4].map((line) => ({ file: controller, line })),
        ],
      }),
      'Unhandled HTTP exception',
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('secret');
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
      'node_modules',
    );
  });

  it.each([
    `Error: secret\n${'x'.repeat(16384)}\n`,
    `Error: secret\n${'    at unknown (ignored:1:2)\n'.repeat(32)}`,
  ])('does not inspect stack content beyond its input limits', (prefix) => {
    const error = new Error('secret');
    error.stack = `${prefix}    at query (${resolve(__dirname, '../../modules/orders/orders.service.ts')}:100:12)`;
    filter.catch(error, createHost({ res: mockRes(), req: mockReq() }));
    expect(logger.error.mock.calls[0][0]).not.toHaveProperty('stack');
    expect(logger.error.mock.calls[0][0]).not.toHaveProperty('location');
  });

  it.each([
    'src/modules/orders/orders.service.ts',
    'dist/src/modules/orders/orders.service.js',
    'src/modules/auth/strategies/jwt.strategy.ts',
  ])('extracts only a relative own-code location from %s', (file) => {
    const error = new TypeError('secret');
    const absolute = resolve(__dirname, '../../..', file);
    error.stack = `TypeError: secret\n    at query (${resolve(__dirname, '../../../node_modules/secret.js')}:1:2)\n    at query (${absolute}:100:12)`;
    filter.catch(
      error,
      createHost({ res: mockRes(), req: mockReq('/api/orders?token=secret') }),
    );
    expect(logger.error).toHaveBeenCalledWith(
      {
        errorType: 'TypeError',
        location: { file, line: 100 },
        stack: [{ file, line: 100 }],
        message: 'Unexpected error (details omitted)',
        method: 'POST',
        path: '/api/orders',
      },
      'Unhandled HTTP exception',
    );
  });

  it.each([
    undefined,
    'Error: secret',
    `Error: ${resolve(__dirname, '../../modules/orders/orders.service.ts')}:100:12`,
    `Error: secret\n    at query (${resolve(__dirname, '../../../node_modules/backend/src/modules/orders/orders.service.ts')}:100:12)`,
    `Error: secret\n    at query (${resolve(__dirname, '../../secret.ts')}:100:12)`,
    `Error: secret\n    at query (${resolve(__dirname, '../../modules/orders/orders.service.ts')}?token=secret:100:12)`,
    'Error: secret\n    at query (src/modules/orders/orders.service.ts:100:12)',
    'Error: secret\n    at query (https://secret/src/modules/orders/orders.service.ts:100:12)',
  ])('omits unavailable or untrusted stack locations', (stack) => {
    const error = new Error('secret');
    error.stack = stack;
    filter.catch(error, createHost({ res: mockRes(), req: mockReq() }));
    expect(logger.error).toHaveBeenCalledWith(
      {
        errorType: 'Error',
        message: 'Unexpected error (details omitted)',
        method: 'POST',
        path: '/api/orders',
      },
      'Unhandled HTTP exception',
    );
  });
});

@Controller('orders')
class DiagnosticController {
  constructor(
    @Inject('failure') private readonly failure: { run: () => never },
  ) {}

  @Post()
  create() {
    return this.failure.run();
  }

  @Get()
  list() {
    return this.failure.run();
  }
}

describe('HttpExceptionFilter with Nest and Pino', () => {
  it.each([false, true])('sanitizes JSON (%s)', async (extended) => {
    const enabled = process.env.ORDERS_DIAGNOSTICS_ENABLED;
    const until = process.env.ORDERS_DIAGNOSTICS_UNTIL;
    process.env.ORDERS_DIAGNOSTICS_ENABLED = String(extended);
    process.env.ORDERS_DIAGNOSTICS_UNTIL = new Date(
      Date.now() + 60_000,
    ).toISOString();
    const stream = new PassThrough();
    let output = '';
    stream.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    const params = pinoRootParamsFromAppConfig({
      ...appConfig(),
      nodeEnv: 'production',
      logLevel: 'info',
    });
    const options = params.pinoHttp;
    if (
      !options ||
      typeof options !== 'object' ||
      Array.isArray(options) ||
      !('serializers' in options)
    ) {
      throw new Error('Expected Pino HTTP options');
    }
    const error = new Prisma.PrismaClientKnownRequestError(
      extended
        ? 'Connection terminated unexpectedly\npassword=secret-password'
        : 'secret-message postgresql://secret-connection SELECT secret-sql',
      {
        code: 'P2022',
        clientVersion: 'test',
        meta: { password: 'secret-metadata' },
      },
    );
    error.name = 'secret-name';
    error.stack = `Error: secret-stack\n    at query (${resolve(__dirname, '../../modules/orders/orders.service.ts')}:100:12)`;
    if (extended) {
      error.stack += `\n    at query (${resolve(__dirname, '../../../node_modules/pg-pool/index.js')}:45:9)`;
      Object.defineProperty(error, 'cause', {
        value: new Error('Socket closed password=secret-cause'),
      });
    }
    const failure = {
      run: jest.fn(() => {
        throw error;
      }),
    };
    const fixture = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({ ...params, pinoHttp: [options, stream] }),
      ],
      controllers: [DiagnosticController],
      providers: [
        { provide: 'failure', useValue: failure },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
      ],
    }).compile();
    const app: INestApplication<App> = fixture.createNestApplication({
      logger: false,
    });
    app.setGlobalPrefix('api');
    try {
      await app.init();
      const response = await request(app.getHttpServer())
        .post('/api/orders?token=secret-query')
        .set('Authorization', 'Bearer secret-token')
        .set('Cookie', 'session=secret-cookie')
        .set('X-Secret', 'secret-header')
        .send({ password: 'secret-password', payload: 'secret-body' })
        .expect(500);
      expect(response.body).toEqual({
        success: false,
        statusCode: 500,
        statusText: 'Internal Server Error',
        timestamp: expect.any(String),
        path: '/api/orders?token=secret-query',
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      });
      await request(app.getHttpServer()).get('/api/orders').expect(500);
      const records = output
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as Record<string, unknown>);
      const diagnostics = records.filter(
        (record) => record.msg === 'Unhandled HTTP exception',
      );
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]).toEqual({
        level: 50,
        time: expect.any(Number),
        pid: expect.any(Number),
        hostname: expect.any(String),
        req: { id: expect.any(Number), method: 'POST', path: '/api/orders' },
        message: extended
          ? 'Connection terminated unexpectedly [SENSITIVE DETAILS REDACTED]'
          : 'Unexpected error (details omitted)',
        method: 'POST',
        path: '/api/orders',
        errorType: 'PrismaClientKnownRequestError',
        prismaCode: 'P2022',
        location: { file: 'src/modules/orders/orders.service.ts', line: 100 },
        stack: extended
          ? [
              {
                file: 'src/modules/orders/orders.service.ts',
                line: 100,
                column: 12,
              },
              { file: 'node_modules/pg-pool/index.js', line: 45, column: 9 },
            ]
          : [{ file: 'src/modules/orders/orders.service.ts', line: 100 }],
        ...(extended
          ? {
              errorName: 'PrismaClientKnownRequestError',
              requestId: expect.any(Number),
              cause: expect.objectContaining({
                errorName: 'Error',
                message: 'Socket closed [SENSITIVE DETAILS REDACTED]',
              }),
            }
          : {}),
        msg: 'Unhandled HTTP exception',
      });
      const accessLogs = records.filter(
        (record) => record.msg !== 'Unhandled HTTP exception',
      );
      expect(accessLogs).toHaveLength(2);
      for (const [index, method] of ['POST', 'GET'].entries()) {
        expect(accessLogs[index]).toEqual(
          expect.objectContaining({
            req: {
              id: expect.any(Number),
              method,
              path: '/api/orders',
            },
            res: { statusCode: 500 },
            err: expect.objectContaining({
              type: 'Error',
              message: 'failed with status code 500',
            }),
            msg: `${method} /api/orders 500 — failed with status code 500`,
          }),
        );
      }
      expect(output).not.toContain('secret-');
      expect(output).not.toContain('postgresql://');
      const diagnosticOutput = JSON.stringify(diagnostics);
      expect(diagnosticOutput).not.toContain('secret-');
      expect(diagnosticOutput).not.toContain(
        JSON.stringify(resolve(__dirname, '../../..')).slice(1, -1),
      );
      expect(diagnosticOutput).not.toContain('postgresql://');
      expect(failure.run).toHaveBeenCalledTimes(2);
      if (extended)
        expect(diagnostics[0].requestId).toBe(
          (diagnostics[0].req as { id: number }).id,
        );
    } finally {
      await app.close();
      stream.destroy();
      if (enabled === undefined) delete process.env.ORDERS_DIAGNOSTICS_ENABLED;
      else process.env.ORDERS_DIAGNOSTICS_ENABLED = enabled;
      if (until === undefined) delete process.env.ORDERS_DIAGNOSTICS_UNTIL;
      else process.env.ORDERS_DIAGNOSTICS_UNTIL = until;
    }
  });
});
