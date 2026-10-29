import type { ReactNode } from 'react';
import type { DashboardStats } from '../services/dashboardService';
import { LOCALE } from '../constants/constants';

export type KpiState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; stats: DashboardStats };

export type KpiCardConfig = {
    label: string;
    value: number;
    format: (value: number) => string;
    decimals?: number;
    icon?: ReactNode;
    tone?: 'impact' | 'default';
};

export type KpiCardProps = KpiCardConfig & { reducedMotion: boolean };

const GRAMS_PER_KG = 1000;

function createFormatter(options?: Intl.NumberFormatOptions): (value: number) => string {
    return new Intl.NumberFormat(LOCALE, options).format;
}

export const formatCount = createFormatter();
const formatGramsNumber = createFormatter({ maximumFractionDigits: 0 });
const formatKilogramsNumber = createFormatter({ minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatGrams = (grams: number): string => grams < GRAMS_PER_KG
    ? `${formatGramsNumber(grams)} g`
    : `${formatKilogramsNumber(grams / GRAMS_PER_KG)} kg`;
