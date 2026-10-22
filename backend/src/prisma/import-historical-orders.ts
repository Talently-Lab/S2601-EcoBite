import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';

import csv from 'csv-parser';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import {
  DeliveryMethod,
  OrderSource,
  OrderStatus,
  PackagingType,
  Prisma,
  PrismaClient,
} from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const csvPath = path.resolve(
  process.cwd(),
  '..',
  'docs',
  'api',
  'data-model',
  'dataset.csv',
);

interface DatasetOrderRow {
  id_pedido: string;
  fecha: string;
  id_restaurante: string;
  nombre_restaurante: string;
  categoria: string;
  monto_total: string;
  metodo_pago: string;
  tiempo_entrega_min: string;
  distancia_km: string;
  tipo_transporte: string;
  tipo_envase: string;
  co2_ahorrado_kg: string;
}

function readDataset(): Promise<DatasetOrderRow[]> {
  return new Promise((resolve, reject) => {
    const rows: DatasetOrderRow[] = [];

    fs.createReadStream(csvPath)
      .on('error', reject)
      .pipe(csv())
      .on('data', (row: DatasetOrderRow) => {
        rows.push(row);
      })
      .on('end', () => {
        resolve(rows);
      })
      .on('error', reject);
  });
}

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

function validateDataset(rows: DatasetOrderRow[]): void {
  if (rows.length !== 1000) {
    throw new Error(
      `Se esperaban 1000 pedidos, pero se encontraron ${rows.length}.`,
    );
  }

  const orderIds = new Set<string>();

  for (const [index, row] of rows.entries()) {
    const orderId = row.id_pedido?.trim();

    if (!orderId) {
      throw new Error(`El pedido de la fila ${index + 2} no tiene id_pedido.`);
    }

    if (orderIds.has(orderId)) {
      throw new Error(
        `El dataset contiene un id_pedido duplicado: "${orderId}".`,
      );
    }

    orderIds.add(orderId);

    parseOrderDate(row.fecha, orderId);

    const totalAmount = parseNonNegativeDecimal(
      row.monto_total,
      'monto_total',
      orderId,
    );

    const distanceKm = parseNonNegativeDecimal(
      row.distancia_km,
      'distancia_km',
      orderId,
    );

    if (totalAmount.gt('99999999.99')) {
      throw new Error(`Monto fuera de rango en el pedido "${orderId}".`);
    }

    if (distanceKm.gt('9999.99')) {
      throw new Error(`Distancia fuera de rango en el pedido "${orderId}".`);
    }

    parseCo2SavedG(row.co2_ahorrado_kg, orderId);
    mapDeliveryMethod(row.tipo_transporte);
    mapPackagingType(row.tipo_envase);

    if (!row.id_restaurante?.trim()) {
      throw new Error(`Restaurante faltante en el pedido "${orderId}".`);
    }
  }
}

function parseNonNegativeDecimal(
  value: string,
  fieldName: string,
  orderId: string,
): Prisma.Decimal {
  const rawValue = value?.trim();

  if (!rawValue || !/^\d+(\.\d+)?$/.test(rawValue)) {
    throw new Error(
      `Valor inválido en ${fieldName} del pedido "${orderId}": "${value}".`,
    );
  }

  const decimal = new Prisma.Decimal(rawValue);

  if (!decimal.isFinite() || decimal.isNegative()) {
    throw new Error(
      `Valor fuera de rango en ${fieldName} del pedido "${orderId}".`,
    );
  }

  return decimal;
}

