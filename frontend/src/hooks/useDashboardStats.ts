import { useEffect, useState, useSyncExternalStore } from 'react';
import { getDashboardStats, type DashboardStats } from '../services/dashboardService';

type KpiState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; stats: DashboardStats };

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 500;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void): () => void {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
}

function getReducedMotion(): boolean {
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function useDashboardStats() {
    const [state, setState] = useState<KpiState>({ status: 'loading' });
    const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, getReducedMotion, () => true);

    useEffect(() => {
        let active = true;
        let retryTimer: number | undefined;

        async function loadStats(attempt = 1) {
            try {
                const stats = await getDashboardStats();
                if (active) setState({ status: 'ready', stats });
            } catch {
                if (!active) return;
                if (attempt === MAX_ATTEMPTS) {
                    setState({ status: 'error' });
                    return;
                }
                retryTimer = window.setTimeout(() => {
                    void loadStats(attempt + 1);
                }, attempt * RETRY_DELAY_MS);
            }
        }

        void loadStats();
        return () => {
            active = false;
            window.clearTimeout(retryTimer);
        };
    }, []);

    return { state, reducedMotion };
}
