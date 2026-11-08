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
