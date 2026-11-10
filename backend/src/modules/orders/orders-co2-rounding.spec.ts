import { DeliveryMethod, Prisma } from '@prisma/client';
import { OrdersService } from './orders.service';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class {},
}));

function fixture(method: DeliveryMethod, distanceKm: string) {
  const prisma = {
    restaurant: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'restaurant',
        status: 'ACTIVE',
        comuna: 14,
        availableDeliveryMethod: method,
        packagingType: 'BIODEGRADABLE',
      }),
    },
    comunaDistance: {
      findUnique: jest.fn().mockResolvedValue({
        distanceKm: new Prisma.Decimal(distanceKm),
      }),
    },
    product: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: 'product', price: new Prisma.Decimal('100') },
        ]),
    },
    order: {
      create: jest.fn((args: { data: { co2SavedG: number } }) =>
        Promise.resolve({
          id: 'mock-order',
          co2SavedG: Number(args.data.co2SavedG),
        }),
      ),
    },
  };
  const service = new OrdersService(
    prisma as unknown as ConstructorParameters<typeof OrdersService>[0],
  );
  const create = () =>
    service.create('user', {
      restaurantId: 'restaurant',
      deliveryComuna: 13,
      items: [{ productId: 'product', quantity: 1 }],
    });
  return { prisma, create };
}

describe('APP CO2 calculation verification with mocks only', () => {
  it.each([
    [DeliveryMethod.BIKE, '161.6326'],
    [DeliveryMethod.MOTORCYCLE, '-88.2074'],
    [DeliveryMethod.CAR, '-587.8874'],
  ])(
    'preserves the approved %s factor within final-rounding tolerance',
    async (method, exact) => {
      const { prisma, create } = fixture(method, '3.47');
      await create();
      const stored = new Prisma.Decimal(
        prisma.order.create.mock.calls[0][0].data.co2SavedG,
      );
      expect(stored.minus(exact).abs().lte('0.5')).toBe(true);
      expect(stored.isNegative()).toBe(new Prisma.Decimal(exact).isNegative());
      expect(prisma.comunaDistance.findUnique).toHaveBeenCalledWith({
        where: {
          originComuna_destinationComuna: {
            originComuna: 14,
            destinationComuna: 13,
          },
        },
      });
      expect(prisma.order.create).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    [DeliveryMethod.BIKE, '2.2', 102],
    [DeliveryMethod.BIKE, '3.47', 162],
    [DeliveryMethod.MOTORCYCLE, '3.47', -88],
    [DeliveryMethod.CAR, '3.47', -588],
    [DeliveryMethod.BIKE, '25', 1165],
    [DeliveryMethod.MOTORCYCLE, '25', -636],
    [DeliveryMethod.CAR, '25', -4236],
    [DeliveryMethod.BIKE, '0', 0],
  ])(
    'stores %s at %s km with exactly one final HALF_UP rounding to %i g',
    async (method, distance, expected) => {
      const { prisma, create } = fixture(method, distance);
      const result = await create();
      const stored = new Prisma.Decimal(
        prisma.order.create.mock.calls[0][0].data.co2SavedG,
      ).toNumber();
      expect(typeof prisma.order.create.mock.calls[0][0].data.co2SavedG).toBe(
        'number',
      );
      expect(stored).toBe(expected);
      expect(Number.isInteger(stored)).toBe(true);
      expect(result.co2SavedG).toBe(expected);
    },
  );
});
