import { Prisma } from '@prisma/client';

export function calculateHistoricalBikeCo2(distanceKm: string): number {
  if (typeof distanceKm !== 'string' || !/^\d+(\.\d+)?$/.test(distanceKm)) {
    throw new Error('Invalid historical BIKE distance');
  }

  const distance = new Prisma.Decimal(distanceKm);
  const ExactDecimal = Prisma.Decimal.clone({
    precision: Math.max(32, distance.precision() + 4),
  });
  const grams = new ExactDecimal(distanceKm)
    .mul('46.58')
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);

  if (grams.gt('2147483647')) {
    throw new Error('Historical BIKE CO2 exceeds PostgreSQL Int range');
  }

  return grams.toNumber();
}
