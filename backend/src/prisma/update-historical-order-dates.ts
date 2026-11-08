import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import csv from 'csv-parser';

const HISTORICAL_ORDER_COUNT = 1000;
const CSV_START_DATE = 20260601;
const CSV_END_DATE = 20261029;
const argentinaOffsetFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Argentina/Buenos_Aires',
  timeZoneName: 'longOffset',
});

export interface HistoricalOrderDate {
  datasetOrderId: string;
  date: string;
}

function isCalendarDate(year: number, month: number, day: number): boolean {
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
  );
}

function validateCsvDate(value: string): void {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const key = year * 10000 + month * 100 + day;
    if (
      isCalendarDate(year, month, day) &&
      key >= CSV_START_DATE &&
      key <= CSV_END_DATE
    ) {
      return;
    }
  }
  throw new Error('Invalid or out-of-range CSV date');
}

export async function parseHistoricalDatesCsv(
  input: string,
): Promise<HistoricalOrderDate[]> {
  const rows: HistoricalOrderDate[] = [];
  let hasHeaders = false;
  const parser = csv({ separator: ';', strict: true });
  parser.on('headers', (headers: string[]) => {
    hasHeaders = true;
    if (headers.length !== 2 || headers.join(';') !== 'id_pedido;fecha') {
      parser.destroy(new Error('Invalid CSV headers or separator'));
    }
  });
  await pipeline(
    Readable.from([input.replace(/^\uFEFF/, '')]),
    parser,
    new Writable({
      objectMode: true,
      write(chunk: Record<string, string>, _encoding, callback) {
        rows.push({ datasetOrderId: chunk.id_pedido, date: chunk.fecha });
        callback();
      },
    }),
  );
  if (!hasHeaders) {
    throw new Error('Missing CSV headers');
  }
  if (rows.length !== HISTORICAL_ORDER_COUNT) {
    throw new Error('Expected exactly 1000 historical orders');
  }
  const ids = new Set<string>();
  for (const row of rows) {
    if (!isLiteralString(row.datasetOrderId) || ids.has(row.datasetOrderId)) {
      throw new Error('Invalid or duplicate CSV order ID');
    }
    ids.add(row.datasetOrderId);
    validateCsvDate(row.date);
  }
  return rows;
}
export interface HistoricalDatesBackup {
  version: 1;
  source: 'DATASET';
  databaseHost: string;
  databaseName: string;
  records: {
    order_id: string;
    dataset_order_id: string;
    ordered_at_original: string;
  }[];
}

export interface HistoricalDatesReadClient {
  query(sql: string): Promise<{ rows: unknown[] }>;
  release(discard?: boolean): void;
}

export interface HistoricalDatesReadPool {
  connect(): Promise<HistoricalDatesReadClient>;
}

export type HistoricalDatePlanEntry =
  HistoricalDatesBackup['records'][number] & {
    ordered_at_proposed: string;
  };

export function classifyHistoricalDateState(
  plan: HistoricalDatePlanEntry[],
  rows: unknown[],
): 'original' | 'applied' | 'neutral' {
  const byId = new Map(plan.map((entry) => [entry.dataset_order_id, entry]));
  if (
    plan.length !== HISTORICAL_ORDER_COUNT ||
    byId.size !== HISTORICAL_ORDER_COUNT ||
    rows.length !== HISTORICAL_ORDER_COUNT
  ) {
    throw new Error('Unexpected historical order count');
  }
  const seen = new Set<string>();
  let original = false;
  let applied = false;
  for (const row of rows) {
    if (
      !isRecord(row) ||
      row.source !== 'DATASET' ||
      !isLiteralString(row.dataset_order_id) ||
      seen.has(row.dataset_order_id)
    ) {
      throw new Error('Invalid historical order identity or source');
    }
    const entry = byId.get(row.dataset_order_id);
    if (
      !entry ||
      typeof row.order_id !== 'string' ||
      row.order_id.toLowerCase() !== entry.order_id.toLowerCase() ||
      !isUtcTimestamp(row.ordered_at_original)
    ) {
      throw new Error('Historical order does not match the plan');
    }
    seen.add(row.dataset_order_id);
    if (
      row.ordered_at_original !== entry.ordered_at_original &&
      row.ordered_at_original !== entry.ordered_at_proposed
    ) {
      throw new Error('Unexpected historical date');
    }
    if (entry.ordered_at_original !== entry.ordered_at_proposed) {
      original ||= row.ordered_at_original === entry.ordered_at_original;
      applied ||= row.ordered_at_original === entry.ordered_at_proposed;
    }
  }
  if (original && applied) {
    throw new Error('Partial historical date update');
  }
  return original ? 'original' : applied ? 'applied' : 'neutral';
}

