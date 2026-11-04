import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { request } from '../services/apiClient';
import { useCart } from './CartContext';
import { ImpactContext, type ImpactContextValue } from './ImpactContext';

export function ImpactProvider({ children }: { children: ReactNode }) {
    const { createdOrder } = useCart();
    const [summary, setSummary] = useState<ImpactContextValue['summary']>(null);
    const [status, setStatus] = useState<ImpactContextValue['status']>('loading');
    const revision = useRef(0);

    const loadImpact = useCallback(() => {
        const requestRevision = ++revision.current;
        return (request('/orders/me/impact') as Promise<NonNullable<ImpactContextValue['summary']>>).then((impact) => {
            if (requestRevision !== revision.current) return;
            setSummary(impact);
            setStatus('ready');
        }).catch(() => {
            if (requestRevision === revision.current) setStatus('error');
        });
    }, []);

    const refresh = useCallback(async () => {
        setStatus('loading');
        await loadImpact();
    }, [loadImpact]);

    useEffect(() => {
        void loadImpact();
        const currentRevision = revision;
        return () => { currentRevision.current++; };
    }, [loadImpact]);

    useEffect(() => {
        if (createdOrder) void loadImpact();
    }, [createdOrder, loadImpact]);

    const value = useMemo(() => ({ summary, status, refresh }), [summary, status, refresh]);
    return <ImpactContext value={value}>{children}</ImpactContext>;
}
