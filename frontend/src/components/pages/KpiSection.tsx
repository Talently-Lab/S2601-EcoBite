import { useRef } from 'react';
import { useCountUp } from 'react-countup';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import type { DashboardStats } from '../../services/dashboardService';
import { countFormatter, kgFormatter, type KpiCardConfig, type KpiCardProps } from '../../utils/kpiFormatters';
import { formatPrice } from '../../utils/price';

const COUNT_DURATION_SECONDS = 2.5;
const KPI_CARD_CLASSES = {
    default: 'card card--panel admin-kpi-card',
    impact: 'card card--panel card--dark admin-kpi-card admin-kpi-card--impact',
} as const;

function getKpiCards(stats: DashboardStats): KpiCardConfig[] {
    const co2SavedKg = stats.co2SavedG / 1000;

    return [
        {
            label: 'CO₂ ahorrado', value: co2SavedKg, format: kgFormatter.format,
            decimals: 1, suffix: ' kg', icon: <span className="svg-icon" aria-hidden="true" />, tone: 'impact',
        },
        {
            label: 'Total recaudado', value: stats.totalRevenue, format: formatPrice,
        },
        {
            label: 'Pedidos completados', value: stats.completedOrders, format: countFormatter.format,
        },
    ];
}

function AnimatedValue({ value, format, decimals = 0 }: Pick<KpiCardConfig, 'value' | 'format' | 'decimals'>) {
    const countRef = useRef<HTMLSpanElement>(null!);
    useCountUp({ ref: countRef, end: value, duration: COUNT_DURATION_SECONDS, decimals, formattingFn: format });

    return <span ref={countRef} />;
}

function KpiCard({ label, value, format, decimals = 0, suffix = '', icon, tone = 'default', reducedMotion }: KpiCardProps) {
    return (
        <article className={KPI_CARD_CLASSES[tone]}>
            <h2>{icon}{label}</h2>
            <p className={tone === 'impact' ? 'impact-value' : 'admin-kpi-value'}>
                <span aria-hidden="true">
                    {reducedMotion ? format(value) : (
                        <AnimatedValue value={value} decimals={decimals} format={format} />
                    )}
                    {suffix}
                </span>
                <span className="sr-only">{format(value)}{suffix}</span>
            </p>
        </article>
    );
}

export function KpiSection() {
    const { state, reducedMotion } = useDashboardStats();

    return (
        <section className="admin-kpis stack" aria-label="Indicadores principales" aria-busy={state.status === 'loading'}>
            {state.status === 'loading' && (
                <div className="card card--panel admin-kpi-feedback" role="status" aria-label="Cargando indicadores">
                    <span className="loading-spinner" aria-hidden="true" />
                </div>
            )}
            {state.status === 'error' && (
                <div className="card card--panel admin-kpi-feedback" role="alert">No pudimos cargar los indicadores.</div>
            )}
            {state.status === 'ready' && getKpiCards(state.stats).map((card) => (
                <KpiCard key={card.label} {...card} reducedMotion={reducedMotion} />
            ))}
        </section>
    );
}
