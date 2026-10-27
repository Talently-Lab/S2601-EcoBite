import { DeliveryMethod, OrderStatus, Prisma } from '@prisma/client';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const prisma = {
    order: {
      findMany: jest.fn(),
    },
    restaurant: {
      findMany: jest.fn(),
    },
  };

  const service = new DashboardService(
    prisma as unknown as ConstructorParameters<typeof DashboardService>[0],
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getRecentOrders', () => {
    it('consulta los últimos 5 pedidos por fecha descendente', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      await service.getRecentOrders();

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        orderBy: { orderedAt: 'desc' },
        take: 5,
        select: {
          orderedAt: true,
          totalAmount: true,
          orderStatus: true,
          restaurant: {
            select: { name: true },
          },
        },
      });
    });

    it('devuelve únicamente los campos aprobados', async () => {
      const date = new Date('2026-10-27T12:00:00.000Z');

      prisma.order.findMany.mockResolvedValue([
        {
          orderedAt: date,
          totalAmount: new Prisma.Decimal('1500.50'),
          orderStatus: OrderStatus.COMPLETED,
          restaurant: { name: 'Restaurante A' },
        },
      ]);

      await expect(service.getRecentOrders()).resolves.toEqual([
        {
          orderedAt: date,
          restaurant: 'Restaurante A',
          totalAmount: '1500.50',
          orderStatus: OrderStatus.COMPLETED,
        },
      ]);
    });

    it('devuelve un array vacío cuando no hay pedidos', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      await expect(service.getRecentOrders()).resolves.toEqual([]);
    });
  });

  describe('getImpactRanking', () => {
    it('consulta únicamente restaurantes BIKE y pedidos completados', async () => {
      prisma.restaurant.findMany.mockResolvedValue([]);

      await service.getImpactRanking();

      expect(prisma.restaurant.findMany).toHaveBeenCalledWith({
        where: {
          availableDeliveryMethod: DeliveryMethod.BIKE,
        },
        select: {
          name: true,
          orders: {
            where: {
              orderStatus: OrderStatus.COMPLETED,
            },
            select: {
              co2SavedG: true,
            },
          },
        },
      });
    });

    it('suma el CO₂ y ordena el ranking de mayor a menor', async () => {
      prisma.restaurant.findMany.mockResolvedValue([
        {
          name: 'Restaurante A',
          orders: [{ co2SavedG: 100 }, { co2SavedG: 200 }],
        },
        {
          name: 'Restaurante B',
          orders: [{ co2SavedG: 500 }],
        },
      ]);

      await expect(service.getImpactRanking()).resolves.toEqual([
        { restaurant: 'Restaurante B', co2SavedG: 500 },
        { restaurant: 'Restaurante A', co2SavedG: 300 },
      ]);
    });

    it('incluye restaurantes sin pedidos completados con CO₂ igual a cero', async () => {
      prisma.restaurant.findMany.mockResolvedValue([
        { name: 'Restaurante A', orders: [] },
      ]);

      await expect(service.getImpactRanking()).resolves.toEqual([
        { restaurant: 'Restaurante A', co2SavedG: 0 },
      ]);
    });

    it('devuelve un array vacío cuando no hay restaurantes BIKE', async () => {
      prisma.restaurant.findMany.mockResolvedValue([]);

      await expect(service.getImpactRanking()).resolves.toEqual([]);
    });
  });
});
