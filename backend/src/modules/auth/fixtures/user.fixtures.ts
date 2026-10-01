// NOTE: Provides reusable user fixtures for unit tests.

import type { UserSafe } from '../auth-user.service';

export function makeUserSafe(overrides: Partial<UserSafe> = {}): UserSafe {
  const registeredAt = new Date('2026-05-01T12:00:00.000Z');

  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Fixture User',
    email: 'fixture@example.com',
    registeredAt,
    ...overrides,
  };
}
