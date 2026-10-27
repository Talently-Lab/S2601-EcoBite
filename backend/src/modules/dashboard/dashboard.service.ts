// NOTE: Calculates administration dashboard metrics.

import { Injectable } from '@nestjs/common';
import { DeliveryMethod, OrderStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { RecentOrderResponseDto } from './dto/recent-order-response.dto';
import { ImpactRankingResponseDto } from './dto/impact-ranking-response.dto';

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

  async getRecentOrders(): Promise<RecentOrderResponseDto[]> {
    const orders = await this.prisma.order.findMany({
      orderBy: {
        orderedAt: 'desc',
      },
      take: 5,
      select: {
        orderedAt: true,
        totalAmount: true,
        orderStatus: true,
        restaurant: {
          select: {
            name: true,
          },
        },
      },
    });

    return orders.map((order) => ({
      orderedAt: order.orderedAt,
      restaurant: order.restaurant.name,
      totalAmount: order.totalAmount.toFixed(2),
      orderStatus: order.orderStatus,
    }));
  }

  private async getCompletedOrders(): Promise<number> {
    return this.prisma.order.count({
      where: {
        orderStatus: OrderStatus.COMPLETED,
      },
    });
  }

  async getImpactRanking(): Promise<ImpactRankingResponseDto[]> {
    const restaurants = await this.prisma.restaurant.findMany({
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

    return restaurants
      .map((restaurant) => ({
        restaurant: restaurant.name,
        co2SavedG: restaurant.orders.reduce(
          (total, order) => total + order.co2SavedG,
          0,
        ),
      }))
      .sort((a, b) => b.co2SavedG - a.co2SavedG);
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
