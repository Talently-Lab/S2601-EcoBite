import { useEffect, useState, useSyncExternalStore } from 'react';
import type { KpiState } from '../utils/kpiFormatters';
import { getDashboardStats } from '../services/dashboardService';

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
        let attempts = 0;
        let retryTimer: number | undefined;

        async function loadStats() {
            const attempt = ++attempts;
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
                    retryTimer = undefined;
                    void loadStats();
                }, attempt * RETRY_DELAY_MS);
            }
        }

        void loadStats();
        return () => {
            active = false;
            if (retryTimer !== undefined) window.clearTimeout(retryTimer);
        };
    }, []);

    return { state, reducedMotion };
}
