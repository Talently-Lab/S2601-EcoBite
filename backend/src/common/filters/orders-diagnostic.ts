import { Prisma } from '@prisma/client';
import { isAbsolute, relative, resolve, sep } from 'path';

type Frame = { file: string; line: number; column: number };
export type OrdersDiagnostic = {
  errorName: string;
  message: string;
  stack?: Frame[];
  prismaCode?: string;
  cause?: OrdersDiagnostic;
};

const errorClasses = {
  PrismaClientKnownRequestError: Prisma.PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError: Prisma.PrismaClientUnknownRequestError,
  PrismaClientValidationError: Prisma.PrismaClientValidationError,
  PrismaClientInitializationError: Prisma.PrismaClientInitializationError,
  PrismaClientRustPanicError: Prisma.PrismaClientRustPanicError,
  TypeError,
  RangeError,
  SyntaxError,
  ReferenceError,
  AggregateError,
  Error,
};
const packages = new Set([
  'pg',
  'pg-pool',
  'pg-protocol',
  '@prisma/client',
  '@prisma/adapter-pg',
  '@prisma/driver-adapter-utils',
  '@nestjs/core',
  '@nestjs/passport',
  'passport',
  'passport-jwt',
]);

function read(value: unknown, key: string): unknown {
  try {
    return typeof value === 'object' && value !== null
      ? Reflect.get(value, key)
      : undefined;
  } catch {
    return undefined;
  }
}

export function sanitizeDiagnosticMessage(value: unknown): string {
  if (typeof value !== 'string' || value.length > 8192)
    return 'Diagnostic details omitted';
  const lines: string[] = [];
  for (const line of value.split(/\r?\n/).slice(0, 32)) {
    if (
      /\b(?:SELECT\s|INSERT\s+INTO|UPDATE\s+\S+\s+SET|DELETE\s+FROM|ALTER\s+TABLE|CREATE\s+TABLE)|^\s*(?:WITH|DROP|TRUNCATE|GRANT|REVOKE|EXPLAIN|COPY|DO|SET)\b|\bprisma\.\w+\.\w+\(|\bKey\s*\([^)]*\)\s*=|\b(?:query|sql|statement|detail|context|parameters|arguments)\s*[:=]|[{}]/i.test(
        line,
      )
    ) {
      lines.push('[query or arguments omitted]');
      break;
    }
    lines.push(
      line
        .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, '[URL REDACTED]')
        .replace(/\bBearer\s+\S+/gi, '[TOKEN REDACTED]')
        .replace(
          /\b(?:npg_|ghp_|github_pat_|sk_live_|sk-proj-)[A-Za-z0-9_-]+\b/gi,
          '[TOKEN REDACTED]',
        )
        .replace(
          /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
          '[TOKEN REDACTED]',
        )
        .replace(
          /\b[A-Za-z0-9_-]*(?:password|passwd|pwd|secret|token|api[-_ ]?key|authorization|cookie|database_url|connectionstring|dsn|email|phone|address|user|name)[A-Za-z0-9_-]*\b\s*(?:[:=]|\bis\b).*$/gi,
          '[SENSITIVE DETAILS REDACTED]',
        )
        .replace(
          /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
          '[EMAIL REDACTED]',
        )
        .replace(
          /\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi,
          '[ID REDACTED]',
        )
        .replace(/\+?\d[\d ()-]{7,}\d/g, '[NUMBER REDACTED]')
        .replace(/(["'])[^"'\r\n]*\1/g, '[VALUE REDACTED]')
        .replace(/(?:[A-Za-z]:\\|\/)[^\s]+/g, '[PATH REDACTED]')
        .split('')
        .map((character) => {
          const code = character.charCodeAt(0);
          return code < 32 || code === 127 ? ' ' : character;
        })
        .join(''),
    );
  }
  return lines.join(' ').trim().slice(0, 1024) || 'Diagnostic details omitted';
}

function frames(value: unknown): Frame[] {
  if (typeof value !== 'string' || value.length > 16384) return [];
  const root = resolve(
    __dirname,
    __filename.endsWith('.js') ? '../../../..' : '../../..',
  );
  const result: Frame[] = [];
  for (const line of value.split('\n').slice(1, 33)) {
    const match =
      /^\s+at (?:[^()\r\n]+ \()?([^()\r\n]+):([1-9][0-9]{0,6}):([1-9][0-9]{0,6})\)?$/.exec(
        line,
      );
    if (!match || !isAbsolute(match[1])) continue;
    const file = relative(root, match[1]).split(sep).join('/');
    if (!/^[A-Za-z0-9_@./+-]+\.(?:[cm]?js|ts)$/.test(file)) continue;
    if (file.split('/').includes('..')) continue;
    const dependency = file.lastIndexOf('node_modules/');
    if (dependency >= 0) {
      const dependencyPath = file.slice(dependency + 'node_modules/'.length);
      const parts = dependencyPath.split('/');
      const name = parts[0].startsWith('@')
        ? parts.slice(0, 2).join('/')
        : parts[0];
      if (!packages.has(name)) continue;
      result.push({
        file: `node_modules/${dependencyPath}`,
        line: Number(match[2]),
        column: Number(match[3]),
      });
    } else if (/^(?:src|dist\/src)\//.test(file)) {
      result.push({ file, line: Number(match[2]), column: Number(match[3]) });
    }
    if (result.length === 8) break;
  }
  return result;
}

function serialize(
  value: unknown,
  depth: number,
  seen: Set<unknown>,
): OrdersDiagnostic {
  let errorName = 'Other';
  try {
    for (const [name, constructor] of Object.entries(errorClasses)) {
      if (value instanceof constructor) {
        errorName = name;
        break;
      }
    }
  } catch {
    // Untrusted exceptions may be proxies with throwing prototype access.
  }
  if (errorName === 'Other')
    return { errorName, message: 'Diagnostic details omitted' };
  seen.add(value);
  const stack = frames(read(value, 'stack'));
  const result: OrdersDiagnostic = {
    errorName,
    message: sanitizeDiagnosticMessage(read(value, 'message')),
    ...(stack.length ? { stack } : {}),
  };
  const code = read(
    value,
    errorName === 'PrismaClientInitializationError' ? 'errorCode' : 'code',
  );
  if (
    errorName.startsWith('PrismaClient') &&
    typeof code === 'string' &&
    /^P[0-9]{4}$/.test(code)
  )
    result.prismaCode = code;
  const cause = read(value, 'cause');
  if (depth < 2 && cause !== undefined && !seen.has(cause))
    result.cause = serialize(cause, depth + 1, seen);
  return result;
}

export function temporaryOrdersDiagnostic(
  exception: unknown,
  env: Partial<
    Pick<
      NodeJS.ProcessEnv,
      'ORDERS_DIAGNOSTICS_ENABLED' | 'ORDERS_DIAGNOSTICS_UNTIL'
    >
  > = process.env,
  now = Date.now(),
): OrdersDiagnostic | undefined {
  const until = env.ORDERS_DIAGNOSTICS_UNTIL;
  if (
    env.ORDERS_DIAGNOSTICS_ENABLED !== 'true' ||
    !until ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(until)
  )
    return undefined;
  const expires = Date.parse(until);
  if (
    !Number.isFinite(expires) ||
    new Date(expires).toISOString() !== until ||
    expires <= now
  )
    return undefined;
  return serialize(exception, 0, new Set());
}

export function diagnosticRequestId(
  value: unknown,
): number | string | undefined {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
    return value;
  if (typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value))
    return value;
  return undefined;
}
