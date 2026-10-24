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

const COMUNA_COUNT = 15;
const EXPECTED_DISTANCES = COMUNA_COUNT * COMUNA_COUNT;
const FIRST_COLUMN = 'comuna_usuario/comuna_restaurante';

const csvPath = path.resolve(
  process.cwd(),
  '..',
  'docs',
  'api',
  'data-model',
  'matriz_distancias_comunas.csv',
);

type CsvRow = Record<string, string>;

function readMatrix(): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row: CsvRow) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

function parseComuna(value: string): number {
  const match = /^Comuna (1[0-5]|[1-9])$/.exec(value.trim());

  if (!match) {
    throw new Error(`Invalid comuna: "${value}".`);
  }

  return Number(match[1]);
}

async function main() {
  const rows = await readMatrix();

  if (rows.length !== COMUNA_COUNT) {
    throw new Error(`Expected ${COMUNA_COUNT} rows, received ${rows.length}.`);
  }

  const expectedHeaders = [
    FIRST_COLUMN,
    ...Array.from(
      { length: COMUNA_COUNT },
      (_, index) => `Comuna ${index + 1}`,
    ),
  ];

  const actualHeaders = Object.keys(rows[0]);

  if (
    actualHeaders.length !== expectedHeaders.length ||
    actualHeaders.some((header, index) => header !== expectedHeaders[index])
  ) {
    throw new Error('Unexpected CSV headers.');
  }

  const distances: Prisma.ComunaDistanceCreateManyInput[] = [];
  const seenDestinations = new Set<number>();

  for (const row of rows) {
    const destinationComuna = parseComuna(row[FIRST_COLUMN]);

    if (seenDestinations.has(destinationComuna)) {
      throw new Error(`Duplicate destination: ${destinationComuna}.`);
    }

    seenDestinations.add(destinationComuna);

    for (let originComuna = 1; originComuna <= COMUNA_COUNT; originComuna++) {
      const rawDistance = row[`Comuna ${originComuna}`]?.trim();

      if (!rawDistance || !/^\d+(\.\d{1,2})?$/.test(rawDistance)) {
        throw new Error(
          `Invalid distance from comuna ${originComuna} to ${destinationComuna}.`,
        );
      }

      const distanceKm = new Prisma.Decimal(rawDistance);

      if (distanceKm.lte(0) || distanceKm.gte(10000)) {
        throw new Error(
          `Distance out of range: ${originComuna} -> ${destinationComuna}.`,
        );
      }

      distances.push({
        originComuna,
        destinationComuna,
        distanceKm,
      });
    }
  }

  if (
    seenDestinations.size !== COMUNA_COUNT ||
    distances.length !== EXPECTED_DISTANCES
  ) {
    throw new Error('Incomplete distance matrix.');
  }

  await prisma.$transaction(
    async (tx) => {
      const existing = await tx.comunaDistance.findMany({
        select: {
          originComuna: true,
          destinationComuna: true,
          distanceKm: true,
        },
      });

      if (existing.length > 0) {
        if (existing.length !== EXPECTED_DISTANCES) {
          throw new Error('Partial distance matrix detected. Import aborted.');
        }

        const key = (origin: number, destination: number) =>
          `${origin}:${destination}`;

        const existingByKey = new Map(
          existing.map((item) => [
            key(item.originComuna, item.destinationComuna),
            item.distanceKm,
          ]),
        );

        for (const distance of distances) {
          const saved = existingByKey.get(
            key(distance.originComuna, distance.destinationComuna),
          );

          if (
            !saved ||
            !saved.equals(new Prisma.Decimal(distance.distanceKm.toString()))
          ) {
            throw new Error(
              `Distance mismatch: ${distance.originComuna} -> ${distance.destinationComuna}.`,
            );
          }
        }

        console.log('Distance matrix already imported. No changes made.');
        return;
      }

      const result = await tx.comunaDistance.createMany({
        data: distances,
      });

      if (result.count !== EXPECTED_DISTANCES) {
        throw new Error('Unexpected distance insertion count.');
      }

      const finalCount = await tx.comunaDistance.count();

      if (finalCount !== EXPECTED_DISTANCES) {
        throw new Error('Final distance count verification failed.');
      }

      console.log(`Distances imported: ${result.count}`);
      console.log(`Total distances: ${finalCount}`);
    },
    {
      maxWait: 10000,
      timeout: 120000,
      isolationLevel: 'Serializable',
    },
  );

  console.log('Distance matrix verification completed.');
}

main()
  .catch((error) => {
    console.error('Distance import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
