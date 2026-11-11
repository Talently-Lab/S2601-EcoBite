import { createHash } from 'node:crypto';
import pg from 'pg';
import * as cli from './historical-order-dates-cli';
import * as maintenance from './update-historical-order-dates';

jest.mock('pg', () => ({ __esModule: true, default: { Pool: jest.fn() } }));

function fixture() {
  const csv = Buffer.from(
    [
      'id_pedido;fecha',
      ...Array.from({ length: 1000 }, (_, i) => `fixture-${i};1/6/2026`),
    ].join('\n'),
  );
  const backup = Buffer.from(
    JSON.stringify({
      version: 1,
      source: 'DATASET',
      databaseHost: '127.0.0.1',
      databaseName: 'ecobite_test',
      records: Array.from({ length: 1000 }, (_, i) => ({
        order_id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        dataset_order_id: `fixture-${i}`,
        ordered_at_original: '2026-06-01T00:00:00.123456Z',
      })),
    }),
  );
  const client = {
    query: jest.fn().mockResolvedValue({
      rows: [
        {
          database: 'ecobite_test',
          username: 'ecobite_test',
          orders_visible: true,
          items_visible: true,
        },
      ],
    }),
    release: jest.fn(),
  };
  const pool = {
    connect: jest.fn().mockResolvedValue(client),
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn<void, ['error', (error: unknown) => void]>(),
  };
  const deps = {
    read: jest.fn((path: string) =>
      Promise.resolve(path === 'fixture.csv' ? csv : backup),
    ),
    createPool: jest.fn().mockReturnValue(pool),
  };
  const args = [
    '--mode',
    'dry-run',
    '--csv',
    'fixture.csv',
    '--backup',
    'fixture.json',
    '--host',
    '127.0.0.1',
    '--port',
    '5433',
    '--database',
    'ecobite_test',
    '--user',
    'ecobite_test',
  ];
  const env = {
    HISTORICAL_DATES_DATABASE_URL:
      'postgresql://ecobite_test:synthetic@127.0.0.1:5433/ecobite_test',
  };
  const hash = (bytes: Buffer) =>
    createHash('sha256').update(bytes).digest('hex');
  const confirmation = (mode: string) =>
    `${mode}:127.0.0.1:5433:ecobite_test:ecobite_test:${hash(csv)}:${hash(backup)}`;
  return { args, env, deps, pool, client, confirmation };
}

const run = cli.runHistoricalDatesCli;

