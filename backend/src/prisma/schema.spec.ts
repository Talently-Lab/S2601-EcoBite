import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Prisma schema', () => {
  const schema = readFileSync(join(__dirname, 'schema.prisma'), 'utf8');

  it('implements the EcoBite ERD entities and their relations', () => {
    expect(schema).toContain('model User {');
    expect(schema).toContain('model Restaurant {');
    expect(schema).toContain('model Product {');
    expect(schema).toContain('model Order {');
    expect(schema).toContain('model OrderItem {');
    expect(schema).toMatch(/userId\s+String\s+@id/);
    expect(schema).toMatch(/restaurantId\s+String\s+@id/);
    expect(schema).toMatch(/orderId\s+String\s+@id/);
    expect(schema).toMatch(/productId\s+String\s+@id/);
  });

  it('preserves the ERD column precision and uniqueness constraints', () => {
    expect(schema).toMatch(/email\s+String\s+@unique/);
    expect(schema).toMatch(/price\s+Decimal\s+@db.Decimal\(10, 2\)/);
    expect(schema).toMatch(/totalAmount\s+Decimal\s+@db.Decimal\(10, 2\)/);
    expect(schema).toMatch(/distanceKm\s+Decimal\s+@db.Decimal\(6, 2\)/);
    expect(schema).toMatch(/co2SavedKg\s+Decimal\s+@db.Decimal\(6, 3\)/);
    expect(schema).toMatch(/unitPrice\s+Decimal\s+@db.Decimal\(10, 2\)/);
    expect(schema).toMatch(/subtotal\s+Decimal\s+@db.Decimal\(10, 2\)/);
  });
});
