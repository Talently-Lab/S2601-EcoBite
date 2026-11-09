import { useRef } from 'react';
import { useCountUp } from 'react-countup';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import type { DashboardStats } from '../../services/dashboardService';
import { formatCount, formatGrams, type KpiCardConfig } from '../../utils/kpiFormatters';
import { formatPrice } from '../../utils/price';

const COUNT_DURATION_SECONDS = 2.5;
const VARIANT_CLASS = { impact: 'admin-kpi-card--impact card--dark', compact: 'admin-kpi-card--compact' };
const FEEDBACK = {
    loading: { role: 'status', label: 'Cargando indicadores', content: <span className="loading-spinner" aria-hidden="true" /> },
    error: { role: 'alert', label: undefined, content: 'No pudimos cargar los indicadores.' },
} as const;

function getKpiCards(stats: DashboardStats): KpiCardConfig[] {
    const periodStats = stats.comparison?.current ?? stats;

    return [
        {
            variant: 'impact', label: 'CO₂ ahorrado', value: periodStats.co2SavedG,
            format: formatGrams,
            icon: <span className="svg-icon svg-icon--leaves" aria-hidden="true" />,
            detail: <>Acumulado desde el lanzamiento: <strong>{formatGrams(stats.co2SavedG)}</strong></>,
        },
        {
            label: 'Total recaudado', value: periodStats.totalRevenue,
            format: formatPrice,
            detail: <>Ticket promedio: <strong>{stats.comparison ? formatPrice(stats.comparison.current.averageTicket) : '—'}</strong></>,
        },
        {
            label: 'Pedidos completados', value: periodStats.completedOrders,
            format: formatCount,
        },
        {
            variant: 'compact', label: 'CO₂ ahorrado por pedido sustentable',
            value: stats.comparison?.current.avgCo2SavedG ?? null,
            format: formatGrams,
        },
        {
            variant: 'compact', label: 'Usuarios registrados', value: stats.registeredUsers ?? null,
            format: formatCount,
        },
    ];
}

function AnimatedValue({ value, format }: Pick<KpiCardConfig, 'format'> & { value: number }) {
    const countRef = useRef<HTMLSpanElement>(null!);
    useCountUp({ ref: countRef, end: value, duration: COUNT_DURATION_SECONDS, formattingFn: format });

    return <>
        <span aria-hidden="true" ref={countRef} />
        <span className="sr-only">{format(value)}</span>
    </>;
}

export function KpiSection() {
    const { state, reducedMotion } = useDashboardStats();
    const feedback = state.status === 'ready' ? null : FEEDBACK[state.status];

    return (
        <section className="admin-kpis stack" aria-label="Indicadores principales" aria-busy={state.status === 'loading'}>
            {feedback && <div className="card card--panel admin-feedback" role={feedback.role} aria-label={feedback.label}>
                {feedback.content}
            </div>}
            {state.status === 'ready' && getKpiCards(state.stats).map(({ variant, label, value, format, icon, detail }) => (
                <article key={label} className={`card card--panel admin-kpi-card${variant ? ` ${VARIANT_CLASS[variant]}` : ''}`}>
                    <p className="admin-kpi-label">{icon}{label}</p>
                    <p className="admin-kpi-value">
                        {value === null ? <span aria-label="Dato no disponible">—</span>
                            : reducedMotion ? <span>{format(value)}</span>
                                : <AnimatedValue value={value} format={format} />}
                    </p>
                    {detail && <p className="admin-kpi-detail">{detail}</p>}
                </article>
            ))}
        </section>
    );
}