describe('approved Neon direct endpoint', () => {
  const directHost = 'ep-aged-flower-b6l0x43i.c-2.sa-east-1.aws.neon.tech';
  const pooledHost =
    'ep-aged-flower-b6l0x43i-pooler.c-2.sa-east-1.aws.neon.tech';

  afterEach(() => jest.restoreAllMocks());

  async function neonFixture() {
    const f = fixture();
    const read = f.deps.read.getMockImplementation()!;
    const backupBytes = Buffer.from(
      (await read('fixture.json'))
        .toString('utf8')
        .replace('127.0.0.1', pooledHost)
        .replace('ecobite_test', 'neondb'),
    );
    const csvBytes = await read('fixture.csv');
    f.deps.read.mockImplementation((path) =>
      path === 'fixture.json' ? Promise.resolve(backupBytes) : read(path),
    );
    f.args[f.args.indexOf('--host') + 1] = directHost;
    f.args[f.args.indexOf('--port') + 1] = '5432';
    f.args[f.args.indexOf('--database') + 1] = 'neondb';
    f.env.HISTORICAL_DATES_DATABASE_URL = `postgresql://ecobite_test:synthetic@${directHost}:5432/neondb?sslmode=verify-full`;
    f.client.query.mockResolvedValue({
      rows: [
        {
          database: 'neondb',
          username: 'ecobite_test',
          orders_visible: true,
          items_visible: true,
        },
      ],
    });
    const hash = (bytes: Buffer) =>
      createHash('sha256').update(bytes).digest('hex');
    const confirmation = (mode: string, host = directHost) =>
      `${mode}:${host}:5432:neondb:ecobite_test:${hash(csvBytes)}:${hash(backupBytes)}`;
    return { ...f, backupBytes, csvBytes, hash, confirmation };
  }

  it('accepts only the approved direction and preserves original backup bytes and hashes', async () => {
    const f = await neonFixture();
    const before = Buffer.from(f.backupBytes);
    const backupHash = f.hash(before);
    jest.spyOn(maintenance, 'dryRunHistoricalOrderDates').mockResolvedValue([]);
    await expect(run(f.args, f.env, f.deps)).resolves.toMatchObject({
      mode: 'dry-run',
      target: { hostname: directHost, database: 'neondb', port: 5432 },
      backupHash,
      confirmations: {
        apply: f.confirmation('apply'),
        restore: f.confirmation('restore'),
      },
    });
    expect(f.backupBytes.equals(before)).toBe(true);
    expect(f.hash(f.backupBytes)).toBe(backupHash);
    expect(f.backupBytes.toString()).toContain(pooledHost);
    expect(f.deps.createPool).toHaveBeenCalledWith(
      expect.objectContaining({
        host: directHost,
        ssl: { rejectUnauthorized: true },
        connectionTimeoutMillis: 3000,
        statement_timeout: 15000,
        idle_in_transaction_session_timeout: 15000,
        options: '-c search_path=public',
      }),
    );
  });

  const invalidDestinations: {
    name: string;
    host?: string;
    backupHost?: string;
    database?: string;
    backupDatabase?: string;
  }[] = [
    {
      name: 'other connection endpoint',
      host: directHost.replace('b6l0x43i', 'different'),
    },
    {
      name: 'other backup endpoint',
      backupHost: pooledHost.replace('b6l0x43i', 'different'),
    },
    {
      name: 'another pooled/direct pair',
      host: directHost.replace('b6l0x43i', 'different'),
      backupHost: pooledHost.replace('b6l0x43i', 'different'),
    },
    {
      name: 'other region',
      host: directHost.replace('sa-east-1', 'us-east-1'),
    },
    {
      name: 'other domain',
      host: directHost.replace('neon.tech', 'example.invalid'),
    },
    { name: 'appended domain', host: `${directHost}.example.invalid` },
    {
      name: 'repeated pooler suffix',
      host: pooledHost.replace('-pooler.', '-pooler-pooler.'),
    },
    {
      name: 'pooler in wrong label',
      host: directHost.replace('.c-2.', '.c-2-pooler.'),
    },
    { name: 'trailing dot', host: `${directHost}.` },
    { name: 'uppercase host', host: directHost.toUpperCase() },
    { name: 'malformed host', host: `${directHost}/unexpected` },
    { name: 'reverse direction', backupHost: directHost, host: pooledHost },
    { name: 'different database', database: 'other' },
    { name: 'different backup database', backupDatabase: 'other' },
    { name: 'pair outside neondb', database: 'other', backupDatabase: 'other' },
    {
      name: 'non-Neon lookalike pair',
      backupHost: 'db-pooler.example.invalid',
      host: 'db.example.invalid',
    },
  ];

  it.each(invalidDestinations)(
    'rejects $name before creating a pool',
    async ({
      host = directHost,
      backupHost = pooledHost,
      database = 'neondb',
      backupDatabase = 'neondb',
    }) => {
      const f = await neonFixture();
      const before = Buffer.from(f.backupBytes);
      const read = f.deps.read.getMockImplementation()!;
      const differentBackup = Buffer.from(
        f.backupBytes
          .toString()
          .replace(pooledHost, backupHost)
          .replace('neondb', backupDatabase),
      );
      f.deps.read.mockImplementation((path) =>
        path === 'fixture.json' ? Promise.resolve(differentBackup) : read(path),
      );
      f.args[f.args.indexOf('--host') + 1] = host;
      f.args[f.args.indexOf('--database') + 1] = database;
      f.env.HISTORICAL_DATES_DATABASE_URL = `postgresql://ecobite_test:synthetic@${host}:5432/${database}?sslmode=verify-full`;
      await expect(run(f.args, f.env, f.deps)).rejects.toThrow();
      expect(f.deps.createPool).not.toHaveBeenCalled();
      expect(f.backupBytes.equals(before)).toBe(true);
    },
  );

  it.each([directHost, pooledHost])(
    'retains exact-host behavior for %s',
    async (host) => {
      const f = await neonFixture();
      const read = f.deps.read.getMockImplementation()!;
      const exactBackup = Buffer.from(
        f.backupBytes.toString().replace(pooledHost, host),
      );
      f.deps.read.mockImplementation((path) =>
        path === 'fixture.json' ? Promise.resolve(exactBackup) : read(path),
      );
      f.args[f.args.indexOf('--host') + 1] = host;
      f.env.HISTORICAL_DATES_DATABASE_URL = `postgresql://ecobite_test:synthetic@${host}:5432/neondb?sslmode=verify-full`;
      jest
        .spyOn(maintenance, 'dryRunHistoricalOrderDates')
        .mockResolvedValue([]);
      await expect(run(f.args, f.env, f.deps)).resolves.toMatchObject({
        mode: 'dry-run',
        target: { hostname: host },
      });
    },
  );

  it.each(['apply', 'restore'] as const)(
    'requires %s confirmation bound to the direct host and original hashes',
    async (mode) => {
      const f = await neonFixture();
      const before = Buffer.from(f.backupBytes);
      f.args[1] = mode;
      f.args.push('--confirm', f.confirmation(mode, pooledHost));
      await expect(run(f.args, f.env, f.deps)).rejects.toThrow(
        'Exact operation, destination and input hash confirmation required',
      );
      expect(f.deps.createPool).not.toHaveBeenCalled();
      f.args[f.args.length - 1] = f.confirmation(mode);
      const operation = jest
        .spyOn(
          maintenance,
          mode === 'apply'
            ? 'applyHistoricalOrderDates'
            : 'restoreHistoricalOrderDates',
        )
        .mockResolvedValue({ changed: 0 });
      await expect(run(f.args, f.env, f.deps)).resolves.toMatchObject({
        mode,
        changed: 0,
        backupHash: f.hash(before),
      });
      expect(operation).toHaveBeenCalledTimes(1);
      expect(f.backupBytes.equals(before)).toBe(true);
    },
  );

  it.each(['csv', 'backup'])(
    'invalidates confirmation if %s bytes change',
    async (input) => {
      const f = await neonFixture();
      f.args[1] = 'apply';
      f.args.push('--confirm', f.confirmation('apply'));
      const read = f.deps.read.getMockImplementation()!;
      f.deps.read.mockImplementation(async (path) => {
        const bytes = await read(path);
        if (input === 'csv' && path === 'fixture.csv') {
          return Buffer.concat([Buffer.from('\uFEFF'), bytes]);
        }
        if (input === 'backup' && path === 'fixture.json') {
          return Buffer.concat([bytes, Buffer.from('\n')]);
        }
        return bytes;
      });
      await expect(run(f.args, f.env, f.deps)).rejects.toThrow(
        'Exact operation, destination and input hash confirmation required',
      );
      expect(f.deps.createPool).not.toHaveBeenCalled();
    },
  );

  it.each(['host', 'port', 'role', 'tls', 'override', 'missing-url'])(
    'does not bypass the existing %s guard',
    async (kind) => {
      const f = await neonFixture();
      const url = new URL(f.env.HISTORICAL_DATES_DATABASE_URL);
      if (kind === 'host') url.hostname = 'other.invalid';
      if (kind === 'port') url.port = '5433';
      if (kind === 'role') url.username = 'other';
      if (kind === 'tls') url.searchParams.set('sslmode', 'require');
      if (kind === 'override') url.searchParams.set('host', 'other.invalid');
      f.env.HISTORICAL_DATES_DATABASE_URL = url.toString();
      const env: Record<string, string | undefined> = { ...f.env };
      if (kind === 'missing-url') delete env.HISTORICAL_DATES_DATABASE_URL;
      env.DATABASE_URL = f.env.HISTORICAL_DATES_DATABASE_URL;
      await expect(run(f.args, env, f.deps)).rejects.toThrow();
      expect(f.deps.createPool).not.toHaveBeenCalled();
    },
  );
});

