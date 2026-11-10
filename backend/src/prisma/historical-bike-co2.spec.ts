import { calculateHistoricalBikeCo2 } from './historical-bike-co2';

describe('historical BIKE CO2 integer grams', () => {
  it.each([
    ['2.2', 102],
    ['3.47', 162],
    ['0', 0],
    ['24.9999', 1164],
    ['25', 1165],
    ['25.0001', 1165],
  ])('rounds 46.58 * %s only once to %i grams', (distance, expected) => {
    expect(calculateHistoricalBikeCo2(distance)).toBe(expected);
  });

  it.each(['', ' ', '-1', '-0.01', 'NaN', 'Infinity', '1e2', '2,2', ' 2.2'])(
    'rejects invalid or negative distance %s',
    (distance) => expect(() => calculateHistoricalBikeCo2(distance)).toThrow(),
  );

  it('does not round a high precision distance across the half-gram boundary', () => {
    expect(calculateHistoricalBikeCo2('24.999999999999999999999')).toBe(1164);
  });

  it('accepts large integer grams within PostgreSQL Int range', () => {
    expect(calculateHistoricalBikeCo2('46100000')).toBe(2147338000);
  });

  it('rejects grams outside PostgreSQL Int range', () => {
    expect(() => calculateHistoricalBikeCo2('50000000')).toThrow();
  });
});