export interface HistoricalDatesWriteClient extends HistoricalDatesReadClient {
  query(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: unknown[]; rowCount?: number | null }>;
}

export interface HistoricalDatesWritePool {
  connect(): Promise<HistoricalDatesWriteClient>;
}

export function buildHistoricalDatePlan(
  dates: HistoricalOrderDate[],
  backup: HistoricalDatesBackup,
): HistoricalDatePlanEntry[] {
  const validated = parseHistoricalDatesBackup(JSON.stringify(backup));
  const byId = matchingHistoricalInputs(dates, validated);
  return dates.map((row) => ({
    ...byId.get(row.datasetOrderId)!,
    ordered_at_proposed: argentinaMidnightUtc(row.date),
  }));
}

export function applyHistoricalOrderDates(
  pool: HistoricalDatesWritePool,
  dates: HistoricalOrderDate[],
  backup: HistoricalDatesBackup,
) {
  return changeHistoricalOrderDates(pool, dates, backup, 'apply');
}

export function restoreHistoricalOrderDates(
  pool: HistoricalDatesWritePool,
  dates: HistoricalOrderDate[],
  backup: HistoricalDatesBackup,
) {
  return changeHistoricalOrderDates(pool, dates, backup, 'restore');
}

export class HistoricalDatesOutcomeError extends Error {
  constructor(
    public readonly outcome: 'unknown' | 'committed',
    cause: unknown,
  ) {
    super(
      outcome === 'unknown'
        ? 'Commit outcome unknown; inspect state before retrying'
        : 'Transaction committed; connection cleanup failed',
      { cause },
    );
    this.name = 'HistoricalDatesOutcomeError';
  }
}

async function changeHistoricalOrderDates(
  pool: HistoricalDatesWritePool,
  dates: HistoricalOrderDate[],
  backup: HistoricalDatesBackup,
  mode: 'apply' | 'restore',
): Promise<{ changed: number }> {
  const plan = buildHistoricalDatePlan(dates, backup);
  const client = await pool.connect();
  let begun = false;
  let discard = false;
  let releaseFailure: { error: unknown } | undefined;
  let changed = 0;
  let committing = false;
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ WRITE');
    begun = true;
    await client.query("SET LOCAL lock_timeout = '3s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '15s'");
    const readOrders = (lock: boolean) =>
      client.query(`
      SELECT o.order_id::text, o.dataset_order_id, o.source,
        to_char(o.ordered_at AT TIME ZONE 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS ordered_at_original,
        (to_jsonb(o) - 'ordered_at')::text AS unchanged
      FROM orders AS o WHERE o.source = 'DATASET'
      ORDER BY o.order_id ${lock ? 'FOR NO KEY UPDATE OF o' : ''}
    `);
    const readItems = () =>
      client.query(`
      SELECT row_to_json(i)::text AS snapshot FROM order_items AS i
      JOIN orders AS o ON o.order_id = i.order_id
      WHERE o.source = 'DATASET' ORDER BY i.order_item_id
    `);
    const before = (await readOrders(true)).rows;
    const state = classifyHistoricalDateState(plan, before);
    const targetState = mode === 'apply' ? 'applied' : 'original';
    if (state !== targetState && state !== 'neutral') {
      const otherFields = before.map((row) => {
        if (!isRecord(row) || typeof row.unchanged !== 'string') {
          throw new Error('Missing order snapshot');
        }
        return row.unchanged;
      });
      const itemsBefore = (await readItems()).rows;
      const changes = plan
        .filter((row) => row.ordered_at_original !== row.ordered_at_proposed)
        .map((row) => ({
          order_id: row.order_id,
          dataset_order_id: row.dataset_order_id,
          expected:
            mode === 'apply'
              ? row.ordered_at_original
              : row.ordered_at_proposed,
          target:
            mode === 'apply'
              ? row.ordered_at_proposed
              : row.ordered_at_original,
        }));
      const result = await client.query(
        `
        UPDATE orders AS o SET ordered_at = p.target
        FROM jsonb_to_recordset($1::jsonb) AS p(
          order_id uuid, dataset_order_id text, expected timestamptz, target timestamptz
        ) WHERE o.order_id = p.order_id
          AND o.dataset_order_id = p.dataset_order_id AND o.source = 'DATASET'
          AND o.ordered_at = p.expected AND o.ordered_at IS DISTINCT FROM p.target
      `,
        [JSON.stringify(changes)],
      );
      if (result.rowCount !== changes.length) {
        throw new Error('Unexpected updated order count');
      }
      const after = (await readOrders(false)).rows;
      const otherFieldsAfter = after.map((row) =>
        isRecord(row) ? row.unchanged : null,
      );
      if (
        classifyHistoricalDateState(plan, after) !== targetState ||
        JSON.stringify(otherFieldsAfter) !== JSON.stringify(otherFields)
      ) {
        throw new Error('Historical order verification failed');
      }
      if (
        JSON.stringify((await readItems()).rows) !== JSON.stringify(itemsBefore)
      ) {
        throw new Error('Historical order items changed');
      }
      changed = result.rowCount;
    }
    committing = true;
    await client.query('COMMIT');
  } catch (error) {
    if (committing) discard = true;
    if (begun) {
      try {
        await client.query('ROLLBACK');
      } catch {
        discard = true;
      }
    } else {
      discard = true;
    }
    throw committing
      ? new HistoricalDatesOutcomeError('unknown', error)
      : error;
  } finally {
    try {
      client.release(discard || undefined);
    } catch (error) {
      releaseFailure = { error };
    }
  }
  if (releaseFailure) {
    throw new HistoricalDatesOutcomeError('committed', releaseFailure.error);
  }
  return { changed };
}

