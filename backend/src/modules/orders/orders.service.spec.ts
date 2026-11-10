import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdersService } from './orders.service';

describe('OrdersService - comuna distances', () => {
  const userId = 'user-1';

  const dto = {
    restaurantId: 'restaurant-1',
    deliveryComuna: 13,
    items: [{ productId: 'product-1', quantity: 1 }],
  };

  const restaurant = {
    id: 'restaurant-1',
    status: 'ACTIVE',
    comuna: 14,
    availableDeliveryMethod: 'BIKE',
    packagingType: 'BIODEGRADABLE',
  };

  const product = {
    id: 'product-1',
    restaurantId: 'restaurant-1',
    type: 'DISH',
    price: new Prisma.Decimal(49500),
  };

  const prisma = {
    restaurant: {
      findUnique: jest.fn(),
    },
    comunaDistance: {
      findUnique: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    order: {
      create: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    },
  };

  const service = new OrdersService(
    prisma as unknown as ConstructorParameters<typeof OrdersService>[0],
  );

  beforeEach(() => {
    jest.resetAllMocks();

    prisma.restaurant.findUnique.mockResolvedValue({ ...restaurant });
    prisma.comunaDistance.findUnique.mockResolvedValue({
      distanceKm: new Prisma.Decimal('3.47'),
    });
    prisma.product.findMany.mockResolvedValue([product]);
    prisma.order.create.mockResolvedValue({
      id: 'order-1',
      co2SavedG: 162,
    });
  });

  it('obtiene la distancia de la matriz de comunas', async () => {
    await service.create(userId, dto);

    expect(prisma.comunaDistance.findUnique).toHaveBeenCalledWith({
      where: {
        originComuna_destinationComuna: {
          originComuna: 14,
          destinationComuna: 13,
        },
      },
    });
  });

  it('guarda la comuna y la distancia calculada', async () => {
    await service.create(userId, dto);

    const call = prisma.order.create.mock.calls[0][0];
    expect(call.data.deliveryComuna).toBe(13);
    expect(String(call.data.distanceKm)).toBe('3.47');
    expect(call.data.co2SavedG).toBe(162);
  });

  it.each([
    ['BIKE', 162],
    ['MOTORCYCLE', -88],
    ['CAR', -588],
  ])(
    'stores final integer %s emissions and returns a JSON number',
    async (method, expected) => {
      prisma.restaurant.findUnique.mockResolvedValue({
        ...restaurant,
        availableDeliveryMethod: method,
      });
      prisma.order.create.mockResolvedValue({
        id: 'order-1',
        co2SavedG: expected,
      });
      const result = await service.create(userId, dto);
      expect(prisma.order.create.mock.calls[0][0].data.co2SavedG).toBe(
        expected,
      );
      expect(JSON.parse(JSON.stringify(result)).co2SavedG).toBe(expected);
    },
  );

  it('rejects negative distance before creating an order', async () => {
    prisma.comunaDistance.findUnique.mockResolvedValue({
      distanceKm: new Prisma.Decimal('-1'),
    });
    await expect(service.create(userId, dto)).rejects.toThrow();
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('rechaza restaurantes sin comuna configurada', async () => {
    prisma.restaurant.findUnique.mockResolvedValue({
      ...restaurant,
      comuna: null,
    });

    await expect(service.create(userId, dto)).rejects.toThrow(
      BadRequestException,
    );

    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('rechaza pedidos sin distancia en la matriz', async () => {
    prisma.comunaDistance.findUnique.mockResolvedValue(null);

    await expect(service.create(userId, dto)).rejects.toThrow(
      BadRequestException,
    );

    expect(prisma.order.create).not.toHaveBeenCalled();
  });
});

describe('OrdersService - user impact', () => {
  const userId = 'user-1';

  const prisma = {
    order: {
      aggregate: jest.fn(),
      count: jest.fn(),
    },
  };

  const service = new OrdersService(
    prisma as unknown as ConstructorParameters<typeof OrdersService>[0],
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calcula el CO2 total ahorrado solo en pedidos en bicicleta', async () => {
    prisma.order.aggregate.mockResolvedValue({
      _sum: { co2SavedG: 450 },
      _count: { _all: 2 },
    });
    prisma.order.count.mockResolvedValue(2);

    const result = await service.getUserImpact(userId);

    expect(result.totalCo2SavedG).toBe(450);
    expect(prisma.order.aggregate).toHaveBeenCalledWith({
      where: {
        userId,
        deliveryMethod: 'BIKE',
      },
      _sum: { co2SavedG: true },
    });
  });

  it('cuenta solamente los pedidos con CO2 ahorrado mayor que cero', async () => {
    prisma.order.aggregate.mockResolvedValue({
      _sum: { co2SavedG: 450 },
      _count: { _all: 2 },
    });
    prisma.order.count.mockResolvedValue(2);

    const result = await service.getUserImpact(userId);

    expect(result.ordersWithImpact).toBe(2);
    expect(prisma.order.count).toHaveBeenCalledWith({
      where: {
        userId,
        co2SavedG: { gt: 0 },
      },
    });
  });

  it('devuelve cero cuando el usuario no tiene pedidos', async () => {
    prisma.order.aggregate.mockResolvedValue({
      _sum: { co2SavedG: null },
      _count: { _all: 0 },
    });
    prisma.order.count.mockResolvedValue(0);

    await expect(service.getUserImpact(userId)).resolves.toEqual({
      totalCo2SavedG: 0,
      ordersWithImpact: 0,
      avgCo2SavedG: 0,
      sustainableOrdersCount: 0,
    });
  });

  it.each([
    { sum: 100, count: 2, average: 50 },
    { sum: 100, count: 3, average: 100 / 3 },
    { sum: 0, count: 2, average: 0 },
    { sum: null, count: 0, average: 0 },
  ])(
    'D077 calcula $sum / $count sin redondear y conserva los indicadores existentes',
    async ({ sum, count, average }) => {
      prisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { co2SavedG: 900 } })
        .mockResolvedValueOnce({
          _sum: { co2SavedG: sum },
          _count: { _all: count },
        });
      prisma.order.count.mockResolvedValue(5);

      await expect(service.getUserImpact(userId)).resolves.toEqual({
        totalCo2SavedG: 900,
        ordersWithImpact: 5,
        avgCo2SavedG: average,
        sustainableOrdersCount: count,
      });
    },
  );

  it('D077 excluye PENDING, CANCELLED y otros metodos, contando tambien pedidos de 0 g del usuario autenticado', async () => {
    prisma.order.aggregate
      .mockResolvedValueOnce({ _sum: { co2SavedG: 900 } })
      .mockResolvedValueOnce({
        _sum: { co2SavedG: 100 },
        _count: { _all: 2 },
      });
    prisma.order.count.mockResolvedValue(5);

    const result = await service.getUserImpact('authenticated-user');

    expect(prisma.order.aggregate).toHaveBeenNthCalledWith(1, {
      where: { userId: 'authenticated-user', deliveryMethod: 'BIKE' },
      _sum: { co2SavedG: true },
    });
    expect(prisma.order.aggregate).toHaveBeenNthCalledWith(2, {
      where: {
        userId: 'authenticated-user',
        orderStatus: 'COMPLETED',
        deliveryMethod: 'BIKE',
      },
      _sum: { co2SavedG: true },
      _count: { _all: true },
    });
    expect(prisma.order.count).toHaveBeenCalledWith({
      where: { userId: 'authenticated-user', co2SavedG: { gt: 0 } },
    });
    expect(result).toEqual({
      totalCo2SavedG: 900,
      ordersWithImpact: 5,
      avgCo2SavedG: 50,
      sustainableOrdersCount: 2,
    });
    expect(prisma.order.aggregate).toHaveBeenCalledTimes(2);
    expect(prisma.order.count).toHaveBeenCalledTimes(1);
  });
});
