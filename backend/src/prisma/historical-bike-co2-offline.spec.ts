import { readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  parseHistoricalBikeCo2Offline,
  readHistoricalBikeCo2Offline,
} from './historical-bike-co2-offline';

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
  realpath: jest.fn(),
}));

function syntheticInputs() {
  const rows = Array.from({ length: 1000 }, (_, index) => ({
    id: String(index + 1),
    method: index < 447 ? 'BIKE' : index < 955 ? 'MOTORCYCLE' : 'CAR',
    transport: index < 447 ? 'Bicicleta' : index < 955 ? 'Moto' : 'Auto',
  }));
  const csv = [
    'id_pedido,distancia_km,tipo_transporte,co2_ahorrado_kg',
    ...rows.map((row) => `${row.id},2.2,${row.transport},0.1025`),
  ].join('\n');
  const orders: {
    orderId: string;
    datasetOrderId: string | null;
    source: string;
    deliveryMethod: string;
    co2SavedG: number;
    orderedAt: string;
    restaurantId: string;
  }[] = rows.map((row, index) => ({
    orderId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    datasetOrderId: row.id,
    source: 'DATASET',
    deliveryMethod: row.method,
    co2SavedG: row.method === 'BIKE' ? 103 : 0,
    orderedAt: '2026-06-01T03:00:00.123456Z',
    restaurantId: '10000000-0000-4000-8000-000000000000',
  }));
  orders.push({
    orderId: '00000000-0000-4000-8000-999999999999',
    datasetOrderId: null,
    source: 'APP',
    deliveryMethod: 'MOTORCYCLE',
    co2SavedG: -88,
    orderedAt: '2026-11-01T03:00:00.654321Z',
    restaurantId: '10000000-0000-4000-8000-000000000000',
  });
  return { csv, snapshot: JSON.stringify(orders) };
}

describe('offline historical CO2 reader with synthetic inputs only', () => {
  beforeEach(() => jest.resetAllMocks());

  it('maps the original CSV distance and proposes only DATASET BIKE changes', async () => {
    const { csv, snapshot } = syntheticInputs();
    const report = await parseHistoricalBikeCo2Offline(csv, snapshot);
    expect(report).toMatchObject({
      matchedHistoricalOrders: 1000,
      bikeOrders: 447,
      unchangedHistoricalOrders: 553,
      previousBikeTotalG: 46041,
      proposedBikeTotalG: 45594,
      proposedBikeAverageG: 102,
    });
    expect(report.changes).toHaveLength(447);
    expect(report.changes[0]).toMatchObject({
      datasetOrderId: '1',
      distanceKm: '2.2',
      previousCo2SavedG: 103,
      proposedCo2SavedG: 102,
    });
    expect(readFile).not.toHaveBeenCalled();
  });

  it('accepts BOM and quoted CSV fields without treating CSV CO2 as the BIKE source', async () => {
    const { csv, snapshot } = syntheticInputs();
    const report = await parseHistoricalBikeCo2Offline(
      '\uFEFF' + csv.replace('1,2.2,Bicicleta,0.1025', '1,"2.2",Bicicleta,999'),
      snapshot,
    );
    expect(report.proposedBikeTotalG).toBe(45594);
  });

  it.each([
    [
      'missing distance header',
      (csv: string) => csv.replace('distancia_km', 'other'),
    ],
    [
      'duplicate unused headers',
      (csv: string) =>
        csv
          .split('\n')
          .map(
            (line, index) => line + (index === 0 ? ',unused,unused' : ',x,y'),
          )
          .join('\n'),
    ],
    ['invalid transport', (csv: string) => csv.replace('Bicicleta', 'Unknown')],
    ['invalid row width', (csv: string) => csv + '\nextra,field'],
    [
      'negative non-BIKE distance',
      (csv: string) => csv.replace('448,2.2,Moto', '448,-1,Moto'),
    ],
    [
      'missing identity',
      (csv: string) => csv.replace('1,2.2,Bicicleta', ',2.2,Bicicleta'),
    ],
  ])('rejects %s', async (_name, change) => {
    const { csv, snapshot } = syntheticInputs();
    await expect(
      parseHistoricalBikeCo2Offline(change(csv), snapshot),
    ).rejects.toThrow();
  });

  it.each([
    ['orderId', 'not-a-uuid'],
    ['restaurantId', null],
    ['orderedAt', '2026-06-01T03:00:00.123Z'],
    ['orderedAt', '2026-02-31T03:00:00.123456Z'],
    ['co2SavedG', '103'],
    ['source', 'OTHER'],
  ])('rejects invalid snapshot %s', async (field, invalid) => {
    const { csv, snapshot } = syntheticInputs();
    const orders = JSON.parse(snapshot) as Record<string, unknown>[];
    orders[0][field] = invalid;
    await expect(
      parseHistoricalBikeCo2Offline(csv, JSON.stringify(orders)),
    ).rejects.toThrow();
  });

  it.each(['not-json', '{}', 'null', '[null]'])(
    'rejects malformed snapshot %s',
    async (snapshot) => {
      const { csv } = syntheticInputs();
      await expect(
        parseHistoricalBikeCo2Offline(csv, snapshot),
      ).rejects.toThrow();
    },
  );

  it('reads only the two approved input files inside Backend', async () => {
    const { csv, snapshot } = syntheticInputs();
    jest
      .mocked(realpath)
      .mockImplementation((path) => Promise.resolve(String(path)));
    jest
      .mocked(readFile)
      .mockResolvedValueOnce(csv)
      .mockResolvedValueOnce(snapshot);
    const report = await readHistoricalBikeCo2Offline(
      '.tmp/synthetic.csv',
      '.tmp/synthetic.json',
    );
    expect(report.bikeOrders).toBe(447);
    expect(readFile).toHaveBeenNthCalledWith(
      1,
      resolve('.tmp/synthetic.csv'),
      'utf8',
    );
    expect(readFile).toHaveBeenNthCalledWith(
      2,
      resolve('.tmp/synthetic.json'),
      'utf8',
    );
    expect(readFile).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['../outside.csv', '.tmp/synthetic.json'],
    ['.tmp/synthetic.csv', '../outside.json'],
    ['.env', '.tmp/synthetic.json'],
    ['.tmp/synthetic.csv', '.env'],
  ])(
    'rejects disallowed paths %s and %s before reading content',
    async (csv, snapshot) => {
      jest
        .mocked(realpath)
        .mockImplementation((path) => Promise.resolve(String(path)));
      await expect(
        readHistoricalBikeCo2Offline(csv, snapshot),
      ).rejects.toThrow();
      expect(readFile).not.toHaveBeenCalled();
    },
  );

  it('rejects a symlink escaping Backend before reading content', async () => {
    jest
      .mocked(realpath)
      .mockImplementation((path) =>
        Promise.resolve(
          String(path).endsWith('synthetic.csv')
            ? resolve('../outside.csv')
            : String(path),
        ),
      );
    await expect(
      readHistoricalBikeCo2Offline('.tmp/synthetic.csv', '.tmp/synthetic.json'),
    ).rejects.toThrow();
    expect(readFile).not.toHaveBeenCalled();
  });
});
