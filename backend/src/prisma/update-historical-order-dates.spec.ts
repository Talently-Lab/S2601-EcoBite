import * as historicalDatesModule from './update-historical-order-dates';
import {
  dryRunHistoricalOrderDates,
  parseHistoricalDatesBackup,
  parseHistoricalDatesCsv,
  validateHistoricalDatesTarget,
} from './update-historical-order-dates';

function datesCsv(count = 1000): string {
  const rows = Array.from(
    { length: count },
    (_, index) => `${String(index).padStart(5, '0')};1/6/2026`,
  );
  return ['id_pedido;fecha', ...rows].join('\n');
}

function backupFixture() {
  return {
    version: 1,
    source: 'DATASET',
    databaseHost: 'ep-fixture.neon.tech',
    databaseName: 'ecobite_fixture',
    records: Array.from({ length: 1000 }, (_, index) => ({
      order_id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      dataset_order_id: String(index).padStart(5, '0'),
      ordered_at_original: '2026-06-01T00:00:00.123456Z',
    })),
  };
}

function transactionFixture() {
  const backup = parseHistoricalDatesBackup(JSON.stringify(backupFixture()));
  const dates = backup.records.map((record) => ({
    datasetOrderId: record.dataset_order_id,
    date: '1/6/2026',
  }));
  const rows = backup.records.map((record) => ({
    ...record,
    source: 'DATASET',
  }));
  const client = {
    query: jest.fn((sql: string) =>
      Promise.resolve({ rows: /\bSELECT\b/i.test(sql) ? rows : [] }),
    ),
    release: jest.fn<void, [boolean?]>(),
  };
  const pool = {
    connect: jest.fn().mockResolvedValue(client),
    query: jest
      .fn<Promise<{ rows: unknown[] }>, [string]>()
      .mockRejectedValue(new Error('pool.query must not run')),
  };
  return { pool, client, dates, backup };
}

describe('historical date state classification', () => {
  it('classifies original, applied and neutral states and rejects mixed or unexpected rows', () => {
    const classify = historicalDatesModule.classifyHistoricalDateState;
    const plan = backupFixture().records.map((record) => ({
      ...record,
      ordered_at_proposed: '2026-06-01T03:00:00.000000Z',
    }));
    const rows = plan.map((record) => ({ ...record, source: 'DATASET' }));
    expect(classify(plan, rows)).toBe('original');
    const applied = rows.map((row) => ({
      ...row,
      ordered_at_original: row.ordered_at_proposed,
    }));
    expect(classify(plan, applied)).toBe('applied');
    expect(() => classify(plan, [applied[0], ...rows.slice(1)])).toThrow();
    const neutral = plan.map((row) => ({
      ...row,
      ordered_at_original: row.ordered_at_proposed,
    }));
    expect(classify(neutral, applied)).toBe('neutral');
    for (const invalid of [
      rows.slice(1),
      [...rows, rows[0]],
      [rows[0], ...rows.slice(0, -1)],
      [{ ...rows[0], source: 'APP' }, ...rows.slice(1)],
      [{ ...rows[0], order_id: rows[1].order_id }, ...rows.slice(1)],
      [
        { ...rows[0], ordered_at_original: '2026-06-01T00:00:00.123457Z' },
        ...rows.slice(1),
      ],
    ]) {
      expect(() => classify(plan, invalid)).toThrow();
    }
  });
});

