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

export type ImpactRankingEntry = {
    restaurant: string;
    co2SavedG: number;
};

const STATS_PATH = '/dashboard/stats';
const RECENT_ORDERS_PATH = '/dashboard/recent-orders';
const IMPACT_RANKING_PATH = '/dashboard/impact-ranking';

type DashboardStatsResponse = Omit<DashboardStats, 'totalRevenue'> & { totalRevenue: string };
type RecentOrderResponse = Omit<RecentOrder, 'totalAmount'> & { totalAmount: string };
type FieldValidators<T> = { [K in keyof T]: (value: unknown) => value is T[K] };

function invalidResponse(path: string): ApiError {
    return new ApiError({ kind: 'invalid-response', path });
}

function isNonNegativeInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isString(value: unknown): value is string {
    return typeof value === 'string';
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

function normalizePrice(value: string, path: string): number {
    const cents = priceToCents(value);
    if (cents === null) throw invalidResponse(path);
    return centsToPrice(cents);
}

function parseRecentOrders(data: unknown): RecentOrder[] {
    if (!Array.isArray(data)) {
        throw invalidResponse(RECENT_ORDERS_PATH);
    }

    return data.map((order: unknown) => {
        if (!hasValidFields(order, recentOrderValidators)) {
            throw invalidResponse(RECENT_ORDERS_PATH);
        }

        return {
            orderedAt: order.orderedAt,
            restaurant: order.restaurant.trim(),
            totalAmount: normalizePrice(order.totalAmount, RECENT_ORDERS_PATH),
        };
    });
}

function parseDashboardStats(data: unknown): DashboardStats {
    if (!hasValidFields(data, statsValidators)) {
        throw invalidResponse(STATS_PATH);
    }

    return {
        completedOrders: data.completedOrders,
        totalRevenue: normalizePrice(data.totalRevenue, STATS_PATH),
        co2SavedG: data.co2SavedG,
    };
}

export async function getDashboardStats(): Promise<DashboardStats> {
    return parseDashboardStats(await request(STATS_PATH));
}

export async function getRecentOrders(): Promise<RecentOrder[]> {
    return parseRecentOrders(await request(RECENT_ORDERS_PATH));
}

export async function getImpactRanking(): Promise<ImpactRankingEntry[]> {
    return request(IMPACT_RANKING_PATH) as Promise<ImpactRankingEntry[]>;
}
