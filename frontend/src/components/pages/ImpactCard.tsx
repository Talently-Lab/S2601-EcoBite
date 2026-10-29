import { Link } from 'react-router';
import { formatCount, formatGrams } from '../../utils/kpiFormatters';

type ImpactCardProps =
    | { variant: 'home'; co2SavedG: number }
    | { variant: 'detail'; co2SavedG: number; impactedOrders: number };

export function ImpactCard(props: ImpactCardProps) {
    const isHome = props.variant === 'home';

    return (
        <section className={`impact-card impact-card--${props.variant}`} aria-label="Tu impacto">
            <div className="card card--dark impact-card-main">
                {isHome && <p className="impact-card-eyebrow">Tu impacto hasta hoy</p>}
                <span className="svg-icon" aria-hidden="true" />
                <p className="impact-value">{formatGrams(props.co2SavedG)}</p>
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
                    <p>{formatCount(props.impactedOrders)} pedidos con impacto</p>
                </div>
            )}
        </section>
    );
}