function parseOrderDate(value: string, orderId: string): Date {
  const rawDate = value?.trim();

  if (!rawDate || !/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    throw new Error(
      `Formato de fecha inválido en el pedido "${orderId}": "${value}".`,
    );
  }

  const date = new Date(`${rawDate}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== rawDate
  ) {
    throw new Error(`Fecha inválida en el pedido "${orderId}": "${value}".`);
  }

  if (date.getTime() > Date.now()) {
    throw new Error(`Fecha futura en el pedido "${orderId}": "${value}".`);
  }

  return date;
}

function parseCo2SavedG(value: string, orderId: string): number {
  const co2Kg = parseNonNegativeDecimal(value, 'co2_ahorrado_kg', orderId);

  const co2Grams = co2Kg
    .mul(1000)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);

  if (co2Grams.gt(2147483647) || !Number.isSafeInteger(co2Grams.toNumber())) {
    throw new Error(`CO₂ fuera de rango en el pedido "${orderId}".`);
  }

  return co2Grams.toNumber();
}

async function buildRestaurantIdMap(
  rows: DatasetOrderRow[],
): Promise<Map<string, string>> {
  const restaurantIds = [
    ...new Set(rows.map((row) => row.id_restaurante.trim())),
  ];

  const restaurants = await prisma.restaurant.findMany({
    where: {
      idRestaurant: {
        in: restaurantIds,
      },
    },
    select: {
      id: true,
      idRestaurant: true,
    },
  });

  const restaurantIdMap = new Map(
    restaurants.map((restaurant) => [restaurant.idRestaurant, restaurant.id]),
  );

  const missingIds = restaurantIds.filter((id) => !restaurantIdMap.has(id));

  if (missingIds.length > 0) {
    throw new Error(
      `Restaurantes inexistentes en Neon: ${missingIds.join(', ')}`,
    );
  }

  return restaurantIdMap;
}

function prepareHistoricalOrders(
  rows: DatasetOrderRow[],
  restaurantIdMap: Map<string, string>,
): Prisma.OrderCreateManyInput[] {
  return rows.map((row) => {
    const orderId = row.id_pedido.trim();
    const restaurantId = restaurantIdMap.get(row.id_restaurante.trim());

    if (!restaurantId) {
      throw new Error(`Restaurante inexistente para el pedido "${orderId}".`);
    }

    return {
      datasetOrderId: orderId,
      source: OrderSource.DATASET,
      userId: null,
      restaurantId,
      orderedAt: parseOrderDate(row.fecha, orderId),
      totalAmount: parseNonNegativeDecimal(
        row.monto_total,
        'monto_total',
        orderId,
      ),
      distanceKm: parseNonNegativeDecimal(
        row.distancia_km,
        'distancia_km',
        orderId,
      ),
      deliveryMethod: mapDeliveryMethod(row.tipo_transporte),
      packagingType: mapPackagingType(row.tipo_envase),
      orderStatus: OrderStatus.COMPLETED,
      co2SavedG: parseCo2SavedG(row.co2_ahorrado_kg, orderId),

      // El dataset no proporciona la cantidad de envases evitados.
      // Se utiliza 0 como valor técnico, no como una medición real.
      plasticItemsAvoided: 0,
    };
  });
}

async function insertHistoricalOrders(
  orders: Prisma.OrderCreateManyInput[],
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const existingOrders = await tx.order.count({
      where: {
        source: OrderSource.DATASET,
      },
    });

    if (existingOrders > 0) {
      throw new Error(
        `La importación se canceló: ya existen ${existingOrders} pedidos DATASET.`,
      );
    }

    const result = await tx.order.createMany({
      data: orders,
    });

    if (result.count !== 1000) {
      throw new Error(
        `Se esperaban 1000 inserciones, pero se realizaron ${result.count}.`,
      );
    }

    return result.count;
  });
}

async function main() {
  const rows = await readDataset();

  console.log(`Pedidos leídos del CSV: ${rows.length}`);

  validateDataset(rows);

  console.log('Validación del dataset completada.');

  const restaurantIdMap = await buildRestaurantIdMap(rows);

  console.log(`Restaurantes relacionados: ${restaurantIdMap.size}`);

  const orders = prepareHistoricalOrders(rows, restaurantIdMap);

  console.log(`Pedidos preparados: ${orders.length}`);

  const existingOrders = await prisma.order.count({
    where: {
      source: OrderSource.DATASET,
    },
  });

  console.log(`Pedidos históricos existentes en Neon: ${existingOrders}`);

  if (existingOrders !== 0) {
    throw new Error(
      `La importación se canceló: ya existen ${existingOrders} pedidos DATASET.`,
    );
  }

  console.log('Iniciando importación de los 1000 pedidos históricos...');

  const insertedCount = await insertHistoricalOrders(orders);

  console.log(`Pedidos históricos insertados: ${insertedCount}`);

  const totalDatasetOrders = await prisma.order.count({
    where: {
      source: OrderSource.DATASET,
    },
  });

  console.log(`Total de pedidos DATASET en Neon: ${totalDatasetOrders}`);
}

main()
  .catch((error) => {
    console.error('Error al preparar la importación:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