function matchingHistoricalInputs(
  dates: HistoricalOrderDate[],
  backup: HistoricalDatesBackup,
) {
  const datesById = new Map(dates.map((row) => [row.datasetOrderId, row]));
  const backupById = new Map(
    backup.records.map((row) => [row.dataset_order_id, row]),
  );
  if (
    dates.length !== HISTORICAL_ORDER_COUNT ||
    datesById.size !== HISTORICAL_ORDER_COUNT ||
    backup.records.length !== HISTORICAL_ORDER_COUNT ||
    backupById.size !== HISTORICAL_ORDER_COUNT ||
    dates.some((row) => !backupById.has(row.datasetOrderId))
  ) {
    throw new Error('CSV and backup identities do not match');
  }
  return backupById;
}

export async function dryRunHistoricalOrderDates(
  pool: HistoricalDatesReadPool,
  dates: HistoricalOrderDate[],
  backup: HistoricalDatesBackup,
): Promise<HistoricalDatePlanEntry[]> {
  const backupById = matchingHistoricalInputs(dates, backup);

  const client = await pool.connect();
  let transactionStarted = false;
  let discardClient = false;
  let releaseFailure: { error: unknown } | undefined;
  let plan: HistoricalDatePlanEntry[];
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    transactionStarted = true;
    const { rows } = await client.query(`
      SELECT order_id::text, dataset_order_id, source,
        to_char(ordered_at AT TIME ZONE 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS ordered_at_original
      FROM orders
      WHERE source = 'DATASET'
    `);
    if (rows.length !== HISTORICAL_ORDER_COUNT) {
      throw new Error('Unexpected historical order count');
    }
    const seenIds = new Set<string>();
    for (const row of rows) {
      if (
        !isRecord(row) ||
        row.source !== 'DATASET' ||
        !isLiteralString(row.dataset_order_id) ||
        seenIds.has(row.dataset_order_id)
      ) {
        throw new Error('Invalid historical order identity or source');
      }
      const original = backupById.get(row.dataset_order_id);
      if (
        !original ||
        typeof row.order_id !== 'string' ||
        row.order_id.toLowerCase() !== original.order_id.toLowerCase() ||
        row.ordered_at_original !== original.ordered_at_original
      ) {
        throw new Error('Historical order does not match the backup');
      }
      seenIds.add(row.dataset_order_id);
    }
    plan = dates.map((row) => ({
      ...backupById.get(row.datasetOrderId)!,
      ordered_at_proposed: argentinaMidnightUtc(row.date),
    }));
    await client.query('COMMIT');
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch {
        discardClient = true;
      }
    } else {
      discardClient = true;
    }
    throw error;
  } finally {
    try {
      if (discardClient) {
        client.release(true);
      } else {
        client.release();
      }
    } catch (releaseError) {
      releaseFailure = { error: releaseError };
    }
  }
  if (releaseFailure) {
    throw releaseFailure.error;
  }
  return plan;
}

