import pg from 'pg';
import {
  dryRunHistoricalOrderDates,
  parseHistoricalDatesBackup,
  parseHistoricalDatesCsv,
  validateHistoricalDatesTarget,
  type HistoricalDatesBackup,
  type HistoricalDatesReadPool,
  type HistoricalOrderDate,
} from '../src/prisma/update-historical-order-dates';

// Requires separate authorization: setup creates and populates a session-local
// table, never public.orders. Closing the pool removes that table and its indexes.
const target = { hostname: '127.0.0.1', port: 5433, database: 'ecobite_test' };
const originalDates = [
  '2026-06-01T00:00:00.123456Z',
  '2026-07-01T12:34:56.000001Z',
  '2026-08-01T23:59:59.999999Z',
];
const csvDates = ['1/6/2026', '15/8/2026', '29/10/2026'];
const proposedDates = [
  '2026-06-01T03:00:00.000000Z',
  '2026-08-15T03:00:00.000000Z',
  '2026-10-29T03:00:00.000000Z',
];

interface TransactionState {
  isolation: string;
  read_only: string;
  pid: number;
}

describe('historical dates dry-run (isolated local PostgreSQL)', () => {
  let pool: pg.Pool | undefined;
  let cleanupPromise: Promise<void> | undefined;
  const checkedOut = new Set<pg.PoolClient>();
  let primaryFailure: { error: unknown } | undefined;
  let fixturePid: number;
  let backup: HistoricalDatesBackup;
  let dates: HistoricalOrderDate[];

  beforeAll(async () => {
    if (process.env.HISTORICAL_DATES_TEST_ALLOW_WRITES !== 'yes') {
      throw new Error('Local fixture writes require explicit authorization');
    }
    const connection = process.env.HISTORICAL_DATES_TEST_DATABASE_URL;
    validateHistoricalDatesTarget(connection, target);
    const url = new URL(connection!);
    if (
      decodeURIComponent(url.username) !== 'ecobite_test' ||
      !url.password ||
      url.searchParams.size !== 0
    ) {
      throw new Error(
        'Expected explicit local test credentials without query parameters',
      );
    }
    pool = new pg.Pool({
      host: target.hostname,
      port: target.port,
      database: target.database,
      user: 'ecobite_test',
      password: decodeURIComponent(url.password),
      ssl: false,
      max: 1,
      idleTimeoutMillis: 0,
      connectionTimeoutMillis: 2000,
      statement_timeout: 5000,
      idle_in_transaction_session_timeout: 5000,
      options: '-c search_path=pg_temp',
    });
    try {
      const client = await acquireClient();
      const identity = await client.query<{
        database: string;
        username: string;
        version: number;
        pid: number;
      }>(`SELECT current_database() AS database, current_user AS username,
        current_setting('server_version_num')::int AS version, pg_backend_pid() AS pid`);
      expect(identity.rows[0]).toMatchObject({
        database: target.database,
        username: 'ecobite_test',
      });
      expect(identity.rows[0].version).toBeGreaterThanOrEqual(180000);
      expect(identity.rows[0].version).toBeLessThan(190000);
      fixturePid = identity.rows[0].pid;

      backup = parseHistoricalDatesBackup(
        JSON.stringify({
          version: 1,
          source: 'DATASET',
          databaseHost: target.hostname,
          databaseName: target.database,
          records: Array.from({ length: 1000 }, (_, index) => ({
            order_id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
            dataset_order_id: `fixture-${String(index).padStart(4, '0')}`,
            ordered_at_original: originalDates[index % originalDates.length],
          })),
        }),
      );
      dates = await parseHistoricalDatesCsv(
        [
          'id_pedido;fecha',
          ...backup.records.map(
            (record, index) =>
              `${record.dataset_order_id};${csvDates[index % csvDates.length]}`,
          ),
        ].join('\n'),
      );

      // Do not copy defaults, identities, foreign keys or triggers that could
      // touch permanent objects; only the column shape, checks and indexes.
      await client.query(`CREATE TEMP TABLE orders
        (LIKE public.orders INCLUDING CONSTRAINTS INCLUDING INDEXES)
        ON COMMIT PRESERVE ROWS`);
      await client.query(
        `INSERT INTO pg_temp.orders (
        order_id, dataset_order_id, source, restaurant_id, ordered_at,
        total_amount, distance_km, delivery_method, packaging_type,
        order_status, co2_saved_g, plastic_items_avoided
      ) SELECT order_id, dataset_order_id, 'DATASET',
        '10000000-0000-4000-8000-000000000000'::uuid, ordered_at_original,
        1234.56, 1.25, 'BIKE', 'BIODEGRADABLE', 'COMPLETED', 321, 0
      FROM jsonb_to_recordset($1::jsonb) AS fixture(
        order_id uuid, dataset_order_id text, ordered_at_original timestamptz
      )`,
        [JSON.stringify(backup.records)],
      );
      await client.query(`INSERT INTO pg_temp.orders (
        order_id, dataset_order_id, source, restaurant_id, ordered_at,
        total_amount, distance_km, delivery_method, packaging_type,
        order_status, co2_saved_g, plastic_items_avoided
      ) VALUES ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'fixture-app', 'APP',
        '10000000-0000-4000-8000-000000000000', '2026-09-01T12:00:00.654321Z',
        999.99, 2.50, 'CAR', 'RECYCLABLE', 'PENDING', 0, 0)`);
      await client.query("SET TIME ZONE 'Pacific/Auckland'");
      releaseClient(client);
    } catch (error) {
      primaryFailure ??= { error };
      await cleanup();
      throw error;
    }
  });

  afterAll(cleanup);

  async function acquireClient() {
    const client = await pool!.connect();
    checkedOut.add(client);
    return client;
  }

  function releaseClient(client: pg.PoolClient, discard?: boolean) {
    // Remove first: a throwing release must not be attempted a second time.
    if (!checkedOut.delete(client)) {
      return false;
    }
    client.release(discard);
    return true;
  }

  function cleanup(): Promise<void> {
    // Pool.end() cannot be retried: share the same attempt and its outcome.
    cleanupPromise ??= closeResources();
    return cleanupPromise;
  }

  async function closeResources() {
    const closingPool = pool;
    let cleanupFailure: { error: unknown } | undefined;
    for (const client of checkedOut) {
      try {
        releaseClient(client, true);
      } catch (error) {
        cleanupFailure ??= { error };
      }
    }
    try {
      await closingPool?.end();
      pool = undefined;
    } catch (error) {
      cleanupFailure ??= { error };
    }
    if (cleanupFailure && !primaryFailure) {
      throw cleanupFailure.error;
    }
  }

  async function recordFailure(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      primaryFailure ??= { error };
      throw error;
    }
  }

  function observePool() {
    const counts = { acquired: 0, released: 0 };
    const statements: string[] = [];
    const states: TransactionState[] = [];
    const adapter: HistoricalDatesReadPool = {
      async connect() {
        const client = await acquireClient();
        counts.acquired++;
        return {
          async query(sql: string) {
            const command = sql.trim().split(/\s+/)[0];
            if (
              !['BEGIN', 'SELECT', 'COMMIT', 'ROLLBACK'].includes(command) ||
              /\b(UPDATE|INSERT|DELETE|MERGE|TRUNCATE|CREATE|DROP|ALTER|COPY)\b/i.test(
                sql,
              )
            ) {
              throw new Error('Unexpected write or statement during dry-run');
            }
            statements.push(command);
            const result = await client.query<Record<string, unknown>>(sql);
            if (command === 'BEGIN') {
              const state = await client.query<TransactionState>(
                `SELECT current_setting('transaction_isolation') AS isolation,
                  current_setting('transaction_read_only') AS read_only,
                  pg_backend_pid() AS pid`,
              );
              states.push(state.rows[0]);
            }
            return result;
          },
          release(discard?: boolean) {
            if (releaseClient(client, discard)) {
              counts.released++;
            }
          },
        };
      },
    };
    return { adapter, counts, statements, states };
  }

  async function snapshot() {
    const result = await pool!.query<{
      dataset_order_id: string;
      ordered_at_utc: string;
      snapshot: string;
    }>(`SELECT o.dataset_order_id,
      to_char(o.ordered_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS ordered_at_utc,
      row_to_json(o)::text AS snapshot
      FROM pg_temp.orders AS o ORDER BY order_id`);
    const expectedDates = new Map(
      backup.records.map((record) => [
        record.dataset_order_id,
        record.ordered_at_original,
      ]),
    );
    expectedDates.set('fixture-app', '2026-09-01T12:00:00.654321Z');
    for (const row of result.rows) {
      expect(row.ordered_at_utc).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/,
      );
      expect(row.ordered_at_utc).toBe(expectedDates.get(row.dataset_order_id));
    }
    return result.rows;
  }

  async function expectReleased() {
    expect(pool!.idleCount).toBe(1);
    const client = await acquireClient();
    let failure: { error: unknown } | undefined;
    try {
      const result = await client.query<{ pid: number }>(
        'SELECT pg_backend_pid() AS pid',
      );
      expect(result.rows[0].pid).toBe(fixturePid);
    } catch (error) {
      failure = { error };
    }
    try {
      releaseClient(client);
    } catch (error) {
      failure ??= { error };
    }
    if (failure) {
      throw failure.error;
    }
  }

  it('uses a real read-only snapshot, preserves microseconds and changes no rows', () =>
    recordFailure(async () => {
      const before = await snapshot();
      expect(before).toHaveLength(1001);
      const observed = observePool();

      const plan = await dryRunHistoricalOrderDates(
        observed.adapter,
        dates,
        backup,
      );

      expect(plan).toEqual(
        backup.records.map((record, index) => ({
          ...record,
          ordered_at_proposed: proposedDates[index % proposedDates.length],
        })),
      );
      expect(observed.states).toEqual([
        {
          isolation: 'repeatable read',
          read_only: 'on',
          pid: fixturePid,
        },
      ]);
      expect(observed.statements).toEqual(['BEGIN', 'SELECT', 'COMMIT']);
      expect(observed.counts).toEqual({ acquired: 1, released: 1 });
      await expectReleased();
      expect(await snapshot()).toEqual(before);
    }));

  it.each(['external ID', 'UUID', 'microseconds', 'APP identity'])(
    'rejects inconsistent %s without changes and releases after ROLLBACK',
    (kind) =>
      recordFailure(async () => {
        const before = await snapshot();
        const changedBackup = structuredClone(backup);
        const changedDates = structuredClone(dates);
        if (kind === 'external ID' || kind === 'APP identity') {
          const id =
            kind === 'APP identity' ? 'fixture-app' : 'fixture-unknown';
          changedBackup.records[0].dataset_order_id = id;
          changedDates[0].datasetOrderId = id;
        } else if (kind === 'UUID') {
          changedBackup.records[0].order_id =
            'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
        } else {
          changedBackup.records[0].ordered_at_original =
            '2026-06-01T00:00:00.123457Z';
        }
        const observed = observePool();

        await expect(
          dryRunHistoricalOrderDates(
            observed.adapter,
            changedDates,
            changedBackup,
          ),
        ).rejects.toThrow('Historical order does not match the backup');

        expect(observed.statements).toEqual(['BEGIN', 'SELECT', 'ROLLBACK']);
        expect(observed.counts).toEqual({ acquired: 1, released: 1 });
        expect(observed.states).toEqual([
          {
            isolation: 'repeatable read',
            read_only: 'on',
            pid: fixturePid,
          },
        ]);
        await expectReleased();
        expect(await snapshot()).toEqual(before);
      }),
  );
});
