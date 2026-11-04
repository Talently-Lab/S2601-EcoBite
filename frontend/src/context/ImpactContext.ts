import { createContext, useContext } from 'react';

export type ImpactContextValue = {
    summary: { totalCo2SavedG: number; ordersWithImpact: number } | null;
    status: 'loading' | 'error' | 'ready';
    refresh: () => Promise<void>;
};

export const ImpactContext = createContext<ImpactContextValue | null>(null);

export function useImpact() {
    const context = useContext(ImpactContext);
    if (!context) throw new Error('useImpact debe usarse dentro de ImpactProvider.');
    return context;
}
