import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.restaurant.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }
}
