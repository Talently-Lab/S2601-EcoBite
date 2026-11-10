import {
  dryRunHistoricalBikeCo2,
  type HistoricalCo2DatasetRow,
  type OfflineCo2Order,
} from './historical-bike-co2-dry-run';

function fixture() {
  const dataset: HistoricalCo2DatasetRow[] = Array.from(
    { length: 1000 },
    (_, index) => ({
      datasetOrderId: String(index + 1),
      deliveryMethod: index < 447 ? 'BIKE' : index < 955 ? 'MOTORCYCLE' : 'CAR',
      distanceKm: '2.2',
    }),
  );
  const orders: (OfflineCo2Order & {
    orderItems: { orderItemId: string; quantity: number }[];
  })[] = dataset.map((row, index) => ({
    orderId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    datasetOrderId: row.datasetOrderId,
    source: 'DATASET',
    deliveryMethod: row.deliveryMethod,
    co2SavedG: index === 0 ? 102 : row.deliveryMethod === 'BIKE' ? 103 : -88,
    orderedAt: '2026-06-01T03:00:00.123456Z',
    restaurantId: 'restaurant-preserved',
    orderItems: [{ orderItemId: `item-${index}`, quantity: 2 }],
  }));
  orders.push({
    orderId: '00000000-0000-4000-8000-999999999999',
    datasetOrderId: null,
    source: 'APP',
    deliveryMethod: 'BIKE',
    co2SavedG: 999,
    orderedAt: '2026-11-01T03:00:00.654321Z',
    restaurantId: 'app-restaurant-preserved',
    orderItems: [{ orderItemId: 'app-item', quantity: 3 }],
  });
  return { dataset, orders };
}

describe('offline historical BIKE CO2 dry-run', () => {
  it('proposes only changed DATASET BIKE integers and reports their totals', () => {
    const { dataset, orders } = fixture();
    const report = dryRunHistoricalBikeCo2(dataset, orders);

    expect(report).toMatchObject({
      matchedHistoricalOrders: 1000,
      bikeOrders: 447,
      unchangedHistoricalOrders: 554,
      previousBikeTotalG: 46040,
      proposedBikeTotalG: 45594,
      previousBikeAverageG: 46040 / 447,
      proposedBikeAverageG: 102,
    });
    expect(report.changes).toHaveLength(446);
    expect(report.changes[0]).toEqual({
      orderId: orders[1].orderId,
      datasetOrderId: '2',
      distanceKm: '2.2',
      previousCo2SavedG: 103,
      proposedCo2SavedG: 102,
      differenceG: -1,
    });
    const bikeIds = new Set(dataset.slice(0, 447).map((r) => r.datasetOrderId));
    expect(report.changes.every((r) => bikeIds.has(r.datasetOrderId))).toBe(
      true,
    );
  });

  it.each<{
    name: string;
    invalidate: (data: ReturnType<typeof fixture>) => void;
  }>([
    { name: 'missing CSV row', invalidate: ({ dataset }) => dataset.pop() },
    {
      name: 'extra CSV row',
      invalidate: ({ dataset }) => dataset.push(dataset[0]),
    },
    {
      name: 'duplicate dataset identity',
      invalidate: ({ dataset }) => {
        dataset[1] = { ...dataset[1], datasetOrderId: '1' };
      },
    },
    {
      name: 'blank dataset identity',
      invalidate: ({ dataset }) => {
        dataset[0] = { ...dataset[0], datasetOrderId: '' };
      },
    },
    {
      name: 'missing historical order',
      invalidate: ({ orders }) => orders.shift(),
    },
    {
      name: 'extra historical order',
      invalidate: ({ orders }) =>
        orders.push({ ...orders[0], orderId: 'extra' }),
    },
    {
      name: 'duplicate UUID',
      invalidate: ({ orders }) => {
        orders[1] = { ...orders[1], orderId: orders[0].orderId };
      },
    },
    {
      name: 'duplicate historical identity',
      invalidate: ({ orders }) => {
        orders[1] = { ...orders[1], datasetOrderId: '1' };
      },
    },
    {
      name: 'unknown historical identity',
      invalidate: ({ orders }) => {
        orders[0] = { ...orders[0], datasetOrderId: 'unknown' };
      },
    },
    {
      name: 'transport mismatch',
      invalidate: ({ orders }) => {
        orders[0] = { ...orders[0], deliveryMethod: 'CAR' };
      },
    },
    {
      name: 'APP used as a historical order',
      invalidate: ({ orders }) => {
        orders[0] = { ...orders[0], source: 'APP' };
      },
    },
    {
      name: 'fractional current BIKE grams',
      invalidate: ({ orders }) => {
        orders[0] = { ...orders[0], co2SavedG: 102.5 };
      },
    },
    {
      name: 'out-of-range current BIKE grams',
      invalidate: ({ orders }) => {
        orders[0] = { ...orders[0], co2SavedG: 2147483648 };
      },
    },
  ])('rejects $name before returning a plan', ({ invalidate }) => {
    const data = fixture();
    invalidate(data);
    expect(() => dryRunHistoricalBikeCo2(data.dataset, data.orders)).toThrow();
  });

  it('never mutates frozen inputs, dates, UUIDs or relation attributes', () => {
    const { dataset, orders } = fixture();
    const original = JSON.stringify({ dataset, orders });
    dataset.forEach(Object.freeze);
    orders.forEach((row) => {
      row.orderItems.forEach(Object.freeze);
      Object.freeze(row.orderItems);
    });
    orders.forEach(Object.freeze);
    dryRunHistoricalBikeCo2(Object.freeze(dataset), Object.freeze(orders));
    expect(JSON.stringify({ dataset, orders })).toBe(original);
  });

  it('is independent of input ordering and reports no change for an already corrected snapshot', () => {
    const { dataset, orders } = fixture();
    const corrected = orders.map((row) => ({
      ...row,
      co2SavedG:
        row.source === 'DATASET' && row.deliveryMethod === 'BIKE'
          ? 102
          : row.co2SavedG,
    }));
    const report = dryRunHistoricalBikeCo2([...dataset].reverse(), corrected);
    expect(report.changes).toEqual([]);
    expect(report.unchangedHistoricalOrders).toBe(1000);
  });

  it('does not recalculate other historical transports even when their distances are unusable', () => {
    const { dataset, orders } = fixture();
    dataset[447] = { ...dataset[447], distanceKm: 'not-used' };
    dataset[955] = { ...dataset[955], distanceKm: 'not-used' };
    const report = dryRunHistoricalBikeCo2(dataset, orders);
    expect(report.changes).toHaveLength(446);
    expect(orders[447].co2SavedG).toBe(-88);
    expect(orders[955].co2SavedG).toBe(-88);
    expect(orders[1000].co2SavedG).toBe(999);
  });

  it('returns zero averages when there are no historical BIKE orders', () => {
    const { dataset, orders } = fixture();
    const nonBikeDataset = dataset.map((row) => ({
      ...row,
      deliveryMethod: 'CAR' as const,
    }));
    const nonBikeOrders = orders.map((row) => ({
      ...row,
      deliveryMethod: 'CAR' as const,
    }));
    expect(
      dryRunHistoricalBikeCo2(nonBikeDataset, nonBikeOrders),
    ).toMatchObject({
      bikeOrders: 0,
      previousBikeAverageG: 0,
      proposedBikeAverageG: 0,
      changes: [],
    });
  });
});