describe('safe historical dates CLI diagnostics', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reports connect stage and allowlisted authentication code without secrets', async () => {
    const f = fixture();
    const contaminated =
      'postgresql://fake:FAKE_PASSWORD@host.invalid/db SELECT secret C:\\private\\backup.json';
    const error = Object.assign(new Error(contaminated), {
      code: '28P01',
      stack: contaminated,
      cause: { password: contaminated, rows: [contaminated] },
    });
    f.pool.connect.mockRejectedValue(error);
    let rejected: unknown;
    try {
      await run(f.args, f.env, f.deps);
    } catch (caught) {
      rejected = caught;
    }
    expect(rejected).toBe(error);
    const format = cli.formatHistoricalDatesCliFailure;
    expect(format(rejected)).toBe(
      'Historical date operation failed; outcome=not-confirmed; stage=connect; reason=AUTHENTICATION_FAILED; code=28P01. Inspect state before retrying.\n',
    );
    expect(format(rejected)).not.toContain(contaminated);
    expect(f.pool.end).toHaveBeenCalledTimes(1);
  });

  async function diagnostic(promise: Promise<unknown>) {
    try {
      await promise;
    } catch (error) {
      return cli.formatHistoricalDatesCliFailure(error);
    }
    throw new Error('Expected a simulated failure');
  }

  it.each([
    ['ETIMEDOUT', 'CONNECTION_TIMEOUT'],
    ['ECONNREFUSED', 'NETWORK_ERROR'],
    ['ENOTFOUND', 'NETWORK_ERROR'],
    ['EAI_AGAIN', 'NETWORK_ERROR'],
    ['ECONNRESET', 'NETWORK_ERROR'],
    ['ERR_TLS_CERT_ALTNAME_INVALID', 'TLS_ERROR'],
    ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'TLS_ERROR'],
    ['UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'TLS_ERROR'],
    ['SELF_SIGNED_CERT_IN_CHAIN', 'TLS_ERROR'],
    ['CERT_HAS_EXPIRED', 'TLS_ERROR'],
    ['57014', 'UNKNOWN'],
    ['08P01', 'UNKNOWN'],
  ])('classifies structured code %s conservatively', async (code, reason) => {
    const f = fixture();
    f.pool.connect.mockRejectedValue(
      Object.assign(new Error('FAKE_PASSWORD and SELECT secret'), { code }),
    );
    expect(await diagnostic(run(f.args, f.env, f.deps))).toContain(
      `stage=connect; reason=${reason}; code=${code}`,
    );
  });

  it.each(['28P01 FAKE_PASSWORD', 'FAKE_PASSWORD', 'ZZ999', '', 123, null])(
    'does not expose unapproved code %s',
    async (code) => {
      const f = fixture();
      f.pool.connect.mockRejectedValue(
        Object.assign(new Error('FAKE_PASSWORD'), { code }),
      );
      const output = await diagnostic(run(f.args, f.env, f.deps));
      expect(output).toContain('stage=connect; reason=UNKNOWN; code=OTHER');
      expect(output).not.toContain('FAKE_PASSWORD');
    },
  );

  it('requires protocol code, connect context and an exact known startup error', async () => {
    for (const [code, message, expected] of [
      [
        '08P01',
        'unsupported startup parameter: statement_timeout',
        'UNSUPPORTED_STARTUP_PARAMETER',
      ],
      [
        '0A000',
        'unsupported startup parameter in options: search_path',
        'UNSUPPORTED_STARTUP_PARAMETER',
      ],
      ['OTHER', 'unsupported startup parameter: statement_timeout', 'UNKNOWN'],
      ['08P01', 'unsupported startup parameter: FAKE_PASSWORD', 'UNKNOWN'],
    ]) {
      const f = fixture();
      f.pool.connect.mockRejectedValue(
        Object.assign(new Error(message), { code }),
      );
      const output = await diagnostic(run(f.args, f.env, f.deps));
      expect(output).toContain(`stage=connect; reason=${expected};`);
      expect(output).not.toContain(message);
      expect(output).not.toContain('FAKE_PASSWORD');
    }
  });

  it('distinguishes backup destination mismatch before creating a pool', async () => {
    const f = fixture();
    const read = f.deps.read.getMockImplementation()!;
    f.deps.read.mockImplementation(async (path) => {
      const bytes = await read(path);
      return path === 'fixture.json'
        ? Buffer.from(bytes.toString().replace('127.0.0.1', 'other.invalid'))
        : bytes;
    });
    expect(await diagnostic(run(f.args, f.env, f.deps))).toContain(
      'stage=backup-target; reason=BACKUP_TARGET_MISMATCH; code=OTHER',
    );
    expect(f.deps.createPool).not.toHaveBeenCalled();
  });

  it('preserves the verify-target diagnostic even if release and shutdown fail', async () => {
    const f = fixture();
    f.client.query.mockRejectedValue(
      Object.assign(new Error('SELECT FAKE_PASSWORD'), { code: '42501' }),
    );
    f.client.release.mockImplementation(() => {
      throw new Error('secondary');
    });
    f.pool.end.mockRejectedValue(new Error('secondary shutdown'));
    expect(await diagnostic(run(f.args, f.env, f.deps))).toContain(
      'stage=verify-target; reason=UNKNOWN; code=42501',
    );
  });

  it('identifies pool cleanup without exposing its error', async () => {
    const f = fixture();
    jest.spyOn(maintenance, 'dryRunHistoricalOrderDates').mockResolvedValue([]);
    f.pool.end.mockRejectedValue(new Error('FAKE_PASSWORD'));
    const output = await diagnostic(run(f.args, f.env, f.deps));
    expect(output).toContain('stage=cleanup; reason=UNKNOWN; code=OTHER');
    expect(output).not.toContain('FAKE_PASSWORD');
  });

  it('retains an allowlisted cleanup code while preserving the original error contract', async () => {
    const f = fixture();
    jest.spyOn(maintenance, 'dryRunHistoricalOrderDates').mockResolvedValue([]);
    f.pool.end.mockRejectedValue(
      Object.assign(new Error('FAKE_PASSWORD'), { code: 'ECONNRESET' }),
    );
    expect(await diagnostic(run(f.args, f.env, f.deps))).toContain(
      'stage=cleanup; reason=NETWORK_ERROR; code=ECONNRESET',
    );
  });

  it('keeps unknown errors safe without evaluating getters or serializing causes', () => {
    const poison = {
      get code() {
        throw new Error('FAKE_PASSWORD');
      },
      get message() {
        throw new Error('FAKE_PASSWORD');
      },
      get stack() {
        throw new Error('FAKE_PASSWORD');
      },
      get cause() {
        throw new Error('FAKE_PASSWORD');
      },
      toJSON() {
        throw new Error('FAKE_PASSWORD');
      },
    };
    for (const error of [poison, null, undefined, 'FAKE_PASSWORD', 42]) {
      expect(cli.formatHistoricalDatesCliFailure(error)).toBe(
        'Historical date operation failed; outcome=not-confirmed; stage=unknown; reason=UNKNOWN; code=OTHER. Inspect state before retrying.\n',
      );
    }
  });

  it('writes only the safe diagnostic to stderr and retains exit code 1', () => {
    const handler = cli.reportHistoricalDatesCliFailure;
    const stderr = jest.spyOn(process.stderr, 'write').mockReturnValue(true);
    const previousExitCode = process.exitCode;
    try {
      handler(new Error('postgresql://fake:FAKE_PASSWORD@host.invalid/db'));
      expect(process.exitCode).toBe(1);
      expect(stderr).toHaveBeenCalledWith(
        'Historical date operation failed; outcome=not-confirmed; stage=unknown; reason=UNKNOWN; code=OTHER. Inspect state before retrying.\n',
      );
    } finally {
      process.exitCode = previousExitCode;
    }
  });

  it.each(['begin', 'read-orders', 'commit'] as const)(
    'identifies %s failure and delegates the original SQL unchanged',
    async (stage) => {
      const f = fixture();
      const error = Object.assign(new Error('SQL and FAKE_PASSWORD'), {
        code: '42501',
      });
      const originalQuery: (sql: string) => Promise<{ rows: unknown[] }> =
        f.client.query.getMockImplementation()!;
      const sqlByStage = {
        begin: 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY',
        'read-orders': 'SELECT order_id FROM orders',
        commit: 'COMMIT',
      };
      f.client.query.mockImplementation((sql: string) => {
        if (sql === sqlByStage[stage]) return Promise.reject(error);
        return originalQuery(sql);
      });
      jest
        .spyOn(maintenance, 'dryRunHistoricalOrderDates')
        .mockImplementation(async (pool) => {
          const client = await pool.connect();
          try {
            await client.query(sqlByStage.begin);
            await client.query(sqlByStage['read-orders']);
            await client.query(sqlByStage.commit);
            return [];
          } catch (caught) {
            await client.query('ROLLBACK');
            throw caught;
          } finally {
            client.release();
          }
        });
      const output = await diagnostic(run(f.args, f.env, f.deps));
      expect(output).toContain(`stage=${stage}; reason=UNKNOWN; code=42501`);
      expect(f.client.query).toHaveBeenCalledWith(sqlByStage[stage]);
      expect(output).not.toContain('FAKE_PASSWORD');
      expect(output).not.toContain(sqlByStage[stage]);
    },
  );

  it('identifies comparison failure without confusing it with rollback or release', async () => {
    const f = fixture();
    const original = new Error('Historical order does not match the backup');
    jest
      .spyOn(maintenance, 'dryRunHistoricalOrderDates')
      .mockImplementation(async (pool) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
          await client.query('SELECT order_id FROM orders');
          throw original;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      });
    const output = await diagnostic(run(f.args, f.env, f.deps));
    expect(output).toContain(
      'stage=compare-backup; reason=BACKUP_RECORD_MISMATCH; code=OTHER',
    );
    expect(output).not.toContain(original.message);
  });

  it('does not infer a backup mismatch from an arbitrary comparison error', async () => {
    const f = fixture();
    jest
      .spyOn(maintenance, 'dryRunHistoricalOrderDates')
      .mockImplementation(async (pool) => {
        const client = await pool.connect();
        try {
          await client.query('SELECT order_id FROM orders');
          throw new Error('FAKE_PASSWORD');
        } finally {
          client.release();
        }
      });
    expect(await diagnostic(run(f.args, f.env, f.deps))).toContain(
      'stage=compare-backup; reason=UNKNOWN; code=OTHER',
    );
  });

  it('retains commit stage and safe code through the known outcome wrapper', async () => {
    const f = fixture();
    const cause = Object.assign(new Error('FAKE_PASSWORD'), { code: '08006' });
    const query: (sql: string) => Promise<{ rows: unknown[] }> =
      f.client.query.getMockImplementation()!;
    f.client.query.mockImplementation((sql: string) =>
      sql === 'COMMIT' ? Promise.reject(cause) : query(sql),
    );
    jest
      .spyOn(maintenance, 'dryRunHistoricalOrderDates')
      .mockImplementation(async (pool) => {
        const client = await pool.connect();
        try {
          await client.query('SELECT order_id FROM orders');
          await client.query('COMMIT');
          return [];
        } catch (error) {
          throw new maintenance.HistoricalDatesOutcomeError('unknown', error);
        } finally {
          client.release(true);
        }
      });
    const output = await diagnostic(run(f.args, f.env, f.deps));
    expect(output).toContain(
      'outcome=unknown; stage=commit; reason=UNKNOWN; code=08006',
    );
    expect(output).not.toContain('FAKE_PASSWORD');
  });

  it('handles hostile prototypes and outcome accessors without evaluating them', () => {
    const proxy = new Proxy(
      {},
      {
        getPrototypeOf() {
          throw new Error('FAKE_PASSWORD');
        },
      },
    );
    const outcome = new maintenance.HistoricalDatesOutcomeError(
      'unknown',
      null,
    );
    Object.defineProperty(outcome, 'outcome', {
      get() {
        throw new Error('FAKE_PASSWORD');
      },
    });
    for (const error of [proxy, outcome]) {
      expect(cli.formatHistoricalDatesCliFailure(error)).toContain(
        'outcome=not-confirmed;',
      );
    }
  });

  it.each(['apply', 'restore'] as const)(
    'delegates %s parameters, results and release without changes',
    async (mode) => {
      const f = fixture();
      f.args[1] = mode;
      f.args.push('--confirm', f.confirmation(mode));
      const parameters = ['synthetic parameter'];
      const response = { rows: [{ value: 'synthetic' }], rowCount: 1 };
      const originalQuery: (sql: string) => Promise<{ rows: unknown[] }> =
        f.client.query.getMockImplementation()!;
      f.client.query.mockImplementation((sql: string) =>
        sql === 'UPDATE orders SET ordered_at = $1'
          ? Promise.resolve(response)
          : originalQuery(sql),
      );
      jest
        .spyOn(
          maintenance,
          mode === 'apply'
            ? 'applyHistoricalOrderDates'
            : 'restoreHistoricalOrderDates',
        )
        .mockImplementation(async (...args) => {
          const [pool] = args;
          const client = await pool.connect();
          const result = await client.query(
            'UPDATE orders SET ordered_at = $1',
            parameters,
          );
          expect(result).toBe(response);
          client.release(true);
          return { changed: 1 };
        });
      await expect(run(f.args, f.env, f.deps)).resolves.toMatchObject({
        mode,
        changed: 1,
      });
      expect(f.client.query).toHaveBeenCalledWith(
        'UPDATE orders SET ordered_at = $1',
        parameters,
      );
      expect(f.client.release).toHaveBeenLastCalledWith(true);
    },
  );
});

