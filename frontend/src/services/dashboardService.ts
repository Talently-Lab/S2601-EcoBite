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
};

type DashboardKpiChange = {
    completedOrders: number | null;
    totalRevenue: number | null;
    co2SavedG: number | null;
};

export type DashboardStats = HistoricalDashboardStats & {
    comparison?: { current: DashboardPeriodStats; percentageChange: DashboardKpiChange };
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

type WithStringPrice<T, K extends keyof T> = Omit<T, K> & Record<K, string>;
type StatsValuesResponse = WithStringPrice<HistoricalDashboardStats, 'totalRevenue'>;
type PeriodStatsResponse = WithStringPrice<DashboardPeriodStats, 'totalRevenue'>;
type RecentOrderResponse = WithStringPrice<RecentOrder, 'totalAmount'>;
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

const impactRankingValidators: FieldValidators<ImpactRankingEntry> = {
    restaurant: isString,
    co2SavedG: isSafeInteger,
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
};

const isPercentageChange = (value: unknown): value is number | null =>
    value === null || isFiniteNumber(value);

const percentageChangeValidators: FieldValidators<DashboardKpiChange> = {
    completedOrders: isPercentageChange,
    totalRevenue: isPercentageChange,
    co2SavedG: isPercentageChange,
};

function normalizePrice(value: string, path: string): number {
    const cents = priceToCents(value);
    if (cents === null) throw invalidResponse(path);
    return centsToPrice(cents);
}

function parseList<T extends object>(data: unknown, path: string, validators: FieldValidators<T>): T[] {
    if (!Array.isArray(data) || !data.every((item: unknown) => hasValidFields(item, validators))) {
        throw invalidResponse(path);
    }
    return data;
}

function parseRecentOrders(data: unknown): RecentOrder[] {
    return parseList(data, RECENT_ORDERS_PATH, recentOrderValidators).map((order) => {
        return {
            ...order,
            restaurant: order.restaurant.trim(),
            totalAmount: normalizePrice(order.totalAmount, RECENT_ORDERS_PATH),
        };
    });
}

function parseComparison(value: unknown): DashboardStats['comparison'] {
    if (value === undefined) return undefined;
    if (!isRecord(value)
        || !hasValidFields(value.current, periodStatsValidators)
        || !hasValidFields(value.percentageChange, percentageChangeValidators)) {
        throw invalidResponse(STATS_PATH);
    }

    return {
        current: { ...value.current, totalRevenue: normalizePrice(value.current.totalRevenue, STATS_PATH) },
        percentageChange: value.percentageChange,
    };
}

function parseDashboardStats(data: unknown): DashboardStats {
    if (!hasValidFields(data, statsValidators)) throw invalidResponse(STATS_PATH);
    const { comparison, registeredUsers, ...stats }: StatsValuesResponse & { comparison?: unknown; registeredUsers?: unknown } = data;
    if (registeredUsers !== undefined && !isSafeInteger(registeredUsers)) {
        throw invalidResponse(STATS_PATH);
    }

    return {
        ...stats,
        totalRevenue: normalizePrice(stats.totalRevenue, STATS_PATH),
        comparison: parseComparison(comparison),
        registeredUsers,
    };
}

export const getDashboardStats = async (): Promise<DashboardStats> => parseDashboardStats(await request(STATS_PATH));

export const getRecentOrders = async (): Promise<RecentOrder[]> => parseRecentOrders(await request(RECENT_ORDERS_PATH));

export const getImpactRanking = async (): Promise<ImpactRankingEntry[]> =>
    parseList(await request(IMPACT_RANKING_PATH), IMPACT_RANKING_PATH, impactRankingValidators);
