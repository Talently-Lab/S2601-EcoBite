// NOTE: Calculates administration dashboard metrics.

import { Injectable } from '@nestjs/common';
import { DeliveryMethod, OrderStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [completedOrders, totalRevenue, co2SavedG] = await Promise.all([
      this.getCompletedOrders(),
      this.getTotalRevenue(),
      this.getCo2SavedG(),
    ]);

    return {
      completedOrders,
      totalRevenue,
      co2SavedG,
    };
  }

  private async getCompletedOrders(): Promise<number> {
    return this.prisma.order.count({
      where: {
        orderStatus: OrderStatus.COMPLETED,
      },
    });
  }

  private async getTotalRevenue(): Promise<string> {
    const result = await this.prisma.order.aggregate({
      where: {
        orderStatus: OrderStatus.COMPLETED,
      },
      _sum: {
        totalAmount: true,
      },
    });

    return result._sum.totalAmount?.toFixed(2) ?? '0.00';
  }

  private async getCo2SavedG(): Promise<number> {
    const result = await this.prisma.order.aggregate({
      where: {
        orderStatus: OrderStatus.COMPLETED,
        deliveryMethod: DeliveryMethod.BIKE,
      },
      _sum: {
        co2SavedG: true,
      },
    });

    return result._sum.co2SavedG ?? 0;
  }
}
