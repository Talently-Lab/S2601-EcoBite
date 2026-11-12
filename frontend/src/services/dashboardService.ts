import { ApiError, request } from './apiClient';
import { isRecord } from '../utils/isRecord';
import { centsToPrice, priceToCents } from '../utils/price';

type HistoricalDashboardStats = {
    completedOrders: number;
    totalRevenue: number;
    co2SavedG: number;
};

type DashboardPeriodStats = HistoricalDashboardStats & {
    averageTicket: number;
    avgCo2SavedG: number;
    registeredUsers: number;
};

export type DashboardStats = HistoricalDashboardStats & {
    comparison?: { current: DashboardPeriodStats };
    registeredUsers?: number;
};

export type RecentOrder = {
    orderedAt: string;
    restaurant: string;
    totalAmount: number;
};

type ImpactRankingEntry = {
    restaurant: string;
    co2SavedG: number;
};

const STATS_PATH = '/dashboard/stats';
const RECENT_ORDERS_PATH = '/dashboard/recent-orders';
const IMPACT_RANKING_PATH = '/dashboard/impact-ranking';

type StatsValuesResponse = Omit<HistoricalDashboardStats, 'totalRevenue'> & { totalRevenue: string };
type PeriodStatsResponse = Omit<DashboardPeriodStats, 'totalRevenue'> & { totalRevenue: string };
type RecentOrderResponse = Omit<RecentOrder, 'totalAmount'> & { totalAmount: string };
type FieldValidators<T> = { [K in keyof T]: (value: unknown) => value is T[K] };

function invalidResponse(path: string): ApiError {
    return new ApiError({ kind: 'invalid-response', path });
}

const isSafeInteger = (value: unknown): value is number =>
    typeof value === 'number' && Number.isSafeInteger(value);

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);

const isString = (value: unknown): value is string => typeof value === 'string';

function hasValidFields<T extends object>(value: unknown, validators: FieldValidators<T>): value is T {
    if (!isRecord(value)) return false;

    for (const field in validators) {
        if (!validators[field](value[field])) return false;
    }

    return true;
}

const recentOrderValidators: FieldValidators<RecentOrderResponse> = {
    orderedAt: isString,
    restaurant: isString,
    totalAmount: isString,
};

const statsValidators: FieldValidators<StatsValuesResponse> = {
    completedOrders: isSafeInteger,
    totalRevenue: isString,
    co2SavedG: isSafeInteger,
};

const periodStatsValidators: FieldValidators<PeriodStatsResponse> = {
    ...statsValidators,
    averageTicket: isFiniteNumber,
    avgCo2SavedG: isFiniteNumber,
    registeredUsers: isSafeInteger,
};

function normalizePrice(value: string, path: string): number {
    const cents = priceToCents(value);
    if (cents === null) throw invalidResponse(path);
    return centsToPrice(cents);
}

function parseRecentOrders(data: unknown): RecentOrder[] {
    if (!Array.isArray(data)) throw invalidResponse(RECENT_ORDERS_PATH);

    return data.map((order: unknown) => {
        if (!hasValidFields(order, recentOrderValidators)) throw invalidResponse(RECENT_ORDERS_PATH);

        return {
            ...order,
            restaurant: order.restaurant.trim(),
            totalAmount: normalizePrice(order.totalAmount, RECENT_ORDERS_PATH),
        };
    });
}

function parseDashboardStats(data: unknown): DashboardStats {
    if (!hasValidFields(data, statsValidators)) throw invalidResponse(STATS_PATH);
    const response: StatsValuesResponse & { comparison?: unknown; registeredUsers?: unknown } = data;
    const { comparison, registeredUsers, ...stats } = response;
    const current = comparison === undefined ? undefined
        : isRecord(comparison) && hasValidFields(comparison.current, periodStatsValidators)
            ? comparison.current : null;
    if (current === null || (registeredUsers !== undefined && !isSafeInteger(registeredUsers))) {
        throw invalidResponse(STATS_PATH);
    }

    return {
        ...stats,
        totalRevenue: normalizePrice(stats.totalRevenue, STATS_PATH),
        ...(current && { comparison: { current: { ...current, totalRevenue: normalizePrice(current.totalRevenue, STATS_PATH) } } }),
        ...(isSafeInteger(registeredUsers) && { registeredUsers }),
    };
}

export const getDashboardStats = async (): Promise<DashboardStats> => parseDashboardStats(await request(STATS_PATH));

export const getRecentOrders = async (): Promise<RecentOrder[]> => parseRecentOrders(await request(RECENT_ORDERS_PATH));

export const getImpactRanking = async (): Promise<ImpactRankingEntry[]> =>
    request(IMPACT_RANKING_PATH) as Promise<ImpactRankingEntry[]>;
