import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';

import csv from 'csv-parser';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient, ProductType } from '@prisma/client';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const EXPECTED_RESTAURANTS = 294;
const DISHES_PER_RESTAURANT = 6;
const EXPECTED_DISHES = EXPECTED_RESTAURANTS * DISHES_PER_RESTAURANT;

interface DishRow {
  id_restaurante: string;
  platos: string;
  monto: string;
}

const csvPath = path.resolve(
  process.cwd(),
  '..',
  'docs',
  'api',
  'data-model',
  'platos_restaurantes.csv',
);

function readDishes(): Promise<DishRow[]> {
  return new Promise((resolve, reject) => {
    const rows: DishRow[] = [];

    fs.createReadStream(csvPath)
      .pipe(csv({ separator: ';' }))
      .on('data', (row: DishRow) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

async function main() {
  const rows = await readDishes();

  if (rows.length !== EXPECTED_DISHES) {
    throw new Error(
      `Expected ${EXPECTED_DISHES} dishes, received ${rows.length}.`,
    );
  }

  const grouped = new Map<string, { name: string; price: Prisma.Decimal }[]>();

  for (const row of rows) {
    const restaurantId = row.id_restaurante?.trim();
    const name = row.platos?.trim();
    const rawPrice = row.monto?.trim();

    if (
      !restaurantId ||
      !name ||
      !rawPrice ||
      !/^\d+(\.\d{1,2})?$/.test(rawPrice)
    ) {
      throw new Error(`Invalid dish row: ${JSON.stringify(row)}`);
    }

    const price = new Prisma.Decimal(rawPrice);

    if (price.lte(0) || price.gte(100000000)) {
      throw new Error(`Invalid price for dish "${name}".`);
    }

    const dishes = grouped.get(restaurantId) ?? [];

    if (dishes.some((dish) => dish.name === name)) {
      throw new Error(
        `Duplicate dish "${name}" for restaurant "${restaurantId}".`,
      );
    }

    dishes.push({ name, price });
    grouped.set(restaurantId, dishes);
  }

  if (grouped.size !== EXPECTED_RESTAURANTS) {
    throw new Error('Unexpected number of restaurants in CSV.');
  }

  for (const [restaurantId, dishes] of grouped) {
    if (dishes.length !== DISHES_PER_RESTAURANT) {
      throw new Error(
        `Restaurant "${restaurantId}" does not have exactly 6 dishes.`,
      );
    }
  }

  await prisma.$transaction(
    async (tx) => {
      const restaurants = await tx.restaurant.findMany({
        select: {
          id: true,
          idRestaurant: true,
        },
      });

      if (restaurants.length !== EXPECTED_RESTAURANTS) {
        throw new Error('Unexpected restaurant count in database.');
      }

      const restaurantByExternalId = new Map(
        restaurants.map((restaurant) => [
          restaurant.idRestaurant,
          restaurant.id,
        ]),
      );

      const products: Prisma.ProductCreateManyInput[] = [];

      for (const [externalId, dishes] of grouped) {
        const restaurantId = restaurantByExternalId.get(externalId);

        if (!restaurantId) {
          throw new Error(`Restaurant "${externalId}" not found.`);
        }

        for (const dish of dishes) {
          products.push({
            restaurantId,
            name: dish.name,
            price: dish.price,
            type: ProductType.DISH,
          });
        }
      }

      const existingDishes = await tx.product.findMany({
        where: { type: ProductType.DISH },
        select: {
          restaurantId: true,
          name: true,
          price: true,
        },
      });

      if (existingDishes.length > 0) {
        if (existingDishes.length !== EXPECTED_DISHES) {
          throw new Error('Partial dish catalog detected. Import aborted.');
        }

        const key = (restaurantId: string, name: string) =>
          JSON.stringify([restaurantId, name]);

        const existingByKey = new Map(
          existingDishes.map((dish) => [
            key(dish.restaurantId, dish.name),
            dish.price,
          ]),
        );

        if (existingByKey.size !== EXPECTED_DISHES) {
          throw new Error('Duplicate dishes detected in database.');
        }

        for (const product of products) {
          const existingPrice = existingByKey.get(
            key(product.restaurantId, product.name),
          );

          if (
            !existingPrice ||
            !existingPrice.equals(new Prisma.Decimal(product.price.toString()))
          ) {
            throw new Error(`Dish catalog mismatch for "${product.name}".`);
          }
        }

        console.log('Dish catalog already imported. No changes made.');
        return;
      }

      const existingCategories = await tx.product.count({
        where: { type: ProductType.FOOD_CATEGORY },
      });

      if (existingCategories !== EXPECTED_RESTAURANTS) {
        throw new Error('Unexpected category product count. Import aborted.');
      }

      const result = await tx.product.createMany({
        data: products,
      });

      if (result.count !== EXPECTED_DISHES) {
        throw new Error('Unexpected dish insertion count.');
      }

      const finalCount = await tx.product.count({
        where: { type: ProductType.DISH },
      });

      if (finalCount !== EXPECTED_DISHES) {
        throw new Error('Final dish count verification failed.');
      }

      console.log(`Dishes imported: ${result.count}`);
      console.log(`Total dishes: ${finalCount}`);
    },
    {
      maxWait: 10000,
      timeout: 120000,
      isolationLevel: 'Serializable',
    },
  );

  console.log('Dish catalog verification completed.');
}

main()
  .catch((error) => {
    console.error('Dish import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
