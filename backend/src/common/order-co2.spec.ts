import { DeliveryMethod, Prisma } from '@prisma/client';
import { calculateAppCo2, roundCo2Grams } from './order-co2';

describe('final CO2 rounding to PostgreSQL Int', () => {
  it.each([
    ['102.476', 102],
    ['102.5', 103],
    ['-635.5', -636],
    ['-4235.5', -4236],
    ['-0.49', 0],
    ['0', 0],
  ])('rounds %s g once with HALF_UP to %i', (grams, expected) => {
    expect(roundCo2Grams(new Prisma.Decimal(grams))).toBe(expected);
  });

  it.each([
    ['2147483647.49', 2147483647],
    ['-2147483648.49', -2147483648],
  ])('accepts the rounded Int boundary %s', (value, expected) => {
    expect(roundCo2Grams(new Prisma.Decimal(value))).toBe(expected);
  });

  it.each(['2147483647.5', '-2147483648.5', 'NaN', 'Infinity', '-Infinity'])(
    'rejects nonfinite or overflowing grams %s',
    (value) => expect(() => roundCo2Grams(new Prisma.Decimal(value))).toThrow(),
  );
});

describe('APP CO2 formula', () => {
  it.each([
    [DeliveryMethod.BIKE, '2.2', 102],
    [DeliveryMethod.BIKE, '3.47', 162],
    [DeliveryMethod.MOTORCYCLE, '3.47', -88],
    [DeliveryMethod.CAR, '3.47', -588],
    [DeliveryMethod.BIKE, '25', 1165],
    [DeliveryMethod.MOTORCYCLE, '25', -636],
    [DeliveryMethod.CAR, '25', -4236],
    [DeliveryMethod.BIKE, '0', 0],
  ])(
    'calculates %s at %s km as %i integer grams',
    (method, distance, expected) => {
      expect(calculateAppCo2(method, distance)).toBe(expected);
    },
  );

  it.each(['', '-1', 'NaN', 'Infinity', '1e2', '2,2', '50000000'])(
    'rejects invalid distance or overflowing BIKE result %s',
    (distance) =>
      expect(() => calculateAppCo2(DeliveryMethod.BIKE, distance)).toThrow(),
  );

  it('keeps precision until the only rounding operation', () => {
    expect(
      calculateAppCo2(DeliveryMethod.BIKE, '24.999999999999999999999'),
    ).toBe(1164);
  });
});
