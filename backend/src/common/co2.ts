import { Prisma } from '@prisma/client';

export function co2FromKilograms(value: string): Prisma.Decimal {
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error('Invalid CO2 kilograms');
  }
  const kilograms = new Prisma.Decimal(value);
  if (kilograms.decimalPlaces() > 7 || kilograms.gte('100000000000')) {
    throw new Error('CO2 exceeds storage precision');
  }
  return validateCo2Grams(kilograms.mul(1000));
}

export function validateCo2Grams(value: Prisma.Decimal): Prisma.Decimal {
  if (
    !value.isFinite() ||
    value.decimalPlaces() > 4 ||
    value.abs().gte('100000000000000')
  ) {
    throw new Error('CO2 exceeds numeric(18,4) precision');
  }
  return value;
}
