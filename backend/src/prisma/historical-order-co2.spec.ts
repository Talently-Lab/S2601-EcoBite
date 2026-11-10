import { DeliveryMethod } from '@prisma/client';
import { calculateHistoricalOrderCo2 } from './historical-order-co2';

describe('historical order CO2 selection', () => {
  it.each([
    ['2.2', '0.1025', 102],
    ['3.47', '0.1616', 162],
    ['25', '1.1645', 1165],
    [' 2.2 ', '0.1025', 102],
  ])(
    'calculates BIKE from original distance %s instead of CSV CO2 %s',
    (distance, csvCo2, expected) => {
      expect(
        calculateHistoricalOrderCo2(DeliveryMethod.BIKE, distance, csvCo2),
      ).toBe(expected);
    },
  );

  it.each(['0', '999', '', 'not-used', '-1'])(
    'does not use BIKE CSV CO2 %s to calculate grams',
    (csvCo2) => {
      expect(
        calculateHistoricalOrderCo2(DeliveryMethod.BIKE, '2.2', csvCo2),
      ).toBe(102);
    },
  );

  it.each(['', '-1', 'NaN', '2,2', '50000000'])(
    'rejects invalid or out-of-range BIKE distance %s',
    (distance) => {
      expect(() =>
        calculateHistoricalOrderCo2(DeliveryMethod.BIKE, distance, '0'),
      ).toThrow();
    },
  );

  describe.each([DeliveryMethod.MOTORCYCLE, DeliveryMethod.CAR])(
    '%s retains CSV CO2 as the source and stores integer grams',
    (method) => {
      it.each([
        ['0', 0],
        ['0.10249', 102],
        ['0.1025', 103],
        [' 0.1234567 ', 123],
        ['0.0000001', 0],
        ['2147483.6474', 2147483647],
      ])('converts CSV %s kg to %s g without using distance', (csv, grams) => {
        const result = calculateHistoricalOrderCo2(method, 'not-used', csv);
        expect(typeof result).toBe('number');
        expect(result).toBe(grams);
      });

      it.each([
        '',
        '-1',
        'NaN',
        'Infinity',
        '0.00000001',
        '100000000000',
        '2147483.6475',
      ])('preserves rejection of invalid or excessive CSV CO2 %s', (csv) => {
        expect(() => calculateHistoricalOrderCo2(method, '2.2', csv)).toThrow();
      });
    },
  );
});
