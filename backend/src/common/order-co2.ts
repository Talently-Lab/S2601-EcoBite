import { DeliveryMethod, Prisma } from '@prisma/client';

export function roundCo2Grams(value: Prisma.Decimal): number {
  const rounded = value.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
  if (
    !rounded.isFinite() ||
    rounded.lt('-2147483648') ||
    rounded.gt('2147483647')
  ) {
    throw new Error('CO2 exceeds PostgreSQL Int range');
  }
  return rounded.isZero() ? 0 : rounded.toNumber();
}

export function calculateAppCo2(
  method: DeliveryMethod,
  distanceKm: string,
): number {
  if (typeof distanceKm !== 'string' || !/^\d+(\.\d+)?$/.test(distanceKm)) {
    throw new Error('Invalid order distance');
  }
  const emissions: Record<DeliveryMethod, number> = {
    BIKE: 0,
    MOTORCYCLE: 72,
    CAR: 216,
  };
  const distance = new Prisma.Decimal(distanceKm);
  const ExactDecimal = Prisma.Decimal.clone({
    precision: Math.max(32, distance.precision() + 5),
  });
  return roundCo2Grams(
    new ExactDecimal('46.58').minus(emissions[method]).mul(distanceKm),
  );
}
