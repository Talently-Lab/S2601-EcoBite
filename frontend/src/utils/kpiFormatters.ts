import type { ReactNode } from 'react';
import type { DashboardStats } from '../services/dashboardService';
import { LOCALE } from '../constants/constants';

export type KpiState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; stats: DashboardStats };

export type KpiCardConfig = {
    variant?: 'impact' | 'compact';
    label: string;
    value: number | null;
    format: (value: number) => string;
    icon?: ReactNode;
    detail?: ReactNode;
};

const GRAMS_PER_KG = 1000;

function createFormatter(options?: Intl.NumberFormatOptions): (value: number) => string {
    return new Intl.NumberFormat(LOCALE, options).format;
}

export const formatCount = createFormatter();
const gramFormatter = createFormatter({ maximumFractionDigits: 0 });
const kilogramFormatter = createFormatter({ minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatGrams = (grams: number): string => Math.round(grams) < GRAMS_PER_KG
    ? `${gramFormatter(grams)}g`
    : `${kilogramFormatter(grams / GRAMS_PER_KG)} kg`;
