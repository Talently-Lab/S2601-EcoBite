import { BadRequestException, Injectable } from '@nestjs/common';
import { ProductType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(comuna?: number) {
    if (comuna !== undefined && (comuna < 1 || comuna > 15)) {
      throw new BadRequestException('La comuna debe estar entre 1 y 15.');
    }

    const restaurants = await this.prisma.restaurant.findMany({
      where: comuna !== undefined ? { comuna } : undefined,
      include: {
        products: {
          where: {
            type: ProductType.DISH,
          },
          select: {
            id: true,
            name: true,
            price: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const distances = await this.prisma.comunaDistance.findMany({
      select: {
        originComuna: true,
        destinationComuna: true,
        distanceKm: true,
      },
    });

    const distancesByOrigin = new Map<number, Record<string, string>>();

    for (const distance of distances) {
      const destinationDistances =
        distancesByOrigin.get(distance.originComuna) ?? {};

      destinationDistances[String(distance.destinationComuna)] =
        distance.distanceKm.toFixed(2);

      distancesByOrigin.set(distance.originComuna, destinationDistances);
    }

    return restaurants.map((restaurant) => ({
      ...restaurant,
      products: restaurant.products.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price.toFixed(2),
      })),
      distances:
        restaurant.comuna !== null
          ? (distancesByOrigin.get(restaurant.comuna) ?? {})
          : {},
    }));
  }
}