describe('historical date writes', () => {
  function fixture(applied = false) {
    const backup = parseHistoricalDatesBackup(JSON.stringify(backupFixture()));
    const dates = backup.records.map((row) => ({
      datasetOrderId: row.dataset_order_id,
      date: '1/6/2026',
    }));
    let rows = backup.records.map((row) => ({
      ...row,
      source: 'DATASET',
      unchanged: JSON.stringify({ total: '1234.56', id: row.order_id }),
      ordered_at_original: applied
        ? '2026-06-01T03:00:00.000000Z'
        : row.ordered_at_original,
    }));
    const items = [{ snapshot: '{"quantity":2,"unit_price":12.34}' }];
    const client = {
      query: jest.fn((sql: string, values?: unknown[]) => {
        if (sql.trim().startsWith('UPDATE')) {
          const changes = JSON.parse(values![0] as string) as {
            order_id: string;
            expected: string;
            target: string;
          }[];
          let rowCount = 0;
          rows = rows.map((row) => {
            const change = changes.find(
              (entry) => entry.order_id === row.order_id,
            );
            if (change && row.ordered_at_original === change.expected) {
              rowCount++;
              return { ...row, ordered_at_original: change.target };
            }
            return row;
          });
          return Promise.resolve({ rows: [], rowCount });
        }
        return Promise.resolve({
          rows: sql.includes('FROM order_items')
            ? items
            : sql.includes('FROM orders')
              ? structuredClone(rows)
              : [],
        });
      }),
      release: jest.fn<void, [boolean?]>(),
    };
    return {
      backup,
      dates,
      client,
      pool: { connect: jest.fn().mockResolvedValue(client) },
      rows,
      items,
    };
  }

  function operation(mode: 'apply' | 'restore') {
    return mode === 'apply'
      ? historicalDatesModule.applyHistoricalOrderDates
      : historicalDatesModule.restoreHistoricalOrderDates;
  }

  it('apply locks and updates only ordered_at with parameters, verifies and commits on one client', async () => {
    const f = fixture();
    await expect(
      operation('apply')(f.pool, f.dates, f.backup),
    ).resolves.toEqual({
      changed: 1000,
    });
    expect(f.pool.connect).toHaveBeenCalledTimes(1);
    expect(f.client.query.mock.calls[0][0]).toBe(
      'BEGIN ISOLATION LEVEL REPEATABLE READ READ WRITE',
    );
    expect(
      f.client.query.mock.calls.some(([sql]) =>
        sql.includes('FOR NO KEY UPDATE'),
      ),
    ).toBe(true);
    const updates = f.client.query.mock.calls.filter(([sql]) =>
      sql.trim().startsWith('UPDATE'),
    );
    expect(updates).toHaveLength(1);
    expect(updates[0][0]).toMatch(/SET\s+ordered_at\s*=/);
    expect(updates[0][0]).toContain('$1::jsonb');
    expect(updates[0][0]).not.toContain(f.backup.records[0].order_id);
    expect(updates[0][0]).toContain("source = 'DATASET'");
    expect(f.client.query.mock.calls.at(-1)![0]).toBe('COMMIT');
    expect(f.client.release).toHaveBeenCalledTimes(1);
  });

  it.each(['apply', 'restore'] as const)(
    '%s is a no-op in its complete target state',
    async (mode) => {
      const f = fixture(mode === 'apply');
      await expect(operation(mode)(f.pool, f.dates, f.backup)).resolves.toEqual(
        { changed: 0 },
      );
      expect(
        f.client.query.mock.calls.some(([sql]) =>
          sql.trim().startsWith('UPDATE'),
        ),
      ).toBe(false);
      expect(f.client.release).toHaveBeenCalledTimes(1);
    },
  );

  it('restore passes the original six-decimal strings unchanged to PostgreSQL', async () => {
    const f = fixture(true);
    await expect(
      operation('restore')(f.pool, f.dates, f.backup),
    ).resolves.toEqual({
      changed: 1000,
    });
    const update = f.client.query.mock.calls.find(([sql]) =>
      sql.trim().startsWith('UPDATE'),
    )!;
    expect(JSON.parse(update[1]![0] as string)[0]).toEqual({
      order_id: f.backup.records[0].order_id,
      dataset_order_id: f.backup.records[0].dataset_order_id,
      expected: '2026-06-01T03:00:00.000000Z',
      target: '2026-06-01T00:00:00.123456Z',
    });
  });

  it.each(['partial', 'APP', 'UUID', 'microsecond'] as const)(
    'rejects %s before any update and rolls back',
    async (kind) => {
      const f = fixture();
      if (kind === 'partial') {
        f.rows[0].ordered_at_original = '2026-06-01T03:00:00.000000Z';
      }
      if (kind === 'APP') f.rows[0].source = 'APP';
      if (kind === 'UUID') f.rows[0].order_id = f.rows[1].order_id;
      if (kind === 'microsecond') {
        f.rows[0].ordered_at_original = '2026-06-01T00:00:00.123457Z';
      }
      await expect(
        operation('apply')(f.pool, f.dates, f.backup),
      ).rejects.toThrow();
      expect(
        f.client.query.mock.calls.some(([sql]) =>
          sql.trim().startsWith('UPDATE'),
        ),
      ).toBe(false);
      expect(f.client.query.mock.calls.at(-1)![0]).toBe('ROLLBACK');
      expect(f.client.release).toHaveBeenCalledTimes(1);
    },
  );

  it('marks a failed COMMIT as unknown and discards the connection without hiding its cause', async () => {
    const f = fixture();
    const original = new Error('connection lost');
    const query = f.client.query.getMockImplementation()!;
    f.client.query.mockImplementation((sql, values) =>
      sql === 'COMMIT' ? Promise.reject(original) : query(sql, values),
    );
    await expect(
      operation('apply')(f.pool, f.dates, f.backup),
    ).rejects.toMatchObject({ outcome: 'unknown', cause: original });
    expect(f.client.release).toHaveBeenCalledWith(true);
  });

  it('reports successful commit when release subsequently fails', async () => {
    const f = fixture();
    f.client.release.mockImplementation(() => {
      throw new Error('release failed');
    });
    await expect(
      operation('apply')(f.pool, f.dates, f.backup),
    ).rejects.toMatchObject({ outcome: 'committed' });
    expect(f.client.query.mock.calls.at(-1)![0]).toBe('COMMIT');
  });

  const failureKinds = [
    'count',
    'date',
    'attributes',
    'items',
    'update',
    'timeout',
  ] as const;
  it.each(failureKinds)('rolls back on %s', async (kind) => {
    const f = fixture();
    const query = f.client.query.getMockImplementation()!;
    let updated = false;
    f.client.query.mockImplementation(async (sql, values) => {
      if (
        (kind === 'update' && sql.trim().startsWith('UPDATE')) ||
        (kind === 'timeout' && sql.includes('FOR NO KEY UPDATE'))
      ) {
        throw new Error('injected failure');
      }
      const result = await query(sql, values);
      if (sql.trim().startsWith('UPDATE')) {
        updated = true;
        if (kind === 'count') return { ...result, rowCount: 999 };
      }
      if (
        updated &&
        sql.includes('FROM orders') &&
        !sql.trim().startsWith('UPDATE')
      ) {
        const rows = result.rows as typeof f.rows;
        if (kind === 'date') {
          rows[0].ordered_at_original = f.backup.records[0].ordered_at_original;
        }
        if (kind === 'attributes') rows[0].unchanged = 'changed';
      }
      if (updated && kind === 'items' && sql.includes('FROM order_items')) {
        return { rows: [{ snapshot: 'changed' }] };
      }
      return result;
    });
    await expect(
      operation('apply')(f.pool, f.dates, f.backup),
    ).rejects.toThrow();
    expect(f.client.query.mock.calls.at(-1)![0]).toBe('ROLLBACK');
    expect(f.client.query.mock.calls.some(([sql]) => sql === 'COMMIT')).toBe(
      false,
    );
    expect(f.client.release).toHaveBeenCalledTimes(1);
  });

  it('preserves an update error when rollback and release also fail', async () => {
    const f = fixture();
    const original = new Error('update failed');
    const query = f.client.query.getMockImplementation()!;
    f.client.query.mockImplementation((sql, values) => {
      if (sql.trim().startsWith('UPDATE')) return Promise.reject(original);
      if (sql === 'ROLLBACK') {
        return Promise.reject(new Error('rollback failed'));
      }
      return query(sql, values);
    });
    f.client.release.mockImplementation(() => {
      throw new Error('release failed');
    });
    await expect(operation('apply')(f.pool, f.dates, f.backup)).rejects.toBe(
      original,
    );
    expect(f.client.release).toHaveBeenCalledWith(true);
  });

  it('skips neutral rows and counts only real changes', async () => {
    const f = fixture();
    f.backup.records[0].ordered_at_original = '2026-06-01T03:00:00.000000Z';
    f.rows[0].ordered_at_original = f.backup.records[0].ordered_at_original;
    await expect(
      operation('apply')(f.pool, f.dates, f.backup),
    ).resolves.toEqual({ changed: 999 });
  });

  it('does not write when all rows are neutral', async () => {
    const f = fixture(true);
    for (const row of f.backup.records) {
      row.ordered_at_original = '2026-06-01T03:00:00.000000Z';
    }
    await expect(
      operation('apply')(f.pool, f.dates, f.backup),
    ).resolves.toEqual({ changed: 0 });
    expect(
      f.client.query.mock.calls.some(([sql]) =>
        sql.trim().startsWith('UPDATE'),
      ),
    ).toBe(false);
  });

  it('validates backup and exact input identities before acquiring a connection', async () => {
    const f = fixture();
    f.dates[0].datasetOrderId = 'unknown';
    await expect(operation('apply')(f.pool, f.dates, f.backup)).rejects.toThrow(
      'CSV and backup identities do not match',
    );
    expect(f.pool.connect).not.toHaveBeenCalled();
    f.backup.records[0].ordered_at_original = '2026-06-01T00:00:00.123Z';
    await expect(
      operation('restore')(f.pool, f.dates, f.backup),
    ).rejects.toThrow('Invalid backup record');
    expect(f.pool.connect).not.toHaveBeenCalled();
  });
});

