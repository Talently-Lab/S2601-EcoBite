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
    prisma.order.create.mockResolvedValue({ id: 'order-1' });
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
    expect(call.data.distanceKm.toString()).toBe('3.47');
    expect(call.data.co2SavedG).toBe(162);
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
    });
    prisma.order.count.mockResolvedValue(0);

    await expect(service.getUserImpact(userId)).resolves.toEqual({
      totalCo2SavedG: 0,
      ordersWithImpact: 0,
    });
  });
});
