import { calculateHistoricalBikeCo2 } from './historical-bike-co2';

export interface HistoricalCo2DatasetRow {
  readonly datasetOrderId: string;
  readonly deliveryMethod: 'BIKE' | 'MOTORCYCLE' | 'CAR';
  readonly distanceKm: string;
}

export interface OfflineCo2Order {
  readonly orderId: string;
  readonly datasetOrderId: string | null;
  readonly source: 'DATASET' | 'APP';
  readonly deliveryMethod: 'BIKE' | 'MOTORCYCLE' | 'CAR';
  readonly co2SavedG: number;
  readonly orderedAt: string;
  readonly restaurantId: string;
}

export interface HistoricalBikeCo2Change {
  orderId: string;
  datasetOrderId: string;
  distanceKm: string;
  previousCo2SavedG: number;
  proposedCo2SavedG: number;
  differenceG: number;
}

export function dryRunHistoricalBikeCo2(
  dataset: readonly HistoricalCo2DatasetRow[],
  orders: readonly OfflineCo2Order[],
) {
  if (dataset.length !== 1000) {
    throw new Error('Expected exactly 1000 historical dataset rows');
  }
  const datasetById = new Map(dataset.map((row) => [row.datasetOrderId, row]));
  if (
    datasetById.size !== 1000 ||
    dataset.some(
      (row) =>
        !isIdentifier(row.datasetOrderId) ||
        !['BIKE', 'MOTORCYCLE', 'CAR'].includes(row.deliveryMethod),
    )
  ) {
    throw new Error('Invalid or duplicate historical dataset identity');
  }

  const orderIds = new Set<string>();
  for (const order of orders) {
    if (
      !isIdentifier(order.orderId) ||
      orderIds.has(order.orderId) ||
      !['DATASET', 'APP'].includes(order.source)
    ) {
      throw new Error('Invalid or duplicate snapshot identity');
    }
    orderIds.add(order.orderId);
  }

  const historicalOrders = orders.filter((row) => row.source === 'DATASET');
  const historicalIds = new Set(
    historicalOrders.map((row) => row.datasetOrderId),
  );
  if (historicalOrders.length !== 1000 || historicalIds.size !== 1000) {
    throw new Error('Expected exactly 1000 unique historical orders');
  }

  const changes: HistoricalBikeCo2Change[] = [];
  let bikeOrders = 0;
  let previousBikeTotalG = 0;
  let proposedBikeTotalG = 0;

  for (const order of historicalOrders) {
    const row = datasetById.get(order.datasetOrderId ?? '');
    if (!row || row.deliveryMethod !== order.deliveryMethod) {
      throw new Error('Historical dataset and snapshot do not match');
    }
    if (order.deliveryMethod !== 'BIKE') continue;
    if (
      !Number.isInteger(order.co2SavedG) ||
      order.co2SavedG < -2147483648 ||
      order.co2SavedG > 2147483647
    ) {
      throw new Error('Current historical BIKE CO2 must be a PostgreSQL Int');
    }
    const proposedCo2SavedG = calculateHistoricalBikeCo2(row.distanceKm);
    bikeOrders++;
    previousBikeTotalG += order.co2SavedG;
    proposedBikeTotalG += proposedCo2SavedG;
    if (order.co2SavedG !== proposedCo2SavedG) {
      changes.push({
        orderId: order.orderId,
        datasetOrderId: row.datasetOrderId,
        distanceKm: row.distanceKm,
        previousCo2SavedG: order.co2SavedG,
        proposedCo2SavedG,
        differenceG: proposedCo2SavedG - order.co2SavedG,
      });
    }
  }

  return {
    matchedHistoricalOrders: historicalOrders.length,
    bikeOrders,
    unchangedHistoricalOrders: historicalOrders.length - changes.length,
    previousBikeTotalG,
    proposedBikeTotalG,
    previousBikeAverageG:
      bikeOrders === 0 ? 0 : previousBikeTotalG / bikeOrders,
    proposedBikeAverageG:
      bikeOrders === 0 ? 0 : proposedBikeTotalG / bikeOrders,
    changes,
  };
}

function isIdentifier(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value === value.trim()
  );
}
