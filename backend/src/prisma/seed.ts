import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';

import csv from 'csv-parser';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import {
  DeliveryMethod,
  PackagingType,
  PrismaClient,
  RestaurantStatus,
} from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface DatasetRow {
  id_restaurante: string;
  nombre_restaurante: string;
  tipo_transporte: string;
  tipo_envase: string;
}

interface RestaurantData {
  idRestaurant: string;
  name: string;
  packagingType: PackagingType;
  availableDeliveryMethod: DeliveryMethod;
  status: RestaurantStatus;
  sustainabilityIndicator: string;
}

const csvPath = path.resolve(
  process.cwd(),
  '..',
  'docs',
  'api',
  'data-model',
  'dataset.csv',
);

function mapPackagingType(rawPackagingType: string): PackagingType {
  switch (rawPackagingType.trim()) {
    case 'Fibra de Cana':
    case 'Carton / Papel':
    case 'Bioplastico PLA':
      return PackagingType.BIODEGRADABLE;

    case 'Plastico PET/PP':
    case 'Aluminio':
      return PackagingType.RECYCLABLE;

    case 'Polipapel':
    case 'Telgopor (EPS)':
      return PackagingType.NON_RECYCLABLE;

    default:
      throw new Error(`Unknown packaging type: "${rawPackagingType}"`);
  }
}

function mapDeliveryMethod(rawTransport: string): DeliveryMethod {
  switch (rawTransport.trim()) {
    case 'Bicicleta':
      return DeliveryMethod.BIKE;

    case 'Moto':
      return DeliveryMethod.MOTORCYCLE;

    case 'Auto':
      return DeliveryMethod.CAR;

    default:
      throw new Error(`Unknown transport type: "${rawTransport}"`);
  }
}

function getPackagingScore(packagingType: PackagingType): number {
  switch (packagingType) {
    case PackagingType.BIODEGRADABLE:
      return 10;

    case PackagingType.RECYCLABLE:
      return 5;

    case PackagingType.NON_RECYCLABLE:
      return 0;
  }
}

function getDeliveryScore(deliveryMethod: DeliveryMethod): number {
  switch (deliveryMethod) {
    case DeliveryMethod.BIKE:
      return 10;

    case DeliveryMethod.MOTORCYCLE:
      return 7;

    case DeliveryMethod.CAR:
      return 0;
  }
}

function getSustainabilityIndicator(
  packagingType: PackagingType,
  deliveryMethod: DeliveryMethod,
): string {
  const packagingScore = getPackagingScore(packagingType);
  const deliveryScore = getDeliveryScore(deliveryMethod);

  const score = (packagingScore + deliveryScore) / 2;

  if (score < 5) {
    return 'Low';
  }

  if (score < 8) {
    return 'Medium';
  }

  return 'High';
}

function readDataset(): Promise<DatasetRow[]> {
  return new Promise((resolve, reject) => {
    const rows: DatasetRow[] = [];

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row: DatasetRow) => {
        rows.push(row);
      })
      .on('end', () => {
        resolve(rows);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

function buildRestaurants(rows: DatasetRow[]): RestaurantData[] {
  const restaurants = new Map<string, RestaurantData>();

  for (const row of rows) {
    const idRestaurant = row.id_restaurante.trim();
    const name = row.nombre_restaurante.trim();

    if (!idRestaurant || !name) {
      throw new Error(
        'Dataset contains a restaurant with missing id_restaurante or nombre_restaurante.',
      );
    }

    const packagingType = mapPackagingType(row.tipo_envase);
    const availableDeliveryMethod = mapDeliveryMethod(row.tipo_transporte);

    const existing = restaurants.get(idRestaurant);

    if (existing) {
      if (
        existing.name !== name ||
        existing.packagingType !== packagingType ||
        existing.availableDeliveryMethod !== availableDeliveryMethod
      ) {
        throw new Error(`Inconsistent data for restaurant "${idRestaurant}".`);
      }

      continue;
    }

    restaurants.set(idRestaurant, {
      idRestaurant,
      name,
      packagingType,
      availableDeliveryMethod,
      status: RestaurantStatus.ACTIVE,
      sustainabilityIndicator: getSustainabilityIndicator(
        packagingType,
        availableDeliveryMethod,
      ),
    });
  }

  return Array.from(restaurants.values());
}

async function main() {
  const rows = await readDataset();

  console.log(`Dataset rows read: ${rows.length}`);

  const restaurants = buildRestaurants(rows);

  console.log(`Restaurants prepared: ${restaurants.length}`);

  console.log(restaurants.slice(0, 5));

  for (const restaurant of restaurants) {
    await prisma.restaurant.upsert({
      where: {
        idRestaurant: restaurant.idRestaurant,
      },
      update: {
        name: restaurant.name,
        packagingType: restaurant.packagingType,
        availableDeliveryMethod: restaurant.availableDeliveryMethod,
        status: restaurant.status,
        sustainabilityIndicator: restaurant.sustainabilityIndicator,
      },
      create: restaurant,
    });
  }

  console.log(`Restaurants seeded: ${restaurants.length}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