function argentinaMidnightUtc(value: string): string {
  validateCsvDate(value);
  const [day, month, year] = value.split('/');
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const offsetName = argentinaOffsetFormatter
    .formatToParts(new Date(`${date}T00:00:00Z`))
    .find((part) => part.type === 'timeZoneName')?.value;
  const offset = /^GMT([+-]\d{2}:\d{2})$/.exec(offsetName ?? '');
  if (!offset) {
    throw new Error('Cannot resolve Argentina timezone offset');
  }
  return new Date(`${date}T00:00:00${offset[1]}`)
    .toISOString()
    .replace('.000Z', '.000000Z');
}

export function parseHistoricalDatesBackup(
  input: string,
): HistoricalDatesBackup {
  let value: unknown;
  try {
    value = JSON.parse(input) as unknown;
  } catch {
    throw new Error('Invalid backup JSON');
  }
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    value.source !== 'DATASET' ||
    !isLiteralString(value.databaseHost) ||
    !isLiteralString(value.databaseName) ||
    !Array.isArray(value.records) ||
    value.records.length !== HISTORICAL_ORDER_COUNT
  ) {
    throw new Error('Invalid backup structure');
  }
  const uuids = new Set<string>();
  const ids = new Set<string>();
  const records = value.records.map((record: unknown) => {
    if (
      !isRecord(record) ||
      typeof record.order_id !== 'string' ||
      !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
        record.order_id,
      ) ||
      uuids.has(record.order_id.toLowerCase()) ||
      !isLiteralString(record.dataset_order_id) ||
      ids.has(record.dataset_order_id) ||
      !isUtcTimestamp(record.ordered_at_original)
    ) {
      throw new Error('Invalid backup record');
    }
    uuids.add(record.order_id.toLowerCase());
    ids.add(record.dataset_order_id);
    return {
      order_id: record.order_id,
      dataset_order_id: record.dataset_order_id,
      ordered_at_original: record.ordered_at_original,
    };
  });
  return {
    version: 1,
    source: 'DATASET',
    databaseHost: value.databaseHost,
    databaseName: value.databaseName,
    records,
  };
}

function isUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.\d{6}Z$/.exec(value);
  return (
    match !== null &&
    isCalendarDate(Number(match[1]), Number(match[2]), Number(match[3])) &&
    Number(match[4]) <= 23 &&
    Number(match[5]) <= 59 &&
    Number(match[6]) <= 59
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLiteralString(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value === value.trim()
  );
}

export function validateHistoricalDatesTarget(
  connectionString: string | undefined,
  target: { hostname: string; port: number; database: string },
): void {
  try {
    if (!isLiteralString(connectionString)) {
      throw new Error();
    }
    const url = new URL(connectionString);
    const queryKeys = [...url.searchParams.keys()];
    const sslMode = url.searchParams.get('sslmode');
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      url.hostname !== target.hostname ||
      Number(url.port || '5432') !== target.port ||
      !Number.isInteger(target.port) ||
      target.port < 1 ||
      target.port > 65535 ||
      !isLiteralString(target.database) ||
      decodeURIComponent(url.pathname.slice(1)) !== target.database ||
      !url.username ||
      url.hash ||
      queryKeys.some((key) => key !== 'sslmode') ||
      queryKeys.length > 1 ||
      (sslMode !== null &&
        !['require', 'verify-full', 'disable'].includes(sslMode))
    ) {
      throw new Error();
    }
  } catch {
    throw new Error('Invalid connection target');
  }
}