describe('historical order date validation', () => {
  describe('dry-run transaccional', () => {
    it('conserva el error original y descarta la conexión si falla ROLLBACK', async () => {
      const { pool, client, dates, backup } = transactionFixture();
      const originalError = new Error('synthetic SELECT failure');
      client.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(originalError)
        .mockRejectedValueOnce(new Error('synthetic ROLLBACK failure'));

      await expect(
        dryRunHistoricalOrderDates(pool, dates, backup),
      ).rejects.toBe(originalError);

      expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalledTimes(1);
      expect(client.release).toHaveBeenCalledWith(true);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('conserva el error original aunque también falle release', async () => {
      const { pool, client, dates, backup } = transactionFixture();
      const originalError = new Error('synthetic SELECT failure');
      client.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(originalError);
      client.release.mockImplementation(() => {
        throw new Error('synthetic release failure');
      });

      await expect(
        dryRunHistoricalOrderDates(pool, dates, backup),
      ).rejects.toBe(originalError);

      expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('descarta la conexión si falla BEGIN y conserva ese error', async () => {
      const { pool, client, dates, backup } = transactionFixture();
      const originalError = new Error('synthetic BEGIN failure');
      client.query.mockRejectedValueOnce(originalError);

      await expect(
        dryRunHistoricalOrderDates(pool, dates, backup),
      ).rejects.toBe(originalError);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.release).toHaveBeenCalledTimes(1);
      expect(client.release).toHaveBeenCalledWith(true);
    });

    it('intenta ROLLBACK y libera la conexión si falla COMMIT', async () => {
      const { pool, client, dates, backup } = transactionFixture();
      const originalError = new Error('synthetic COMMIT failure');
      client.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: backup.records.map((record) => ({
            ...record,
            source: 'DATASET',
          })),
        })
        .mockRejectedValueOnce(originalError);

      await expect(
        dryRunHistoricalOrderDates(pool, dates, backup),
      ).rejects.toBe(originalError);

      expect(
        client.query.mock.calls.map(([sql]) => sql.trim().split(/\s+/)[0]),
      ).toEqual(['BEGIN', 'SELECT', 'COMMIT', 'ROLLBACK']);
      expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('propaga un fallo de adquisición sin usar ni liberar un cliente no adquirido', async () => {
      const { pool, client, dates, backup } = transactionFixture();
      const originalError = new Error('synthetic connect failure');
      pool.connect.mockRejectedValueOnce(originalError);

      await expect(
        dryRunHistoricalOrderDates(pool, dates, backup),
      ).rejects.toBe(originalError);

      expect(pool.connect).toHaveBeenCalledTimes(1);
      expect(pool.query).not.toHaveBeenCalled();
      expect(client.query).not.toHaveBeenCalled();
      expect(client.release).not.toHaveBeenCalled();
    });

    it('informa un error de release cuando no existe un error anterior', async () => {
      const { pool, client, dates, backup } = transactionFixture();
      const releaseError = new Error('synthetic release failure');
      client.release.mockImplementation(() => {
        throw releaseError;
      });

      await expect(
        dryRunHistoricalOrderDates(pool, dates, backup),
      ).rejects.toBe(releaseError);

      expect(client.query).toHaveBeenLastCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('rechaza IDs incompletos antes de adquirir una conexión', async () => {
      const { pool, client, dates, backup } = transactionFixture();

      await expect(
        dryRunHistoricalOrderDates(pool, dates.slice(1), backup),
      ).rejects.toThrow('CSV and backup identities do not match');

      expect(pool.connect).not.toHaveBeenCalled();
      expect(pool.query).not.toHaveBeenCalled();
      expect(client.release).not.toHaveBeenCalled();
    });

    it('usa una conexión adquirida una vez y la libera después del COMMIT', async () => {
      const { pool, client, dates, backup } = transactionFixture();

      await expect(
        dryRunHistoricalOrderDates(pool, dates, backup),
      ).resolves.toHaveLength(1000);

      expect(pool.connect).toHaveBeenCalledTimes(1);
      expect(pool.query).not.toHaveBeenCalled();
      expect(
        client.query.mock.calls.map(([sql]) => sql.trim().split(/\s+/)[0]),
      ).toEqual(['BEGIN', 'SELECT', 'COMMIT']);
      expect(client.query).toHaveBeenNthCalledWith(
        1,
        'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY',
      );
      expect(client.release).toHaveBeenCalledTimes(1);
      expect(client.release).toHaveBeenCalledWith();
      expect(client.query.mock.invocationCallOrder.at(-1)).toBeLessThan(
        client.release.mock.invocationCallOrder[0],
      );
    });

    it('ejecuta ROLLBACK y libera la misma conexión ante un error de lectura', async () => {
      const { pool, client, dates, backup } = transactionFixture();
      const originalError = new Error('synthetic SELECT failure');
      client.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(originalError);

      await expect(
        dryRunHistoricalOrderDates(pool, dates, backup),
      ).rejects.toBe(originalError);

      expect(pool.connect).toHaveBeenCalledTimes(1);
      expect(pool.query).not.toHaveBeenCalled();
      expect(
        client.query.mock.calls.map(([sql]) => sql.trim().split(/\s+/)[0]),
      ).toEqual(['BEGIN', 'SELECT', 'ROLLBACK']);
      expect(client.release).toHaveBeenCalledTimes(1);
      expect(client.release).toHaveBeenCalledWith();
      expect(client.query.mock.invocationCallOrder.at(-1)).toBeLessThan(
        client.release.mock.invocationCallOrder[0],
      );
    });
  });

  it('dry-run prepara el plan exacto DATASET a medianoche argentina sin escrituras', async () => {
    const dates = await parseHistoricalDatesCsv(
      datesCsv().replace('00000;1/6/2026', '00000;29/10/2026'),
    );
    const backup = parseHistoricalDatesBackup(JSON.stringify(backupFixture()));
    const currentRows = backup.records.map((record) => ({
      ...record,
      source: 'DATASET',
    }));
    const writes = /\b(UPDATE|INSERT|DELETE)\b/i;
    const mockClient = (rows: typeof currentRows) => ({
      release: jest.fn(),
      query: jest.fn((sql: string) => {
        if (writes.test(sql)) {
          throw new Error('dry-run attempted a write');
        }
        return Promise.resolve({ rows: /\bSELECT\b/i.test(sql) ? rows : [] });
      }),
    });
    type DryRun = (
      pool: { connect(): Promise<ReturnType<typeof mockClient>> },
      dates: historicalDatesModule.HistoricalOrderDate[],
      backup: historicalDatesModule.HistoricalDatesBackup,
    ) => Promise<unknown>;
    const dryRun = (
      historicalDatesModule as typeof historicalDatesModule & {
        dryRunHistoricalOrderDates?: DryRun;
      }
    ).dryRunHistoricalOrderDates;

    if (typeof dryRun !== 'function') {
      throw new Error('dryRunHistoricalOrderDates is not implemented');
    }

    const client = mockClient([...currentRows].reverse());
    await expect(
      dryRun({ connect: jest.fn().mockResolvedValue(client) }, dates, backup),
    ).resolves.toEqual(
      backup.records.map((record, index) => ({
        ...record,
        ordered_at_proposed:
          index === 0
            ? '2026-10-29T03:00:00.000000Z'
            : '2026-06-01T03:00:00.000000Z',
      })),
    );
    expect(client.query).toHaveBeenCalled();
    expect(client.query.mock.calls.some(([sql]) => writes.test(sql))).toBe(
      false,
    );

    const invalidSets = [
      currentRows.slice(1),
      [...currentRows, { ...currentRows[0], dataset_order_id: 'EXTRA' }],
      [currentRows[0], ...currentRows.slice(0, -1)],
      [
        { ...currentRows[0], dataset_order_id: 'UNKNOWN' },
        ...currentRows.slice(1),
      ],
      [{ ...currentRows[0], source: 'APP' }, ...currentRows.slice(1)],
    ];
    for (const rows of invalidSets) {
      const invalidClient = mockClient(rows);
      await expect(
        dryRun(
          { connect: jest.fn().mockResolvedValue(invalidClient) },
          dates,
          backup,
        ),
      ).rejects.toThrow();
      expect(
        invalidClient.query.mock.calls.some(([sql]) => writes.test(sql)),
      ).toBe(false);
    }
  });

  describe('explicit connection target', () => {
    const target = {
      hostname: '127.0.0.1',
      port: 55432,
      database: 'ecobite_dates_test',
    };
    const localUrl =
      'postgresql://fixture:fixture@127.0.0.1:55432/ecobite_dates_test';

    it('accepts only a connection matching the supplied target', () => {
      expect(() =>
        validateHistoricalDatesTarget(localUrl, target),
      ).not.toThrow();
    });

    it.each(['require', 'verify-full', 'disable'])(
      'allows explicit sslmode=%s without overriding the destination',
      (mode) => {
        expect(() =>
          validateHistoricalDatesTarget(`${localUrl}?sslmode=${mode}`, target),
        ).not.toThrow();
      },
    );

    it('accepts the postgres scheme and its standard port', () => {
      expect(() =>
        validateHistoricalDatesTarget(
          'postgres://fixture:fixture@127.0.0.1/ecobite_dates_test',
          { ...target, port: 5432 },
        ),
      ).not.toThrow();
    });

    it.each([
      ['absent connection', undefined],
      ['empty connection', ''],
      ['malformed connection', 'not-a-url'],
      ['wrong protocol', localUrl.replace('postgresql:', 'https:')],
      ['remote host', localUrl.replace('127.0.0.1', 'ep-fixture.neon.tech')],
      ['wrong port', localUrl.replace('55432', '5432')],
      ['implicit wrong port', localUrl.replace(':55432', '')],
      ['wrong database', localUrl.replace('ecobite_dates_test', 'other')],
      ['missing database', localUrl.replace('/ecobite_dates_test', '')],
      ['missing user', localUrl.replace('fixture:fixture@', '')],
      ['fragment', `${localUrl}#other`],
      ['leading whitespace', ` ${localUrl}`],
      ['host override', `${localUrl}?host=ep-fixture.neon.tech`],
      ['hostaddr override', `${localUrl}?hostaddr=192.0.2.1`],
      ['port override', `${localUrl}?port=5432`],
      ['database override', `${localUrl}?database=other`],
      ['user override', `${localUrl}?user=other`],
      ['socket override', `${localUrl}?host=/tmp`],
      ['invalid sslmode', `${localUrl}?sslmode=unexpected`],
      ['repeated sslmode', `${localUrl}?sslmode=require&sslmode=disable`],
    ])('rejects %s before any client exists', (_label, url) => {
      expect(() => validateHistoricalDatesTarget(url, target)).toThrow(
        'Invalid connection target',
      );
    });

    it('does not include credentials or connection strings in errors', () => {
      try {
        validateHistoricalDatesTarget(`${localUrl}?host=other`, target);
        throw new Error('Expected validation to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Invalid connection target');
      }
    });
  });
  describe('backup structure', () => {
    it('reads version 1 without losing timestamp precision', () => {
      const input = backupFixture();

      expect(parseHistoricalDatesBackup(JSON.stringify(input))).toEqual(input);
    });

    it.each([
      ['invalid JSON', '{'],
      ['null root', 'null'],
      ['array root', '[]'],
      [
        'unsupported version',
        JSON.stringify({ ...backupFixture(), version: 2 }),
      ],
      ['string version', JSON.stringify({ ...backupFixture(), version: '1' })],
      ['APP source', JSON.stringify({ ...backupFixture(), source: 'APP' })],
      [
        'missing host',
        JSON.stringify({ ...backupFixture(), databaseHost: '' }),
      ],
      [
        'missing database',
        JSON.stringify({ ...backupFixture(), databaseName: '' }),
      ],
      ['invalid records', JSON.stringify({ ...backupFixture(), records: {} })],
      [
        'incomplete backup',
        JSON.stringify({ ...backupFixture(), records: [] }),
      ],
    ])('rejects %s', (_label, input) => {
      expect(() => parseHistoricalDatesBackup(input)).toThrow('Invalid backup');
    });
  });

  describe('backup records', () => {
    it.each([
      ['missing UUID', { order_id: undefined }],
      ['invalid UUID', { order_id: 'not-a-uuid' }],
      [
        'UUID with final newline',
        { order_id: '00000000-0000-4000-8000-000000000001\n' },
      ],
      ['duplicate UUID', { order_id: '00000000-0000-4000-8000-000000000000' }],
      ['empty external ID', { dataset_order_id: '' }],
      ['numeric external ID', { dataset_order_id: 1 }],
      ['padded external ID', { dataset_order_id: ' 00001' }],
      ['duplicate external ID', { dataset_order_id: '00000' }],
      ['missing timestamp', { ordered_at_original: undefined }],
      [
        'timestamp with final newline',
        { ordered_at_original: '2026-06-01T00:00:00.123456Z\n' },
      ],
      [
        'millisecond timestamp',
        { ordered_at_original: '2026-06-01T00:00:00.123Z' },
      ],
      [
        'seven decimals',
        { ordered_at_original: '2026-06-01T00:00:00.1234567Z' },
      ],
      [
        'non-Z offset',
        { ordered_at_original: '2026-06-01T00:00:00.123456+00:00' },
      ],
      [
        'invalid calendar',
        { ordered_at_original: '2026-02-29T00:00:00.123456Z' },
      ],
      [
        'non-leap century',
        { ordered_at_original: '1900-02-29T00:00:00.123456Z' },
      ],
      ['invalid hour', { ordered_at_original: '2026-06-01T24:00:00.123456Z' }],
      [
        'invalid minute',
        { ordered_at_original: '2026-06-01T00:60:00.123456Z' },
      ],
      [
        'invalid second',
        { ordered_at_original: '2026-06-01T00:00:60.123456Z' },
      ],
      ['year zero', { ordered_at_original: '0000-06-01T00:00:00.123456Z' }],
    ])('rejects %s', (_label, patch) => {
      const input = backupFixture();
      const records: unknown[] = input.records;
      records[1] = { ...input.records[1], ...patch };

      expect(() => parseHistoricalDatesBackup(JSON.stringify(input))).toThrow(
        'Invalid backup record',
      );
    });

    it('rejects a null record', () => {
      const input = backupFixture();
      const records: unknown[] = input.records;
      records[0] = null;

      expect(() => parseHistoricalDatesBackup(JSON.stringify(input))).toThrow();
    });

    it('rejects duplicate UUIDs regardless of hex letter casing', () => {
      const input = backupFixture();
      input.records[0].order_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      input.records[1].order_id = input.records[0].order_id.toUpperCase();

      expect(() => parseHistoricalDatesBackup(JSON.stringify(input))).toThrow();
    });

    it.each(['2024-02-29T23:59:59.000001Z', '2000-02-29T00:00:00.999999Z'])(
      'preserves %s outside the new CSV range',
      (timestamp) => {
        const input = backupFixture();
        input.records[0].ordered_at_original = timestamp;

        expect(
          parseHistoricalDatesBackup(JSON.stringify(input)).records[0]
            .ordered_at_original,
        ).toBe(timestamp);
      },
    );
  });
  describe('CSV structure', () => {
    it('reads semicolon-separated values and preserves literal IDs', async () => {
      const rows = await parseHistoricalDatesCsv(datesCsv());

      expect(rows).toHaveLength(1000);
      expect(rows[0]).toEqual({ datasetOrderId: '00000', date: '1/6/2026' });
    });

    it('accepts an initial BOM and CRLF', async () => {
      const rows = await parseHistoricalDatesCsv(
        `\uFEFF${datesCsv().replaceAll('\n', '\r\n')}\r\n`,
      );

      expect(rows).toHaveLength(1000);
    });

    it.each([
      ['comma separator', datesCsv().replaceAll(';', ',')],
      [
        'reversed headers',
        datesCsv().replace('id_pedido;fecha', 'fecha;id_pedido'),
      ],
      [
        'extra header',
        datesCsv().replace('id_pedido;fecha', 'id_pedido;fecha;extra'),
      ],
      ['missing header', datesCsv().replace('id_pedido;fecha\n', '')],
      ['extra value', datesCsv().replace('00000;1/6/2026', '00000;1/6/2026;x')],
      ['missing value', datesCsv().replace('00000;1/6/2026', '00000')],
      ['empty input', ''],
    ])('rejects %s', async (_label, input) => {
      await expect(parseHistoricalDatesCsv(input)).rejects.toThrow();
    });
  });

  describe('CSV identities and cardinality', () => {
    it.each([
      ['duplicate ID', datesCsv().replace('00001;', '00000;')],
      ['empty ID', datesCsv().replace('00000;', ';')],
      ['leading whitespace', datesCsv().replace('00000;', ' 00000;')],
      ['trailing whitespace', datesCsv().replace('00000;', '00000 ;')],
      ['too few rows', datesCsv(999)],
      ['too many rows', datesCsv(1001)],
      ['no rows', 'id_pedido;fecha'],
      ['blank record', datesCsv().replace('00000;1/6/2026', '')],
    ])('rejects %s', async (_label, input) => {
      await expect(parseHistoricalDatesCsv(input)).rejects.toThrow();
    });

    it('keeps alphanumeric IDs without numeric normalization', async () => {
      const rows = await parseHistoricalDatesCsv(
        datesCsv().replace('00000;', 'ORDER-00000;'),
      );

      expect(rows[0].datasetOrderId).toBe('ORDER-00000');
    });
  });

  describe('CSV dates', () => {
    it('rejects a quoted date containing a final newline', async () => {
      await expect(
        parseHistoricalDatesCsv(
          datesCsv().replace('00000;1/6/2026', '00000;"1/6/2026\n"'),
        ),
      ).rejects.toThrow('Invalid or out-of-range CSV date');
    });
    it.each(['1/6/2026', '01/06/2026', '29/10/2026', '30/6/2026'])(
      'accepts %s within the inclusive approved range',
      async (date) => {
        const rows = await parseHistoricalDatesCsv(
          datesCsv().replace('00000;1/6/2026', `00000;${date}`),
        );

        expect(rows[0].date).toBe(date);
      },
    );

    it.each([
      '',
      '31/6/2026',
      '31/9/2026',
      '0/6/2026',
      '1/13/2026',
      '31/5/2026',
      '30/10/2026',
      '1/6/2027',
      '2026-06-01',
      '1/6/26',
      '001/6/2026',
      ' 1/6/2026',
      '1/6/2026 ',
      '1/6/2026T00:00:00Z',
    ])('rejects invalid or out-of-range date %s', async (date) => {
      await expect(
        parseHistoricalDatesCsv(
          datesCsv().replace('00000;1/6/2026', `00000;${date}`),
        ),
      ).rejects.toThrow('Invalid or out-of-range CSV date');
    });
  });
});
