import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(comuna?: number) {
    if (comuna !== undefined && (comuna < 1 || comuna > 15)) {
      throw new BadRequestException('La comuna debe estar entre 1 y 15.');
    }

    return this.prisma.restaurant.findMany({
      where: comuna !== undefined ? { comuna } : undefined,
      orderBy: {
        name: 'asc',
      },
    });
  }
}
