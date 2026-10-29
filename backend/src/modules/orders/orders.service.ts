import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryMethod, Prisma, ProductType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrderDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
    });

    if (!restaurant || restaurant.status !== 'ACTIVE') {
      throw new NotFoundException('Restaurant not found or inactive');
    }

    if (restaurant.comuna === null) {
      throw new BadRequestException('Restaurant comuna is not configured');
    }

    const comunaDistance = await this.prisma.comunaDistance.findUnique({
      where: {
        originComuna_destinationComuna: {
          originComuna: restaurant.comuna,
          destinationComuna: dto.deliveryComuna,
        },
      },
    });

    if (!comunaDistance) {
      throw new BadRequestException(
        'Distance not found for the selected comunas',
      );
    }

    const distanceKm = comunaDistance.distanceKm;

    const productIds = dto.items.map((item) => item.productId);

    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Duplicate products are not allowed');
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        restaurantId: restaurant.id,
        type: ProductType.DISH,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'All products must exist and belong to the selected restaurant',
      );
    }

    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );

    const orderItems = dto.items.map((item) => {
      const product = productsById.get(item.productId)!;
      const subtotal = product.price.mul(item.quantity);

      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal,
      };
    });

    const totalAmount = orderItems.reduce(
      (total, item) => total.add(item.subtotal),
      new Prisma.Decimal(0),
    );

    const emissionsByMethod: Record<DeliveryMethod, number> = {
      BIKE: 0,
      MOTORCYCLE: 72,
      CAR: 216,
    };

    const emissionPerKm = emissionsByMethod[restaurant.availableDeliveryMethod];

    const co2SavedG = new Prisma.Decimal('46.58')
      .minus(emissionPerKm)
      .mul(distanceKm)
      .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
      .toNumber();

    return this.prisma.order.create({
      data: {
        userId,
        restaurantId: restaurant.id,
        totalAmount,
        distanceKm,
        deliveryComuna: dto.deliveryComuna,
        deliveryMethod: restaurant.availableDeliveryMethod,
        packagingType: restaurant.packagingType,
        orderStatus: 'COMPLETED',
        co2SavedG,
        plasticItemsAvoided: 0,
        orderItems: {
          create: orderItems,
        },
      },
      include: {
        restaurant: {
          select: {
            name: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async getUserImpact(userId: string) {
    const [co2Total, ordersWithImpact] = await Promise.all([
      this.prisma.order.aggregate({
        where: { userId },
        _sum: { co2SavedG: true },
      }),
      this.prisma.order.count({
        where: {
          userId,
          co2SavedG: { gt: 0 },
        },
      }),
    ]);

    return {
      totalCo2SavedG: co2Total._sum.co2SavedG ?? 0,
      ordersWithImpact,
    };
  }
}
