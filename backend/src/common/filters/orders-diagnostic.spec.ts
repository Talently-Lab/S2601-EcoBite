import { Prisma } from '@prisma/client';
import { resolve } from 'path';
import {
  diagnosticRequestId,
  sanitizeDiagnosticMessage,
  temporaryOrdersDiagnostic,
} from './orders-diagnostic';

const now = Date.parse('2026-11-05T11:00:00.000Z');
const active = {
  ORDERS_DIAGNOSTICS_ENABLED: 'true',
  ORDERS_DIAGNOSTICS_UNTIL: '2026-11-05T11:15:00.000Z',
};

describe('temporary orders diagnostic', () => {
  it.each([
    {},
    { ...active, ORDERS_DIAGNOSTICS_ENABLED: 'false' },
    { ...active, ORDERS_DIAGNOSTICS_UNTIL: undefined },
    { ...active, ORDERS_DIAGNOSTICS_UNTIL: 'invalid' },
    { ...active, ORDERS_DIAGNOSTICS_UNTIL: '2026-02-30T11:15:00.000Z' },
    { ...active, ORDERS_DIAGNOSTICS_UNTIL: '2026-11-05T11:15:00+00:00' },
    { ...active, ORDERS_DIAGNOSTICS_UNTIL: '2026-11-05T11:00:00.000Z' },
  ])(
    'keeps extended diagnostics disabled for invalid or expired configuration',
    (env) => {
      expect(
        temporaryOrdersDiagnostic(new Error('technical'), env, now),
      ).toBeUndefined();
    },
  );

  it('does not inspect the exception while disabled', () => {
    const error = new Proxy(
      {},
      {
        get: () => {
          throw new Error('synthetic-secret');
        },
      },
    );
    expect(temporaryOrdersDiagnostic(error, {}, now)).toBeUndefined();
  });

  it.each([
    'Connection failed password=synthetic-secret with spaces',
    'Connection failed access_token=synthetic-secret',
    'Connection failed client_secret=synthetic-secret',
    'Connection failed refreshToken=synthetic-secret',
    'Connection failed user=synthetic-secret',
    'Connection failed postgresql://user:synthetic-secret@host/db',
    'Connection failed https://example.test/?token=synthetic-secret',
    'Connection failed Authorization: Bearer synthetic-secret',
    'Connection failed Cookie: session=synthetic-secret',
    'Connection failed email=person@synthetic.test',
    'Connection failed npg_syntheticSecret123456',
    'Connection failed "synthetic-secret"',
  ])('redacts identifiable sensitive text: %s', (message) => {
    const result = sanitizeDiagnosticMessage(message);
    expect(result).toContain('Connection failed');
    expect(result).not.toMatch(
      /synthetic-secret|person@synthetic\.test|npg_syntheticSecret123456|postgresql:\/\/|https:\/\//,
    );
  });

  it.each([
    'SELECT private_column FROM users',
    'INSERT INTO orders VALUES (private_value)',
    'UPDATE users SET private_column = private_value',
    'DELETE FROM users WHERE private_column = private_value',
    'Invalid prisma.order.create() invocation: private_value',
    'Key (private_column)=(private_value) already exists.',
    'parameters: private_value',
    'WITH private_column AS (private_value)',
    'DROP TABLE private_value',
    'DETAIL: Failing row contains (private_value)',
    'statement: private_value',
    '{ data: private_value }',
  ])('omits SQL and argument fragments: %s', (message) => {
    const result = sanitizeDiagnosticMessage(message);
    expect(result).not.toMatch(/private_column|private_value/);
  });

  it('preserves the technical prefix of multiline errors without serializing subsequent arguments', () => {
    expect(
      sanitizeDiagnosticMessage(
        'Connection failed\nSELECT private_value\nprivate_value',
      ),
    ).toBe('Connection failed [query or arguments omitted]');
    expect(sanitizeDiagnosticMessage('x'.repeat(8193))).toBe(
      'Diagnostic details omitted',
    );
    expect(sanitizeDiagnosticMessage('x'.repeat(2000))).toHaveLength(1024);
  });

  it('retains Prisma code and two sanitized causes without metadata or deeper causes', () => {
    const deepest = new Error('never-serialize-this');
    const inner = new Error('Socket closed', { cause: deepest });
    const cause = new Error('Connection failed password=synthetic-secret', {
      cause: inner,
    });
    const error = new Prisma.PrismaClientKnownRequestError(
      'Query execution failed',
      {
        code: 'P2022',
        clientVersion: 'test',
        meta: { token: 'synthetic-secret' },
      },
    );
    Object.defineProperty(error, 'cause', { value: cause });
    const result = temporaryOrdersDiagnostic(error, active, now);
    expect(result).toMatchObject({
      errorName: 'PrismaClientKnownRequestError',
      prismaCode: 'P2022',
      cause: { cause: { message: 'Socket closed' } },
    });
    expect(result?.cause?.cause).not.toHaveProperty('cause');
    expect(JSON.stringify(result)).not.toMatch(
      /synthetic-secret|never-serialize-this|meta/,
    );
  });

  it('extracts a Prisma initialization code and handles cycles and arbitrary causes', () => {
    const error = new Prisma.PrismaClientInitializationError(
      'Connection failed',
      'test',
      'P1001',
    );
    Object.defineProperty(error, 'cause', { value: error });
    expect(temporaryOrdersDiagnostic(error, active, now)).toMatchObject({
      prismaCode: 'P1001',
    });
    expect(temporaryOrdersDiagnostic(error, active, now)).not.toHaveProperty(
      'cause',
    );
    expect(
      temporaryOrdersDiagnostic(
        new Error('Failure', { cause: { token: 'synthetic-secret' } }),
        active,
        now,
      )?.cause,
    ).toEqual({ errorName: 'Other', message: 'Diagnostic details omitted' });
  });

  it('omits unexpected values and throwing getters', () => {
    for (const value of [
      null,
      'synthetic-secret',
      { message: 'synthetic-secret' },
    ]) {
      expect(temporaryOrdersDiagnostic(value, active, now)).toEqual({
        errorName: 'Other',
        message: 'Diagnostic details omitted',
      });
    }
    const error = new Error();
    error.stack = undefined;
    for (const key of ['message', 'stack', 'cause', 'code'])
      Object.defineProperty(error, key, {
        get: () => {
          throw new Error('synthetic-secret');
        },
      });
    expect(temporaryOrdersDiagnostic(error, active, now)).toEqual({
      errorName: 'Error',
      message: 'Diagnostic details omitted',
    });
  });

  it('normalizes bounded backend and dependency frames and discards unsafe frames', () => {
    const error = new Error('Connection closed');
    error.stack = [
      'Error: synthetic-secret',
      '    at query (https://synthetic-secret/file.js:1:2)',
      `    at query (${resolve(__dirname, '../../modules/orders/orders.service.ts')}?token=synthetic-secret:1:2)`,
      ...Array.from(
        { length: 12 },
        () =>
          `    at query (${resolve(__dirname, '../../../node_modules/pg-pool/index.js')}:45:9)`,
      ),
    ].join('\n');
    const result = temporaryOrdersDiagnostic(error, active, now);
    expect(result?.stack).toHaveLength(8);
    expect(result?.stack?.[0]).toEqual({
      file: 'node_modules/pg-pool/index.js',
      line: 45,
      column: 9,
    });
    expect(JSON.stringify(result)).not.toContain('synthetic-secret');
  });

  it('only accepts bounded opaque request identifiers', () => {
    expect(diagnosticRequestId(57)).toBe(57);
    expect(diagnosticRequestId('request-57')).toBe('request-57');
    for (const value of [
      'token=synthetic-secret',
      {},
      -1,
      Infinity,
      'x'.repeat(65),
    ])
      expect(diagnosticRequestId(value)).toBeUndefined();
  });
});
