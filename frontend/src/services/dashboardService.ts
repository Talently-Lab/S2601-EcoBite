import { ApiError, request } from './apiClient';
import { isRecord } from '../utils/isRecord';
import { centsToPrice, priceToCents } from '../utils/price';

export type DashboardStats = {
    completedOrders: number;
    totalRevenue: number;
    co2SavedG: number;
};

const invalidStatsResponse = new ApiError({ kind: 'invalid-response', path: '/dashboard/stats' });

function parseDashboardStats(data: unknown): DashboardStats {
    if (!isRecord(data)) {
        throw invalidStatsResponse;
    }

    const revenueCents = typeof data.totalRevenue === 'string' ? priceToCents(data.totalRevenue) : null;
    if (!Number.isSafeInteger(data.completedOrders) ||
        (data.completedOrders as number) < 0 ||
        revenueCents === null ||
        !Number.isSafeInteger(data.co2SavedG)) {
        throw invalidStatsResponse;
    }

    return {
        completedOrders: data.completedOrders as number,
        totalRevenue: centsToPrice(revenueCents),
        co2SavedG: data.co2SavedG as number,
    };
}

export async function getDashboardStats(): Promise<DashboardStats> {
    return parseDashboardStats(await request('/dashboard/stats'));
}
