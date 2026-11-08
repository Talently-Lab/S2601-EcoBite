import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import pg from 'pg';
import {
  applyHistoricalOrderDates,
  buildHistoricalDatePlan,
  dryRunHistoricalOrderDates,
  HistoricalDatesOutcomeError,
  parseHistoricalDatesBackup,
  parseHistoricalDatesCsv,
  restoreHistoricalOrderDates,
  validateHistoricalDatesTarget,
  type HistoricalDatesWritePool,
} from './update-historical-order-dates';

interface CliPool extends HistoricalDatesWritePool {
  end(): Promise<void>;
  on(event: 'error', listener: (error: unknown) => void): unknown;
}

interface CliDependencies {
  read(path: string): Promise<Buffer>;
  createPool(config: pg.PoolConfig): CliPool;
}

type DiagnosticStage =
  | 'arguments'
  | 'validate-target'
  | 'read-inputs'
  | 'validate-csv'
  | 'validate-backup'
  | 'backup-target'
  | 'build-plan'
  | 'confirm-write'
  | 'connect'
  | 'verify-target'
  | 'begin'
  | 'read-orders'
  | 'compare-backup'
  | 'apply'
  | 'restore'
  | 'commit'
  | 'rollback'
  | 'cleanup'
  | 'unknown';

interface DiagnosticContext {
  stage: DiagnosticStage;
  reason?: DiagnosticReason;
}

type DiagnosticReason =
  | 'BACKUP_TARGET_MISMATCH'
  | 'UNSUPPORTED_STARTUP_PARAMETER'
  | 'CONNECTION_TIMEOUT'
  | 'AUTHENTICATION_FAILED'
  | 'TLS_ERROR'
  | 'NETWORK_ERROR'
  | 'BACKUP_RECORD_MISMATCH'
  | 'UNKNOWN';

const diagnosticCodes = new Set([
  '28P01',
  '28000',
  '08P01',
  '08006',
  '0A000',
  '42501',
  '42P01',
  '57014',
  'XX000',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'CERT_HAS_EXPIRED',
]);
const failureDiagnostics = new WeakMap<
  object,
  { stage: DiagnosticStage; reason: DiagnosticReason; code: string }
>();

function ownErrorValue(error: unknown, key: string): unknown {
  if (typeof error !== 'object' || error === null) return undefined;
  try {
    return Object.getOwnPropertyDescriptor(error, key)?.value as unknown;
  } catch {
    return undefined;
  }
}

function rememberFailure(
  error: unknown,
  context: DiagnosticContext,
  evidence: unknown = error,
) {
  if (
    typeof error !== 'object' ||
    error === null ||
    failureDiagnostics.has(error)
  ) {
    return;
  }
  if (isOutcomeError(error)) {
    const cause = ownErrorValue(error, 'cause');
    const inherited =
      typeof cause === 'object' && cause !== null
        ? failureDiagnostics.get(cause)
        : undefined;
    if (inherited) {
      failureDiagnostics.set(error, inherited);
      return;
    }
  }
  const candidate = ownErrorValue(evidence, 'code');
  const code =
    typeof candidate === 'string' && diagnosticCodes.has(candidate)
      ? candidate
      : 'OTHER';
  const reason = classifyFailure(evidence, context, code);
  failureDiagnostics.set(error, { stage: context.stage, reason, code });
}

function isOutcomeError(error: unknown): error is HistoricalDatesOutcomeError {
  try {
    return error instanceof HistoricalDatesOutcomeError;
  } catch {
    return false;
  }
}

