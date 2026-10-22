import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';

import csv from 'csv-parser';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import {
  DeliveryMethod,
  FoodCategory,
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
  categoria: string;
  tipo_transporte: string;
  tipo_envase: string;
}

interface RestaurantComunaRow {
  id_restaurante: string;
  comuna: string;
}

interface RestaurantData {
  idRestaurant: string;
  name: string;
  comuna: number;
  foodCategory: FoodCategory;
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

const comunasCsvPath = path.resolve(
  process.cwd(),
  '..',
  'docs',
  'api',
  'data-model',
  'restaurantes_comuna.csv',
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

function mapFoodCategory(rawCategory: string): FoodCategory {
  switch (rawCategory.trim()) {
    case 'Comida casera':
      return FoodCategory.HOMEMADE;

    case 'Fast food':
      return FoodCategory.FAST_FOOD;

    case 'Cafe y postres':
      return FoodCategory.COFFEE_AND_DESSERTS;

    case 'Saludable':
      return FoodCategory.HEALTHY;

    case 'Vegano':
      return FoodCategory.VEGAN;

    case 'Internacional':
      return FoodCategory.INTERNATIONAL;

    default:
      throw new Error(`Unknown food category: "${rawCategory}"`);
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

function readComunasCsv(): Promise<RestaurantComunaRow[]> {
  return new Promise((resolve, reject) => {
    const rows: RestaurantComunaRow[] = [];

    fs.createReadStream(comunasCsvPath)
      .pipe(csv())
      .on('data', (row: RestaurantComunaRow) => {
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

function buildComunasMap(rows: RestaurantComunaRow[]): Map<string, number> {
  const comunas = new Map<string, number>();

  for (const row of rows) {
    const idRestaurant = row.id_restaurante?.trim();
    const rawComuna = row.comuna?.trim();

    if (!idRestaurant || !rawComuna) {
      throw new Error('El CSV de comunas contiene un ID o una comuna vacía.');
    }

    if (comunas.has(idRestaurant)) {
      throw new Error(`ID de restaurante duplicado: "${idRestaurant}".`);
    }

    const match = /^Comuna\s+(1[0-5]|[1-9])$/.exec(rawComuna);

    if (!match) {
      throw new Error(
        `Comuna inválida para "${idRestaurant}": "${rawComuna}".`,
      );
    }

    comunas.set(idRestaurant, Number(match[1]));
  }

  return comunas;
}

function buildRestaurants(
  rows: DatasetRow[],
  comunas: Map<string, number>,
): RestaurantData[] {
  const restaurants = new Map<string, RestaurantData>();

  for (const row of rows) {
    const idRestaurant = row.id_restaurante.trim();
    const name = row.nombre_restaurante.trim();

    if (!idRestaurant || !name) {
      throw new Error(
        'Dataset contains a restaurant with missing id_restaurante or nombre_restaurante.',
      );
    }

    const comuna = comunas.get(idRestaurant);

    if (comuna === undefined) {
      throw new Error(
        `No se encontró comuna para el restaurante "${idRestaurant}".`,
      );
    }

    const foodCategory = mapFoodCategory(row.categoria);
    const packagingType = mapPackagingType(row.tipo_envase);
    const availableDeliveryMethod = mapDeliveryMethod(row.tipo_transporte);

    const existing = restaurants.get(idRestaurant);

    if (existing) {
      if (
        existing.name !== name ||
        existing.foodCategory !== foodCategory ||
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
      comuna,
      foodCategory,
      packagingType,
      availableDeliveryMethod,
      status: RestaurantStatus.ACTIVE,
      sustainabilityIndicator: getSustainabilityIndicator(
        packagingType,
        availableDeliveryMethod,
      ),
    });
  }

  for (const idRestaurant of comunas.keys()) {
    if (!restaurants.has(idRestaurant)) {
      throw new Error(
        `El CSV de comunas contiene un restaurante inexistente: "${idRestaurant}".`,
      );
    }
  }

  return Array.from(restaurants.values());
}

async function main() {
  const rows = await readDataset();
  const comunaRows = await readComunasCsv();

  console.log(`Dataset rows read: ${rows.length}`);
  console.log(`Comunas rows read: ${comunaRows.length}`);

  const comunas = buildComunasMap(comunaRows);
  const restaurants = buildRestaurants(rows, comunas);

  if (restaurants.length !== 294 || comunas.size !== 294) {
    throw new Error(
      `Se esperaban 294 restaurantes y 294 comunas. Restaurantes: ${restaurants.length}, comunas: ${comunas.size}.`,
    );
  }

  console.log(`Restaurants prepared: ${restaurants.length}`);
  console.log(restaurants.slice(0, 5));

  for (const restaurant of restaurants) {
    await prisma.restaurant.upsert({
      where: {
        idRestaurant: restaurant.idRestaurant,
      },
      update: {
        name: restaurant.name,
        comuna: restaurant.comuna,
        foodCategory: restaurant.foodCategory,
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
