// NOTE: Builds Pino HTTP logger configuration from application settings.
import { RequestMethod } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { IncomingMessage, ServerResponse } from 'http';
import type { LevelWithSilent } from 'pino';
import type { Params } from 'nestjs-pino';
import { err as httpErrorSerializer } from 'pino-std-serializers';
import appConfig from '../../config/app.config';

type HttpRequest = IncomingMessage & {
  id?: number | string;
  originalUrl?: string;
};

function requestPath(req: IncomingMessage): string | undefined {
  const r = req as HttpRequest;
  const raw = r.originalUrl ?? r.url ?? '';
  const pathOnly = raw.split('?')[0];
  return pathOnly || undefined;
}

function slimReqSerializer(req: IncomingMessage): {
  id: number | string | undefined;
  method: string | undefined;
  path: string | undefined;
} {
  const r = req as HttpRequest;
  return {
    id: r.id,
    method: r.method,
    path: requestPath(req),
  };
}

function slimResSerializer(res: ServerResponse): { statusCode: number } {
  return { statusCode: res.statusCode };
}

function httpSuccessMessage(
  req: IncomingMessage,
  res: ServerResponse,
  responseTime: number,
): string {
  const method = req.method ?? '?';
  const path = requestPath(req) ?? req.url ?? '?';
  return `${method} ${path} ${res.statusCode} ${responseTime}ms`;
}

function httpErrorMessage(
  req: IncomingMessage,
  res: ServerResponse,
  error: Error,
): string {
  const method = req.method ?? '?';
  const path = requestPath(req) ?? req.url ?? '?';
  return `${method} ${path} ${res.statusCode} — ${error.message}`;
}

function shouldSkipHttpAccessLog(req: IncomingMessage): boolean {
  const path = requestPath(req) ?? '';
  return path === '/favicon.ico' || path.startsWith('/docs');
}

function httpCompletionLogLevel(
  _req: IncomingMessage,
  res: ServerResponse,
  err?: Error,
): LevelWithSilent {
  if (err) {
    return 'error';
  }
  const { statusCode } = res;
  if (statusCode >= 500) {
    return 'error';
  }
  if (statusCode >= 400) {
    return 'warn';
  }
  return 'info';
}

export function pinoRootParamsFromAppConfig(
  appCfg: ConfigType<typeof appConfig>,
): Params {
  const isProd = appCfg.nodeEnv === 'production';

  return {
    forRoutes: [{ path: '{*path}', method: RequestMethod.ALL }],
    pinoHttp: {
      wrapSerializers: false,
      serializers: {
        req: slimReqSerializer,
        res: slimResSerializer,
        err: httpErrorSerializer,
      },
      customSuccessMessage: httpSuccessMessage,
      customErrorMessage: httpErrorMessage,
      customLogLevel: httpCompletionLogLevel,
      autoLogging: {
        ignore: shouldSkipHttpAccessLog,
      },
      level: appCfg.logLevel ?? (isProd ? 'info' : 'debug'),
      ...(!isProd
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                singleLine: true,
                colorize: true,
                translateTime: 'SYS:standard',
              },
            },
          }
        : {}),
    },
  };
}
