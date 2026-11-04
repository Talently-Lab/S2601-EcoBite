import { Link } from 'react-router';
import { useImpact } from '../../context/ImpactContext';
import { formatCount, formatGrams } from '../../utils/kpiFormatters';

type ImpactCardProps = { variant: 'home' | 'detail' };

export function ImpactCard({ variant }: ImpactCardProps) {
    const { summary, status } = useImpact();

    if (status !== 'ready' || !summary) {
        const loading = status === 'loading';
        return <section className="card card--dark impact-card-main impact-card-feedback"
            role={loading ? 'status' : undefined} aria-label={loading ? 'Cargando impacto' : 'Tu impacto'}>
            {loading
                ? <span className="loading-spinner" aria-hidden="true" />
                : <p role="alert">No pudimos cargar tu impacto.</p>}
        </section>;
    }

    const isHome = variant === 'home';

    return (
        <section className={`impact-card impact-card--${variant}`} aria-label="Tu impacto">
            <div className="card card--dark impact-card-main">
                {isHome && <p className="impact-card-eyebrow">Tu impacto hasta hoy</p>}
                <span className="svg-icon" aria-hidden="true" />
                <p className="impact-value">{formatGrams(summary.totalCo2SavedG)}</p>
                <p className="impact-card-caption">
                    de CO₂ evitados{!isHome ? ' en total' : ''}
                </p>
                {isHome ? (
                    <Link className="impact-card-link" to="/impact" aria-label="Ver tu impacto">
                        <span aria-hidden="true">→</span>
                    </Link>
                ) : (
                    <p className="impact-card-explanation">
                        Lo calculamos pedido a pedido, según la distancia y el transporte de cada envío.
                    </p>
                )}
            </div>
            {!isHome && (
                <div className="card impact-card-orders">
                    <span className="svg-icon" aria-hidden="true" />
                    <p>{formatCount(summary.ordersWithImpact)} pedidos con impacto</p>
                </div>
            )}
        </section>
    );
}
