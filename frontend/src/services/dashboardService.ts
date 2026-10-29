import { ApiError, request } from './apiClient';
import { isRecord } from '../utils/isRecord';
import { centsToPrice, priceToCents } from '../utils/price';

export type DashboardStats = {
    completedOrders: number;
    totalRevenue: number;
    co2SavedG: number;
};

export type RecentOrder = {
    orderedAt: string;
    restaurant: string;
    totalAmount: number;
};

const STATS_PATH = '/dashboard/stats';
const RECENT_ORDERS_PATH = '/dashboard/recent-orders';

type DashboardStatsResponse = { completedOrders: number; totalRevenue: string; co2SavedG: number };
type RecentOrderResponse = { orderedAt: string; restaurant: string; totalAmount: string };
type FieldValidators<T> = { [K in keyof T]: (value: unknown) => value is T[K] };

function invalidResponse(path: string): ApiError {
    return new ApiError({ kind: 'invalid-response', path });
}

function isNonNegativeInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function hasValidFields<T extends object>(value: unknown, validators: FieldValidators<T>): value is T {
    if (!isRecord(value)) {
        return false;
    }

    for (const field in validators) {
        if (!validators[field](value[field])) {
            return false;
        }
    }

    return true;
}

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

const recentOrderValidators: FieldValidators<RecentOrderResponse> = {
    orderedAt: isString,
    restaurant: isString,
    totalAmount: isString,
};

const statsValidators: FieldValidators<DashboardStatsResponse> = {
    completedOrders: isNonNegativeInteger,
    totalRevenue: isString,
    co2SavedG: isNonNegativeInteger,
};

function parseRecentOrders(data: unknown): RecentOrder[] {
    if (!Array.isArray(data)) {
        throw invalidResponse(RECENT_ORDERS_PATH);
    }

    return data.map((order: unknown) => {
        if (!hasValidFields(order, recentOrderValidators)) {
            throw invalidResponse(RECENT_ORDERS_PATH);
        }

        const totalCents = priceToCents(order.totalAmount);
        if (totalCents === null) {
            throw invalidResponse(RECENT_ORDERS_PATH);
        }

        return {
            orderedAt: order.orderedAt,
            restaurant: order.restaurant.trim(),
            totalAmount: centsToPrice(totalCents),
        };
    });
}

function parseDashboardStats(data: unknown): DashboardStats {
    if (!hasValidFields(data, statsValidators)) {
        throw invalidResponse(STATS_PATH);
    }

    const revenueCents = priceToCents(data.totalRevenue);
    if (revenueCents === null) {
        throw invalidResponse(STATS_PATH);
    }

    return {
        completedOrders: data.completedOrders,
        totalRevenue: centsToPrice(revenueCents),
        co2SavedG: data.co2SavedG,
    };
}

export async function getDashboardStats(): Promise<DashboardStats> {
    return parseDashboardStats(await request(STATS_PATH));
}

export async function getRecentOrders(): Promise<RecentOrder[]> {
    return parseRecentOrders(await request(RECENT_ORDERS_PATH));
}