describe('historical dates CLI', () => {
  afterEach(() => jest.restoreAllMocks());

  it('does not construct a PostgreSQL pool when imported', () => {
    expect(pg.Pool).not.toHaveBeenCalled();
  });

  it('rejects duplicated options before creating a pool', async () => {
    const f = fixture();
    f.args.push('--mode', 'dry-run');
    jest.spyOn(maintenance, 'dryRunHistoricalOrderDates').mockResolvedValue([]);
    await expect(run(f.args, f.env, f.deps)).rejects.toThrow();
    expect(f.deps.createPool).not.toHaveBeenCalled();
  });

  it('validates inputs, identifies the connected destination and closes the pool', async () => {
    const f = fixture();
    const dryRun = jest
      .spyOn(maintenance, 'dryRunHistoricalOrderDates')
      .mockResolvedValue([]);
    await expect(run(f.args, f.env, f.deps)).resolves.toMatchObject({
      mode: 'dry-run',
      confirmations: {
        apply: f.confirmation('apply'),
        restore: f.confirmation('restore'),
      },
    });
    expect(dryRun).toHaveBeenCalledWith(
      expect.objectContaining({ connect: expect.any(Function) }),
      expect.any(Array),
      expect.objectContaining({ version: 1 }),
    );
    expect(f.deps.createPool).toHaveBeenCalledWith(
      expect.objectContaining({
        host: '127.0.0.1',
        port: 5433,
        database: 'ecobite_test',
        user: 'ecobite_test',
        max: 1,
        options: '-c search_path=public',
      }),
    );
    expect(f.client.release).toHaveBeenCalledTimes(1);
    expect(f.pool.end).toHaveBeenCalledTimes(1);
  });

  it.each(['apply', 'restore'] as const)(
    'requires %s confirmation',
    async (mode) => {
      const f = fixture();
      f.args[1] = mode;
      await expect(run(f.args, f.env, f.deps)).rejects.toThrow();
      expect(f.deps.createPool).not.toHaveBeenCalled();
      f.args.push('--confirm', f.confirmation(mode));
      const operation = jest
        .spyOn(
          maintenance,
          mode === 'apply'
            ? 'applyHistoricalOrderDates'
            : 'restoreHistoricalOrderDates',
        )
        .mockResolvedValue({ changed: 1000 });
      await expect(run(f.args, f.env, f.deps)).resolves.toMatchObject({
        mode,
        changed: 1000,
      });
      expect(operation).toHaveBeenCalledTimes(1);
      expect(f.pool.end).toHaveBeenCalledTimes(1);
    },
  );

  const invalidInputs = [
    'missing-url',
    'wrong-host',
    'wrong-user',
    'bad-backup',
    'unknown-mode',
    'unknown-flag',
    'changed-hash',
    'remote-without-tls',
  ] as const;
  it.each(invalidInputs)('rejects %s without a connection', async (kind) => {
    const f = fixture();
    if (kind === 'missing-url') {
      delete (f.env as Record<string, unknown>).HISTORICAL_DATES_DATABASE_URL;
    }
    if (kind === 'wrong-host') {
      f.env.HISTORICAL_DATES_DATABASE_URL =
        f.env.HISTORICAL_DATES_DATABASE_URL.replace(
          '127.0.0.1',
          'other.invalid',
        );
    }
    if (kind === 'wrong-user') {
      f.env.HISTORICAL_DATES_DATABASE_URL =
        f.env.HISTORICAL_DATES_DATABASE_URL.replace(
          'ecobite_test:synthetic',
          'other:synthetic',
        );
    }
    if (kind === 'bad-backup') {
      f.deps.read.mockResolvedValue(Buffer.from('{}'));
    }
    if (kind === 'unknown-mode') f.args[1] = 'seed';
    if (kind === 'unknown-flag') f.args.push('--connection', 'forbidden');
    if (kind === 'changed-hash') {
      f.args[1] = 'apply';
      f.args.push('--confirm', f.confirmation('apply').replace(/.$/, 'x'));
    }
    if (kind === 'remote-without-tls') {
      f.args[f.args.indexOf('--host') + 1] = 'remote.invalid';
      f.env.HISTORICAL_DATES_DATABASE_URL =
        f.env.HISTORICAL_DATES_DATABASE_URL.replace(
          '127.0.0.1',
          'remote.invalid',
        );
    }
    await expect(
      run(f.args, { ...f.env, DATABASE_URL: 'must-not-be-used' }, f.deps),
    ).rejects.toThrow();
    expect(f.deps.createPool).not.toHaveBeenCalled();
  });

  it('rejects an unexpected server identity and still closes resources', async () => {
    const f = fixture();
    f.client.query.mockResolvedValue({ rows: [{ database: 'wrong' }] });
    await expect(run(f.args, f.env, f.deps)).rejects.toThrow();
    expect(f.client.release).toHaveBeenCalledTimes(1);
    expect(f.pool.end).toHaveBeenCalledTimes(1);
  });

  it('retains the primary failure if pool shutdown also fails', async () => {
    const f = fixture();
    const original = new Error('primary');
    jest
      .spyOn(maintenance, 'dryRunHistoricalOrderDates')
      .mockRejectedValue(original);
    f.pool.end.mockRejectedValue(new Error('secondary'));
    await expect(run(f.args, f.env, f.deps)).rejects.toBe(original);
    expect(f.pool.end).toHaveBeenCalledTimes(1);
  });

  it('reports committed outcome if pool shutdown fails after apply', async () => {
    const f = fixture();
    f.args[1] = 'apply';
    f.args.push('--confirm', f.confirmation('apply'));
    jest
      .spyOn(maintenance, 'applyHistoricalOrderDates')
      .mockResolvedValue({ changed: 1000 });
    f.pool.end.mockRejectedValue(new Error('shutdown failed'));
    await expect(run(f.args, f.env, f.deps)).rejects.toMatchObject({
      outcome: 'committed',
    });
  });

  it('handles an idle pool error without invoking the operation or leaking resources', async () => {
    const f = fixture();
    const dryRun = jest
      .spyOn(maintenance, 'dryRunHistoricalOrderDates')
      .mockResolvedValue([]);
    f.client.query.mockImplementation(() => {
      expect(f.pool.on).toHaveBeenCalledWith('error', expect.any(Function));
      f.pool.on.mock.calls[0][1](new Error('background failure'));
      return Promise.resolve({
        rows: [
          {
            database: 'ecobite_test',
            username: 'ecobite_test',
            orders_visible: true,
            items_visible: true,
          },
        ],
      });
    });
    await expect(run(f.args, f.env, f.deps)).rejects.toThrow(
      'Maintenance pool failed',
    );
    expect(dryRun).not.toHaveBeenCalled();
    expect(f.pool.end).toHaveBeenCalledTimes(1);
  });
});
