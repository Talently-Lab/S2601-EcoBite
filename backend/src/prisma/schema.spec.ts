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

    expect(schema).toMatch(/model User\s*\{[\s\S]*?id\s+String\s+@id/);
    expect(schema).toMatch(/model Restaurant\s*\{[\s\S]*?id\s+String\s+@id/);
    expect(schema).toMatch(/model Product\s*\{[\s\S]*?id\s+String\s+@id/);
    expect(schema).toMatch(/model Order\s*\{[\s\S]*?id\s+String\s+@id/);
    expect(schema).toMatch(/model OrderItem\s*\{[\s\S]*?id\s+String\s+@id/);

    expect(schema).toMatch(/userId\s+String\s+@map\("user_id"\)\s+@db\.Uuid/);
    expect(schema).toMatch(
      /restaurantId\s+String\s+@map\("restaurant_id"\)\s+@db\.Uuid/,
    );
    expect(schema).toMatch(/orderId\s+String\s+@map\("order_id"\)\s+@db\.Uuid/);
    expect(schema).toMatch(
      /productId\s+String\s+@map\("product_id"\)\s+@db\.Uuid/,
    );

    expect(schema).toMatch(
      /user\s+User\s+@relation\(fields: \[userId\], references: \[id\]\)/,
    );
    expect(schema).toMatch(
      /restaurant\s+Restaurant\s+@relation\(fields: \[restaurantId\], references: \[id\]\)/,
    );
    expect(schema).toMatch(
      /order\s+Order\s+@relation\(fields: \[orderId\], references: \[id\]\)/,
    );
    expect(schema).toMatch(
      /product\s+Product\s+@relation\(fields: \[productId\], references: \[id\]\)/,
    );
  });

  it('preserves the ERD column precision and uniqueness constraints', () => {
    expect(schema).toMatch(/email\s+String\s+@unique/);
    expect(schema).toMatch(/idRestaurant\s+String\s+@unique/);
    expect(schema).toMatch(/price\s+Decimal\s+@db\.Decimal\(10, 2\)/);
    expect(schema).toMatch(
      /totalAmount\s+Decimal\s+@map\("total_amount"\)\s+@db\.Decimal\(10, 2\)/,
    );
    expect(schema).toMatch(
      /distanceKm\s+Decimal\s+@map\("distance_km"\)\s+@db\.Decimal\(6, 2\)/,
    );
    expect(schema).toMatch(/co2SavedG\s+Int\s+@map\("co2_saved_g"\)/);
    expect(schema).toMatch(
      /unitPrice\s+Decimal\s+@map\("unit_price"\)\s+@db\.Decimal\(10, 2\)/,
    );
    expect(schema).toMatch(/subtotal\s+Decimal\s+@db\.Decimal\(10, 2\)/);
  });
});
