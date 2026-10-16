import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';

import csv from 'csv-parser';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface DatasetRow {
  id_restaurante: string;
  categoria: string;
  monto_total: string;
}

const categoryNames: Record<string, string> = {
  'Comida casera': 'Comida casera',
  'Fast food': 'Fast food',
  'Cafe y postres': 'Café y postres',
  Saludable: 'Saludable',
  Vegano: 'Vegano',
  Internacional: 'Internacional',
};

const csvPath = path.resolve(
  process.cwd(),
  '..',
  'docs',
  'api',
  'data-model',
  'dataset.csv',
);

function readDataset(): Promise<DatasetRow[]> {
  return new Promise((resolve, reject) => {
    const rows: DatasetRow[] = [];

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row: DatasetRow) => {
        rows.push(row);
      })
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

function calculateMedian(values: Prisma.Decimal[]): Prisma.Decimal {
  const sorted = [...values].sort((a, b) => a.comparedTo(b));
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return sorted[middle - 1].plus(sorted[middle]).div(2);
}

async function main() {
  const rows = await readDataset();

  if (rows.length !== 1000) {
    throw new Error(`Expected 1000 dataset rows, received ${rows.length}.`);
  }

  const grouped = new Map<
    string,
    { category: string; amounts: Prisma.Decimal[] }
  >();

  for (const row of rows) {
    const id = row.id_restaurante.trim();
    const category = row.categoria.trim();
    const rawAmount = row.monto_total.trim();

    if (
      !id ||
      !categoryNames[category] ||
      !/^\d+(\.\d{1,2})?$/.test(rawAmount)
    ) {
      throw new Error(`Invalid dataset row for restaurant "${id}".`);
    }

    const amount = new Prisma.Decimal(rawAmount);

    if (amount.lte(0)) {
      throw new Error(`Invalid amount for restaurant "${id}".`);
    }

    const existing = grouped.get(id);

    if (existing) {
      if (existing.category !== category) {
        throw new Error(`Inconsistent category for restaurant "${id}".`);
      }

      existing.amounts.push(amount);
    } else {
      grouped.set(id, {
        category,
        amounts: [amount],
      });
    }
  }

  if (grouped.size !== 294) {
    throw new Error(`Expected 294 restaurants, received ${grouped.size}.`);
  }

  const restaurants = await prisma.restaurant.findMany({
    select: {
      id: true,
      idRestaurant: true,
      foodCategory: true,
    },
  });

  if (restaurants.length !== 294) {
    throw new Error('Unexpected restaurant count. Seed aborted.');
  }

  const restaurantByExternalId = new Map(
    restaurants.map((restaurant) => [restaurant.idRestaurant, restaurant]),
  );

  const categoryEnums: Record<string, string> = {
    'Comida casera': 'HOMEMADE',
    'Fast food': 'FAST_FOOD',
    'Cafe y postres': 'COFFEE_AND_DESSERTS',
    Saludable: 'HEALTHY',
    Vegano: 'VEGAN',
    Internacional: 'INTERNATIONAL',
  };

  const products: Prisma.ProductCreateManyInput[] = [];

  for (const [externalId, data] of grouped) {
    const restaurant = restaurantByExternalId.get(externalId);

    if (!restaurant) {
      throw new Error(`Restaurant "${externalId}" not found in Neon.`);
    }

    if (restaurant.foodCategory !== categoryEnums[data.category]) {
      throw new Error(`Category mismatch for restaurant "${externalId}".`);
    }

    products.push({
      restaurantId: restaurant.id,
      name: categoryNames[data.category],
      price: calculateMedian(data.amounts),
    });
  }

  await prisma.$transaction(
    async (tx) => {
      const existingProducts = await tx.product.count();
      const existingOrderItems = await tx.orderItem.count();

      if (existingProducts !== 0 || existingOrderItems !== 0) {
        throw new Error('Products or order items already exist. Seed aborted.');
      }

      const created = await tx.product.createMany({
        data: products,
      });

      if (created.count !== 294) {
        throw new Error('Unexpected product insertion count.');
      }

      const finalCount = await tx.product.count();

      if (finalCount !== 294) {
        throw new Error('Product count verification failed.');
      }

      console.log(`Products seeded: ${created.count}`);
      console.log(`Final product count: ${finalCount}`);
    },
    {
      maxWait: 10000,
      timeout: 120000,
      isolationLevel: 'Serializable',
    },
  );

  console.log('Product catalog synchronized successfully.');
}

main()
  .catch((error) => {
    console.error('Product seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
