import { useRef } from 'react';
import { useCountUp } from 'react-countup';
import { LuLeaf } from 'react-icons/lu';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import type { DashboardStats } from '../../services/dashboardService';
import { countFormatter, kgFormatter, revenueFormatter, type KpiCardConfig, type KpiCardProps } from '../../utils/kpiFormatters';

const COUNT_DURATION_SECONDS = 2.5;

function getKpiCards(stats: DashboardStats): KpiCardConfig[] {
    const co2SavedKg = stats.co2SavedG / 1000;

    return [
        {
            label: 'CO₂ ahorrado', value: co2SavedKg, format: kgFormatter.format,
            decimals: 3, suffix: ' kg', icon: <LuLeaf aria-hidden="true" />, tone: 'impact',
        },
        {
            label: 'Total recaudado', value: stats.totalRevenue, format: revenueFormatter.format,
            decimals: 2,
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
        <article className={`admin-kpi-card admin-kpi-card--${tone}`}>
            <h2>{icon}{label}</h2>
            <p className="admin-kpi-value">
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
        <section className="admin-kpis" aria-label="Indicadores principales" aria-busy={state.status === 'loading'}>
            {state.status === 'loading' && (
                <div className="admin-kpi-feedback" role="status" aria-label="Cargando indicadores">
                    <span className="loading-spinner" aria-hidden="true" />
                </div>
            )}
            {state.status === 'error' && (
                <div className="admin-kpi-feedback" role="alert">No pudimos cargar los indicadores.</div>
            )}
            {state.status === 'ready' && getKpiCards(state.stats).map((card) => (
                <KpiCard key={card.label} {...card} reducedMotion={reducedMotion} />
            ))}
        </section>
    );
}
