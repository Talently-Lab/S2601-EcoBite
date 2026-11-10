// NOTE: Calculates administration dashboard metrics.

import { Injectable } from '@nestjs/common';
import { DeliveryMethod, OrderStatus, Prisma, UserRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { RecentOrderResponseDto } from './dto/recent-order-response.dto';
import { ImpactRankingResponseDto } from './dto/impact-ranking-response.dto';
import {
  DASHBOARD_TIME_ZONE,
  DashboardDateRange,
  getDashboardPeriods,
} from './dashboard-periods';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const periods = getDashboardPeriods(new Date());
    const [accumulated, current, previous] = await Promise.all([
      this.getMetrics(),
      this.getMetrics(periods.current),
      this.getMetrics(periods.previous),
    ]);
    return {
      ...accumulated,
      comparison: {
        timeZone: DASHBOARD_TIME_ZONE,
        current: {
          startInclusive: periods.current.gte,
          endExclusive: periods.current.lt,
          ...current,
        },
        previous: {
          startInclusive: periods.previous.gte,
          endExclusive: periods.previous.lt,
          ...previous,
        },
        percentageChange: {
          completedOrders: this.percentageChange(
            current.completedOrders,
            previous.completedOrders,
          ),
          totalRevenue: this.percentageChange(
            current.totalRevenue,
            previous.totalRevenue,
          ),
          averageTicket: this.percentageChange(
            current.averageTicket,
            previous.averageTicket,
          ),
          registeredUsers: this.percentageChange(
            current.registeredUsers,
            previous.registeredUsers,
          ),
          co2SavedG: this.percentageChange(
            current.co2SavedG,
            previous.co2SavedG,
          ),
          avgCo2SavedG: this.percentageChange(
            current.avgCo2SavedG,
            previous.avgCo2SavedG,
          ),
        },
      },
    };
  }

  private percentageChange(
    current: number | string,
    previous: number | string,
  ): number | null {
    const baseline = new Prisma.Decimal(previous);
    const value = new Prisma.Decimal(current);
    if (baseline.isZero()) return value.isZero() ? 0 : null;
    return value.minus(baseline).div(baseline).times(100).toNumber();
  }

  private async getMetrics(range?: DashboardDateRange) {
    const [completedOrders, revenueStats, co2Stats, registeredUsers] =
      await Promise.all([
        this.getCompletedOrders(range),
        this.getRevenueStats(range),
        this.getCo2Stats(range),
        this.prisma.user.count({
          where: {
            role: UserRole.CLIENT,
            ...(range ? { registeredAt: range } : {}),
          },
        }),
      ]);

    return {
      completedOrders,
      ...revenueStats,
      registeredUsers,
      co2SavedG: co2Stats.co2SavedG,
      avgCo2SavedG: co2Stats.avgCo2SavedG,
    };
  }

  async getRecentOrders(): Promise<RecentOrderResponseDto[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        orderStatus: OrderStatus.COMPLETED,
      },
      orderBy: [{ orderedAt: 'desc' }, { id: 'desc' }],
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

  private async getCompletedOrders(
    range?: DashboardDateRange,
  ): Promise<number> {
    return this.prisma.order.count({
      where: {
        orderStatus: OrderStatus.COMPLETED,
        ...(range ? { orderedAt: range } : {}),
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
        co2SavedG: restaurant.orders
          .reduce(
            (total, order) => total.plus(order.co2SavedG),
            new Prisma.Decimal(0),
          )
          .toNumber(),
      }))
      .sort((a, b) => b.co2SavedG - a.co2SavedG);
  }

  private async getRevenueStats(range?: DashboardDateRange) {
    const result = await this.prisma.order.aggregate({
      where: {
        orderStatus: OrderStatus.COMPLETED,
        ...(range ? { orderedAt: range } : {}),
      },
      _sum: {
        totalAmount: true,
      },
      _avg: { totalAmount: true },
    });

    return {
      totalRevenue: result._sum.totalAmount?.toFixed(2) ?? '0.00',
      averageTicket: result._avg.totalAmount?.toNumber() ?? 0,
    };
  }

  private async getCo2Stats(range?: DashboardDateRange) {
    const result = await this.prisma.order.aggregate({
      where: {
        orderStatus: OrderStatus.COMPLETED,
        deliveryMethod: DeliveryMethod.BIKE,
        ...(range ? { orderedAt: range } : {}),
      },
      _sum: {
        co2SavedG: true,
      },
      _count: {
        _all: true,
      },
    });

    const co2SavedG = new Prisma.Decimal(result._sum.co2SavedG ?? 0);
    return {
      co2SavedG: co2SavedG.toNumber(),
      avgCo2SavedG:
        result._count._all === 0
          ? 0
          : co2SavedG.div(result._count._all).toNumber(),
    };
  }
}