function classifyFailure(
  error: unknown,
  context: DiagnosticContext,
  code: string,
): DiagnosticReason {
  if (context.reason) return context.reason;
  if (code === '28P01' || code === '28000') return 'AUTHENTICATION_FAILED';
  if (code === 'ETIMEDOUT' && context.stage === 'connect') {
    return 'CONNECTION_TIMEOUT';
  }
  if (['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)) {
    return 'NETWORK_ERROR';
  }
  if (
    [
      'ERR_TLS_CERT_ALTNAME_INVALID',
      'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
      'SELF_SIGNED_CERT_IN_CHAIN',
      'CERT_HAS_EXPIRED',
    ].includes(code)
  ) {
    return 'TLS_ERROR';
  }
  if (context.stage === 'connect' && (code === '08P01' || code === '0A000')) {
    const message = ownErrorValue(error, 'message');
    if (
      typeof message === 'string' &&
      /^unsupported startup parameter(?: in options)?: (?:options|search_path|statement_timeout|idle_in_transaction_session_timeout)$/.test(
        message,
      )
    ) {
      return 'UNSUPPORTED_STARTUP_PARAMETER';
    }
  }
  if (context.stage === 'compare-backup' && code === 'OTHER') {
    const message = ownErrorValue(error, 'message');
    if (
      [
        'Historical order does not match the backup',
        'Unexpected historical order count',
        'Invalid historical order identity or source',
      ].includes(typeof message === 'string' ? message : '')
    ) {
      return 'BACKUP_RECORD_MISMATCH';
    }
  }
  return 'UNKNOWN';
}

export function formatHistoricalDatesCliFailure(error: unknown): string {
  const diagnostic =
    typeof error === 'object' && error !== null
      ? failureDiagnostics.get(error)
      : undefined;
  const candidate = isOutcomeError(error)
    ? ownErrorValue(error, 'outcome')
    : undefined;
  const outcome =
    candidate === 'unknown' || candidate === 'committed'
      ? candidate
      : 'not-confirmed';
  const { stage, reason, code } = diagnostic ?? {
    stage: 'unknown',
    reason: 'UNKNOWN',
    code: 'OTHER',
  };
  return `Historical date operation failed; outcome=${outcome}; stage=${stage}; reason=${reason}; code=${code}. Inspect state before retrying.\n`;
}

export function reportHistoricalDatesCliFailure(error: unknown): void {
  process.stderr.write(formatHistoricalDatesCliFailure(error));
  process.exitCode = 1;
}

export async function runHistoricalDatesCli(
  args: string[],
  env: Record<string, string | undefined>,
  dependencies?: CliDependencies,
) {
  const context: DiagnosticContext = { stage: 'arguments' };
  try {
    return await runCli(args, env, context, dependencies);
  } catch (error) {
    rememberFailure(error, context);
    throw error;
  }
}

async function runCli(
  args: string[],
  env: Record<string, string | undefined>,
  context: DiagnosticContext,
  dependencies: CliDependencies = {
    read: readFile,
    createPool: (config) => new pg.Pool(config),
  },
) {
  const { values, tokens } = parseArgs({
    args,
    tokens: true,
    options: {
      mode: { type: 'string' },
      csv: { type: 'string' },
      backup: { type: 'string' },
      host: { type: 'string' },
      port: { type: 'string' },
      database: { type: 'string' },
      user: { type: 'string' },
      confirm: { type: 'string' },
    },
    strict: true,
    allowPositionals: false,
  });
  const seenOptions = new Set<string>();
  for (const token of tokens) {
    if (token.kind === 'option') {
      if (seenOptions.has(token.name)) throw new Error('Duplicate CLI option');
      seenOptions.add(token.name);
    }
  }
  const { mode, csv, backup: backupPath, host, port, database, user } = values;
  if (
    !['dry-run', 'apply', 'restore'].includes(mode ?? '') ||
    !csv ||
    !backupPath ||
    !host ||
    !port ||
    !/^\d+$/.test(port) ||
    !database ||
    !user
  ) {
    throw new Error('Explicit mode, input paths and destination are required');
  }
  const target = { hostname: host, port: Number(port), database };
  context.stage = 'validate-target';
  const connection = env.HISTORICAL_DATES_DATABASE_URL;
  validateHistoricalDatesTarget(connection, target);
  const url = new URL(connection!);
  const local = host === '127.0.0.1' || host === '::1' || host === '[::1]';
  if (
    decodeURIComponent(url.username) !== user ||
    !url.password ||
    (!local && url.searchParams.get('sslmode') !== 'verify-full')
  ) {
    throw new Error(
      'Explicit credentials and verified TLS for remote targets are required',
    );
  }
  context.stage = 'read-inputs';
  const csvBytes = await dependencies.read(csv);
  const backupBytes = await dependencies.read(backupPath);
  context.stage = 'validate-csv';
  const dates = await parseHistoricalDatesCsv(csvBytes.toString('utf8'));
  context.stage = 'validate-backup';
  const backup = parseHistoricalDatesBackup(backupBytes.toString('utf8'));
  context.stage = 'backup-target';
  if (!matchesBackupDestination(backup, target)) {
    context.reason = 'BACKUP_TARGET_MISMATCH';
    throw new Error('Backup destination mismatch');
  }
  context.stage = 'build-plan';
  buildHistoricalDatePlan(dates, backup);
  const sha256 = (bytes: Buffer) =>
    createHash('sha256').update(bytes).digest('hex');
  const csvHash = sha256(csvBytes);
  const backupHash = sha256(backupBytes);
  const confirmations = {
    apply: `apply:${host}:${port}:${database}:${user}:${csvHash}:${backupHash}`,
    restore: `restore:${host}:${port}:${database}:${user}:${csvHash}:${backupHash}`,
  };
  context.stage = 'confirm-write';
  if (
    (mode === 'apply' || mode === 'restore') &&
    values.confirm !== confirmations[mode]
  ) {
    throw new Error(
      'Exact operation, destination and input hash confirmation required',
    );
  }
  context.stage = 'connect';
  const pool = dependencies.createPool({
    host,
    port: target.port,
    database,
    user,
    password: decodeURIComponent(url.password),
    ssl: local ? false : { rejectUnauthorized: true },
    max: 1,
    connectionTimeoutMillis: 3000,
    statement_timeout: 15000,
    idle_in_transaction_session_timeout: 15000,
    application_name: 'ecobite-historical-order-dates',
    options: '-c search_path=public',
  });
  let failure: { error: unknown } | undefined;
  let changed = 0;
  let completed = false;
  let idleFailure: { error: unknown } | undefined;
  const getIdleFailure = (): { error: unknown } | undefined => idleFailure;
  try {
    pool.on('error', (error) => {
      idleFailure ??= { error };
    });
    await verifyConnectedTarget(pool, database, user, context);
    if (idleFailure) throw new Error('Maintenance pool failed');
    const observedPool = observeOperation(pool, context, mode!);
    if (mode === 'dry-run') {
      await dryRunHistoricalOrderDates(observedPool, dates, backup);
    } else {
      const operation =
        mode === 'apply'
          ? applyHistoricalOrderDates
          : restoreHistoricalOrderDates;
      changed = (await operation(observedPool, dates, backup)).changed;
    }
    completed = true;
    const lateFailure = getIdleFailure();
    if (lateFailure) {
      throw mode === 'dry-run'
        ? new Error('Maintenance pool failed')
        : new HistoricalDatesOutcomeError('committed', lateFailure.error);
    }
  } catch (error) {
    rememberFailure(error, context);
    failure = { error };
  } finally {
    try {
      await pool.end();
    } catch (error) {
      if (!failure) {
        const cleanupError =
          completed && mode !== 'dry-run'
            ? new HistoricalDatesOutcomeError('committed', error)
            : new Error('Maintenance connection cleanup failed');
        rememberFailure(cleanupError, { stage: 'cleanup' }, error);
        failure = { error: cleanupError };
      }
    }
  }
  if (failure) throw failure.error;
  return {
    mode,
    matched: 1000,
    changed,
    target: { ...target, user },
    csvHash,
    backupHash,
    confirmations,
  };
}

function matchesBackupDestination(
  backup: { databaseHost: string; databaseName: string },
  target: { hostname: string; database: string },
): boolean {
  if (backup.databaseName !== target.database) return false;
  if (backup.databaseHost === target.hostname) return true;
  return (
    target.database === 'neondb' &&
    backup.databaseHost ===
      'ep-aged-flower-b6l0x43i-pooler.c-2.sa-east-1.aws.neon.tech' &&
    target.hostname === 'ep-aged-flower-b6l0x43i.c-2.sa-east-1.aws.neon.tech'
  );
}

function observeOperation(
  pool: CliPool,
  context: DiagnosticContext,
  mode: string,
): HistoricalDatesWritePool {
  return {
    async connect() {
      context.stage = 'connect';
      const client = await pool.connect();
      return {
        async query(sql: string, values?: unknown[]) {
          const command = sql.trim().split(/\s+/)[0].toUpperCase();
          const stage = queryStage(command, mode);
          // Rollback must not replace the stage of a failure during comparison.
          if (command !== 'ROLLBACK' && command !== 'COMMIT') {
            context.stage = stage;
          }
          try {
            const result =
              values === undefined
                ? await client.query(sql)
                : await client.query(sql, values);
            if (mode === 'dry-run' && command === 'SELECT') {
              context.stage = 'compare-backup';
            }
            return result;
          } catch (error) {
            rememberFailure(error, { stage });
            throw error;
          }
        },
        release(discard?: boolean) {
          try {
            client.release(discard);
          } catch (error) {
            rememberFailure(error, { stage: 'cleanup' });
            throw error;
          }
        },
      };
    },
  };
}

function queryStage(command: string, mode: string): DiagnosticStage {
  switch (command) {
    case 'BEGIN':
    case 'SET':
      return 'begin';
    case 'SELECT':
      return 'read-orders';
    case 'COMMIT':
      return 'commit';
    case 'ROLLBACK':
      return 'rollback';
    default:
      return mode === 'apply' || mode === 'restore' ? mode : 'unknown';
  }
}

async function verifyConnectedTarget(
  pool: CliPool,
  database: string,
  username: string,
  context: DiagnosticContext,
) {
  context.stage = 'connect';
  const client = await pool.connect();
  let failure: { error: unknown } | undefined;
  try {
    context.stage = 'verify-target';
    const result = await client.query(
      `SELECT current_database() AS database, current_user AS username,
      to_regclass('orders') = to_regclass('public.orders') AS orders_visible,
      to_regclass('order_items') = to_regclass('public.order_items') AS items_visible`,
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (
      !row ||
      row.database !== database ||
      row.username !== username ||
      row.orders_visible !== true ||
      row.items_visible !== true
    ) {
      throw new Error('Connected destination or table resolution mismatch');
    }
  } catch (error) {
    rememberFailure(error, context);
    failure = { error };
  }
  try {
    client.release(failure ? true : undefined);
  } catch (error) {
    if (!failure) rememberFailure(error, { stage: 'cleanup' });
    failure ??= { error };
  }
  if (failure) throw failure.error;
}

if (require.main === module) {
  void runHistoricalDatesCli(process.argv.slice(2), process.env).then(
    (report) => process.stdout.write(`${JSON.stringify(report)}\n`),
    reportHistoricalDatesCliFailure,
  );
}
