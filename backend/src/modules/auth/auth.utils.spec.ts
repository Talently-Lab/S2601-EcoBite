// NOTE: Verifies authentication utility behavior.
import { expiresInToMs, readCookie } from './auth.utils';

describe('auth.utils', () => {
  describe('expiresInToMs', () => {
    it('parses suffixes s, m, h, d (case-insensitive)', () => {
      expect(expiresInToMs('90s')).toBe(90_000);
      expect(expiresInToMs('15m')).toBe(900_000);
      expect(expiresInToMs('2h')).toBe(7_200_000);
      expect(expiresInToMs('1D')).toBe(86_400_000);
    });

    it('trims whitespace', () => {
      expect(expiresInToMs('  5m  ')).toBe(300_000);
    });

    it('returns default 15m when format is invalid', () => {
      expect(expiresInToMs('not-a-duration')).toBe(15 * 60 * 1000);
      expect(expiresInToMs('')).toBe(15 * 60 * 1000);
    });

    it('returns default 15m when suffix is not s|m|h|d', () => {
      expect(expiresInToMs('3x')).toBe(15 * 60 * 1000);
    });
  });

  describe('readCookie', () => {
    it('returns undefined when cookies bag missing', () => {
      expect(readCookie({} as never, 'a')).toBeUndefined();
    });

    it('returns string only when value is typed string', () => {
      const req = {
        cookies: { session: 'abc', weird: 1, obj: {} },
      } as unknown as Parameters<typeof readCookie>[0];
      expect(readCookie(req, 'session')).toBe('abc');
      expect(readCookie(req, 'weird')).toBeUndefined();
      expect(readCookie(req, 'missing')).toBeUndefined();
    });
  });
});
