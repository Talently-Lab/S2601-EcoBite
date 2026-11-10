import { DeliveryMethod, OrderStatus, Prisma } from '@prisma/client';

import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const prisma = {
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    restaurant: {
      findMany: jest.fn(),
    },
    user: { count: jest.fn() },
  };

  const service = new DashboardService(
    prisma as unknown as ConstructorParameters<typeof DashboardService>[0],
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.user.count.mockResolvedValue(0);
    prisma.order.aggregate.mockResolvedValue({
      _sum: { totalAmount: null, co2SavedG: null },
      _avg: { totalAmount: null },
      _count: { _all: 0 },
    });
    prisma.order.count.mockResolvedValue(0);
  });

  describe('getStats', () => {
    afterEach(() => jest.useRealTimers());

    it.each([
      [20, 10, 100],
      [5, 10, -50],
      [0, 10, -100],
      [5, 0, null],
      [0, 0, 0],
      [10, 10, 0],
    ])(
      'calcula variacion de %s frente a %s como %s',
      async (current, previous, change) => {
        prisma.order.count
          .mockResolvedValueOnce(99)
          .mockResolvedValueOnce(current)
          .mockResolvedValueOnce(previous);
        prisma.user.count
          .mockResolvedValueOnce(88)
          .mockResolvedValueOnce(current)
          .mockResolvedValueOnce(previous);
        for (const amount of [999, current, previous]) {
          prisma.order.aggregate
            .mockResolvedValueOnce({
              _sum: { totalAmount: new Prisma.Decimal(amount) },
              _avg: { totalAmount: amount ? new Prisma.Decimal(amount) : null },
            })
            .mockResolvedValueOnce({
              _sum: { co2SavedG: amount || null },
              _count: { _all: amount ? 2 : 0 },
            });
        }

        const result = await service.getStats();

        expect(result).toMatchObject({
          completedOrders: 99,
          totalRevenue: '999.00',
          registeredUsers: 88,
          comparison: {
            current: {
              completedOrders: current,
              totalRevenue: `${current}.00`,
              registeredUsers: current,
              averageTicket: current,
              co2SavedG: current,
              avgCo2SavedG: current / 2,
            },
            previous: {
              completedOrders: previous,
              totalRevenue: `${previous}.00`,
              registeredUsers: previous,
              averageTicket: previous,
              co2SavedG: previous,
              avgCo2SavedG: previous / 2,
            },
            percentageChange: {
              completedOrders: change,
              totalRevenue: change,
              averageTicket: change,
              registeredUsers: change,
              co2SavedG: change,
              avgCo2SavedG: change,
            },
          },
        });
      },
    );

    it.each([
      ['2026-10-30T02:59:59.999Z', '2026-08-31', '2026-09-30', '2026-10-30'],
      ['2026-10-30T03:00:00.000Z', '2026-09-01', '2026-10-01', '2026-10-31'],
      ['2028-03-01T15:00:00.000Z', '2028-01-02', '2028-02-01', '2028-03-02'],
    ])(
      'compara 30 dias calendario argentinos a partir de %s',
      async (now, previous, current, end) => {
        jest.useFakeTimers().setSystemTime(new Date(now));

        const result = await service.getStats();

        expect(result).toMatchObject({
          comparison: {
            timeZone: 'America/Argentina/Buenos_Aires',
            current: {
              startInclusive: new Date(`${current}T03:00:00.000Z`),
              endExclusive: new Date(`${end}T03:00:00.000Z`),
            },
            previous: {
              startInclusive: new Date(`${previous}T03:00:00.000Z`),
              endExclusive: new Date(`${current}T03:00:00.000Z`),
            },
          },
        });
        for (const [start, stop] of [
          [current, end],
          [previous, current],
        ]) {
          const range = {
            gte: new Date(`${start}T03:00:00.000Z`),
            lt: new Date(`${stop}T03:00:00.000Z`),
          };
          expect(prisma.order.count).toHaveBeenCalledWith({
            where: { orderStatus: OrderStatus.COMPLETED, orderedAt: range },
          });
          expect(prisma.user.count).toHaveBeenCalledWith({
            where: { role: 'CLIENT', registeredAt: range },
          });
          expect(prisma.order.aggregate).toHaveBeenCalledWith({
            where: {
              orderStatus: OrderStatus.COMPLETED,
              deliveryMethod: DeliveryMethod.BIKE,
              orderedAt: range,
            },
            _sum: { co2SavedG: true },
            _count: { _all: true },
          });
          expect(prisma.order.aggregate).toHaveBeenCalledWith({
            where: { orderStatus: OrderStatus.COMPLETED, orderedAt: range },
            _sum: { totalAmount: true },
            _avg: { totalAmount: true },
          });
        }
        expect(prisma.order.count).toHaveBeenCalledTimes(3);
        expect(prisma.user.count).toHaveBeenCalledTimes(3);
        expect(prisma.order.aggregate).toHaveBeenCalledTimes(6);
      },
    );

    it.each([
      [new Prisma.Decimal('100.005'), 100.005, 3],
      [null, 0, 0],
    ])(
      'agrega ticket promedio %s y cuenta solo CLIENT',
      async (average, expected, clients) => {
        prisma.order.count.mockResolvedValue(3);
        prisma.order.aggregate
          .mockResolvedValueOnce({
            _sum: { totalAmount: new Prisma.Decimal('300.015') },
            _avg: { totalAmount: average },
          })
          .mockResolvedValueOnce({
            _sum: { co2SavedG: 100 },
            _count: { _all: 3 },
          });
        prisma.user.count.mockResolvedValue(clients);

        await expect(service.getStats()).resolves.toMatchObject({
          averageTicket: expected,
          registeredUsers: clients,
          avgCo2SavedG: 100 / 3,
        });
        expect(prisma.order.aggregate).toHaveBeenCalledWith({
          where: { orderStatus: OrderStatus.COMPLETED },
          _sum: { totalAmount: true },
          _avg: { totalAmount: true },
        });
        expect(prisma.user.count).toHaveBeenCalledWith({
          where: { role: 'CLIENT' },
        });
      },
    );
    it('devuelve cero sin pedidos elegibles aunque existan otros completados', async () => {
      prisma.order.count.mockResolvedValue(42);
      prisma.order.aggregate
        .mockResolvedValueOnce({
          _sum: { totalAmount: new Prisma.Decimal('1500.50') },
          _avg: { totalAmount: new Prisma.Decimal('35.726190476190476') },
        })
        .mockResolvedValueOnce({
          _sum: { co2SavedG: null },
          _count: { _all: 0 },
        });

      await expect(service.getStats()).resolves.toMatchObject({
        completedOrders: 42,
        totalRevenue: '1500.50',
        co2SavedG: 0,
        avgCo2SavedG: 0,
      });
    });

    it.each([
      [501, 2, 250.5],
      [100, 3, 100 / 3],
      [0, 4, 0],
    ])(
      'calcula el promedio de %i gramos entre %i pedidos elegibles',
      async (total, eligibleCount, average) => {
        prisma.order.count.mockResolvedValue(42);
        prisma.order.aggregate
          .mockResolvedValueOnce({
            _sum: { totalAmount: new Prisma.Decimal('1500.50') },
            _avg: { totalAmount: new Prisma.Decimal('35.726190476190476') },
          })
          .mockResolvedValueOnce({
            _sum: { co2SavedG: total },
            _count: { _all: eligibleCount },
          });

        await expect(service.getStats()).resolves.toMatchObject({
          completedOrders: 42,
          totalRevenue: '1500.50',
          co2SavedG: total,
          avgCo2SavedG: average,
        });
        expect(prisma.order.aggregate).toHaveBeenCalledWith({
          where: {
            orderStatus: OrderStatus.COMPLETED,
            deliveryMethod: DeliveryMethod.BIKE,
          },
          _sum: { co2SavedG: true },
          _count: { _all: true },
        });
        expect(prisma.order.aggregate).toHaveBeenCalledTimes(6);
        expect(prisma.order.count).toHaveBeenCalledTimes(3);
      },
    );
  });

  describe('getRecentOrders', () => {
    it('consulta hasta 5 pedidos COMPLETED por fecha e ID descendentes', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      await service.getRecentOrders();

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { orderStatus: OrderStatus.COMPLETED },
        orderBy: [{ orderedAt: 'desc' }, { id: 'desc' }],
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

    it.each([1, 3, 5])(
      'conserva los %i pedidos disponibles y únicamente los cuatro campos actuales',
      async (count) => {
        const orders = Array.from({ length: count }, (_, index) => ({
          orderedAt: new Date('2026-10-27T12:00:00.000Z'),
          totalAmount: new Prisma.Decimal('1500.50'),
          orderStatus: OrderStatus.COMPLETED,
          restaurant: { name: `Restaurante ${index}` },
        }));
        prisma.order.findMany.mockResolvedValue(orders);

        await expect(service.getRecentOrders()).resolves.toEqual(
          orders.map((order) => ({
            orderedAt: order.orderedAt,
            restaurant: order.restaurant.name,
            totalAmount: '1500.50',
            orderStatus: OrderStatus.COMPLETED,
          })),
        );
      },
    );
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
