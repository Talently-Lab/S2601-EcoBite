import { Readable } from 'node:stream';
import { readFile, realpath } from 'node:fs/promises';
import {
  basename,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import csvParser from 'csv-parser';
import {
  dryRunHistoricalBikeCo2,
  type HistoricalCo2DatasetRow,
  type OfflineCo2Order,
} from './historical-bike-co2-dry-run';

type OfflineReport = ReturnType<typeof dryRunHistoricalBikeCo2>;

export async function parseHistoricalBikeCo2Offline(
  csv: string,
  snapshot: string,
): Promise<OfflineReport> {
  const dataset: HistoricalCo2DatasetRow[] = [];
  const transports = {
    Bicicleta: 'BIKE',
    Moto: 'MOTORCYCLE',
    Auto: 'CAR',
  } as const;
  const decoder = csvParser({ strict: true });
  decoder.on('headers', (headers: string[]) => {
    if (
      new Set(headers).size !== headers.length ||
      !['id_pedido', 'distancia_km', 'tipo_transporte'].every((name) =>
        headers.includes(name),
      )
    ) {
      decoder.destroy(new Error('Invalid historical CSV headers'));
    }
  });
  const parser = Readable.from([csv.replace(/^\uFEFF/, '')]).pipe(decoder);
  for await (const value of parser) {
    const row = value as Record<string, string>;
    if (
      !row.id_pedido ||
      row.id_pedido !== row.id_pedido.trim() ||
      !/^\d+(\.\d+)?$/.test(row.distancia_km ?? '') ||
      !Object.hasOwn(transports, row.tipo_transporte)
    ) {
      throw new Error('Invalid historical CSV row');
    }
    dataset.push({
      datasetOrderId: row.id_pedido,
      distanceKm: row.distancia_km,
      deliveryMethod:
        transports[row.tipo_transporte as keyof typeof transports],
    });
  }
  const parsed: unknown = JSON.parse(snapshot);
  if (!Array.isArray(parsed)) throw new Error('Expected a snapshot array');
  const orders: OfflineCo2Order[] = [];
  for (const value of parsed) {
    if (!isOfflineOrder(value))
      throw new Error('Invalid offline order snapshot');
    orders.push(value);
  }
  return dryRunHistoricalBikeCo2(dataset, orders);
}

function isOfflineOrder(value: unknown): value is OfflineCo2Order {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const row = value as Record<string, unknown>;
  return (
    isUuid(row.orderId) &&
    isUuid(row.restaurantId) &&
    (row.source === 'DATASET' || row.source === 'APP') &&
    (typeof row.datasetOrderId === 'string' ||
      (row.source === 'APP' && row.datasetOrderId === null)) &&
    (row.deliveryMethod === 'BIKE' ||
      row.deliveryMethod === 'MOTORCYCLE' ||
      row.deliveryMethod === 'CAR') &&
    typeof row.co2SavedG === 'number' &&
    Number.isInteger(row.co2SavedG) &&
    row.co2SavedG >= -2147483648 &&
    row.co2SavedG <= 2147483647 &&
    isCanonicalTimestamp(row.orderedAt)
  );
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)
  );
}

function isCanonicalTimestamp(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(value)
  )
    return false;
  const date = new Date(value);
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 19) === value.slice(0, 19)
  );
}

export async function readHistoricalBikeCo2Offline(
  datasetPath: string,
  snapshotPath: string,
): Promise<OfflineReport> {
  const backendRoot = await realpath(process.cwd());
  if (basename(backendRoot).toLowerCase() !== 'backend') {
    throw new Error('Run the offline reader from Backend');
  }
  const paths = await Promise.all(
    [datasetPath, snapshotPath].map(async (input, index) => {
      const candidate = resolve(backendRoot, input);
      const extension = index === 0 ? '.csv' : '.json';
      assertInputPath(backendRoot, candidate, extension);
      const canonical = await realpath(candidate);
      assertInputPath(backendRoot, canonical, extension);
      return canonical;
    }),
  );
  const [csv, snapshot] = await Promise.all(
    paths.map((path) => readFile(path, 'utf8')),
  );
  return parseHistoricalBikeCo2Offline(csv, snapshot);
}

function assertInputPath(root: string, path: string, extension: string): void {
  const location = relative(root, path);
  if (
    !location ||
    isAbsolute(location) ||
    location === '..' ||
    location.startsWith(`..${sep}`) ||
    extname(path).toLowerCase() !== extension
  ) {
    throw new Error(
      'Offline input must stay inside Backend with the expected extension',
    );
  }
}
