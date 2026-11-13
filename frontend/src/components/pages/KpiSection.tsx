import { useRef, type ReactNode } from 'react';
import { useCountUp } from 'react-countup';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import type { DashboardStats } from '../../services/dashboardService';
import { formatCount, formatGrams } from '../../utils/kpiFormatters';
import { formatPrice } from '../../utils/price';

const COUNT_DURATION_SECONDS = 2.5;
const NEW_CHANGE_LABEL = 'Nuevo: sin actividad en el período anterior';
const PREVIOUS_PERIOD_LABEL = ' vs. el período anterior';
const CHANGE_DISPLAY: Record<number, { arrow: string; prefix: string }> = {
    [-1]: { arrow: '↓', prefix: '−' },
    0: { arrow: '→', prefix: '' },
    1: { arrow: '↑', prefix: '+' },
};
const VARIANT_CLASS = { impact: 'admin-kpi-card--impact card--dark', compact: 'admin-kpi-card--compact' };
const FEEDBACK = {
    loading: { role: 'status', label: 'Cargando indicadores', content: <span className="loading-spinner" aria-hidden="true" /> },
    error: { role: 'alert', label: undefined, content: 'No pudimos cargar los indicadores.' },
} as const;

type KpiCardConfig = {
    variant?: 'impact' | 'compact';
    label: string;
    value: number | null;
    format: (value: number) => string;
    icon?: ReactNode;
    detail?: ReactNode;
    change?: number | null;
};

function getKpiCards(stats: DashboardStats): KpiCardConfig[] {
    const comparison = stats.comparison;
    const periodStats = comparison?.current ?? stats;

    return [
        {
            variant: 'impact', label: 'CO₂ ahorrado', value: periodStats.co2SavedG,
            format: formatGrams,
            change: comparison?.percentageChange.co2SavedG,
            icon: <span className="svg-icon svg-icon--leaves" aria-hidden="true" />,
            detail: <>Acumulado desde el lanzamiento: <strong>{formatGrams(stats.co2SavedG)}</strong></>,
        },
        {
            label: 'Total recaudado', value: periodStats.totalRevenue,
            format: formatPrice,
            change: comparison?.percentageChange.totalRevenue,
            detail: <>Ticket promedio: <strong>{comparison ? formatPrice(comparison.current.averageTicket) : '—'}</strong></>,
        },
        {
            label: 'Pedidos completados', value: periodStats.completedOrders,
            format: formatCount,
            change: comparison?.percentageChange.completedOrders,
        },
        {
            variant: 'compact', label: 'CO₂ ahorrado por pedido sustentable',
            value: comparison?.current.avgCo2SavedG ?? null,
            format: formatGrams,
        },
        {
            variant: 'compact', label: 'Usuarios registrados', value: stats.registeredUsers ?? null,
            format: formatCount,
        },
    ];
}

function formatChangeMagnitude(change: number): string {
    const magnitude = Math.abs(change);
    return magnitude > 0 && magnitude < 1 ? '<1%' : `${formatCount(Math.round(magnitude))}%`;
}

function KpiChangeBadge({ change }: { change: number | null }) {
    const { arrow, prefix } = CHANGE_DISPLAY[Math.sign(change ?? 1)];
    const text = change === null ? NEW_CHANGE_LABEL : `${prefix}${formatChangeMagnitude(change)}${PREVIOUS_PERIOD_LABEL}`;

    return <span className="admin-kpi-change">
        <span aria-hidden="true">{arrow}</span>
        {text}
    </span>;
}

function AnimatedValue({ value, format }: Pick<KpiCardConfig, 'format'> & { value: number }) {
    const countRef = useRef<HTMLSpanElement>(null!);
    useCountUp({ ref: countRef, end: value, duration: COUNT_DURATION_SECONDS, formattingFn: format });

    return <>
        <span aria-hidden="true" ref={countRef} />
        <span className="sr-only">{format(value)}</span>
    </>;
}

function KpiValue({ value, format, reducedMotion }: Pick<KpiCardConfig, 'value' | 'format'> & { reducedMotion: boolean }) {
    if (value === null) return <span aria-label="Dato no disponible">—</span>;
    if (reducedMotion) return <span>{format(value)}</span>;
    return <AnimatedValue value={value} format={format} />;
}

export function KpiSection() {
    const { state, reducedMotion } = useDashboardStats();
    const feedback = state.status === 'ready' ? null : FEEDBACK[state.status];

    return (
        <section className="admin-kpis stack" aria-label="Indicadores principales" aria-busy={state.status === 'loading'}>
            {feedback && <div className="card card--panel admin-feedback" role={feedback.role} aria-label={feedback.label}>
                {feedback.content}
            </div>}
            {state.status === 'ready' && getKpiCards(state.stats).map(({ variant, label, value, format, icon, detail, change }) => (
                <article key={label} className={`card card--panel admin-kpi-card${variant ? ` ${VARIANT_CLASS[variant]}` : ''}`}>
                    <p className="admin-kpi-label">{icon}{label}</p>
                    <p className="admin-kpi-value">
                        <KpiValue value={value} format={format} reducedMotion={reducedMotion} />
                    </p>
                    {change !== undefined && <KpiChangeBadge change={change} />}
                    {detail && <p className="admin-kpi-detail">{detail}</p>}
                </article>
            ))}
        </section>
    );
}
