import type { ReactNode } from 'react';
import type { DashboardStats } from '../services/dashboardService';

export type KpiState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; stats: DashboardStats };

export type KpiCardConfig = {
    label: string;
    value: number;
    format: (value: number) => string;
    decimals?: number;
    suffix?: string;
    icon?: ReactNode;
    tone?: 'impact' | 'default';
};

export type KpiCardProps = KpiCardConfig & { reducedMotion: boolean };

export const kgFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 });
export const countFormatter = new Intl.NumberFormat('es-AR');
