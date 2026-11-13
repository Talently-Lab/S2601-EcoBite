import { type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '../core/Button';
import { useImpact } from '../../context/ImpactContext';
import { formatCount, formatGrams } from '../../utils/kpiFormatters';

type ImpactCardProps = { variant: 'home' | 'detail' };

const variantContent = {
    home: {
        emptyTitle: <h2 className="impact-card-empty-title">
            Tu impacto comienza <span>con tu primer pedido</span>
        </h2>,
        emptyText: 'Cada pedido evita CO₂ y envases de plástico. Acá vas a ver cuánto sumás.',
        emptyIcon: true,
        eyebrow: 'Tu impacto hasta hoy',
        caption: 'de CO₂ evitados',
        footer: <Link className="impact-card-link" to="/impact" aria-label="Ver tu impacto">
            <span aria-hidden="true">→</span>
        </Link>,
        showOrders: false,
    },
    detail: {
        emptyTitle: <h3 className="impact-card-empty-title">Todavía no hay impacto para mostrar</h3>,
        emptyText: 'Con tu primer pedido empezás a sumar.',
        emptyIcon: false,
        eyebrow: null,
        caption: 'de CO₂ evitados en total',
        footer: <p className="impact-card-explanation">
            Lo calculamos pedido a pedido, según la distancia y el transporte de cada envío.
        </p>,
        showOrders: true,
    },
} as const;

const feedbackContent = {
    loading: {
        role: 'status',
        label: 'Cargando impacto',
        content: <span className="loading-spinner" aria-hidden="true" />,
    },
    error: {
        role: undefined,
        label: 'Tu impacto',
        content: <p role="alert">No pudimos cargar tu impacto.</p>,
    },
} as const;

const feedbackStatus = {
    loading: 'loading',
    error: 'error',
    ready: 'error',
} as const;

function ImpactCardShell({ variant, modifier = '', children, secondary }: ImpactCardProps & {
    modifier?: string;
    children: ReactNode;
    secondary?: ReactNode;
}) {
    return <section className={`impact-card impact-card--${variant}${modifier}`} aria-label="Tu impacto">
        <div className="card card--dark impact-card-main">{children}</div>
        {secondary}
    </section>;
}

export function ImpactCard({ variant }: ImpactCardProps) {
    const { summary, status } = useImpact();

    if (status !== 'ready' || !summary) {
        const feedback = feedbackContent[feedbackStatus[status]];
        return <section className="card card--dark impact-card impact-card-main"
            role={feedback.role} aria-label={feedback.label}>
            {feedback.content}
        </section>;
    }

    const content = variantContent[variant];
    const isEmpty = summary.ordersWithImpact === 0 || summary.totalCo2SavedG === 0;

    if (isEmpty) {
        return <ImpactCardShell variant={variant} modifier=" impact-card--empty">
            {content.emptyIcon && <span className="svg-icon svg-icon--leaves" aria-hidden="true" />}
            {content.emptyTitle}
            <div className="impact-card-empty-action">
                <p>{content.emptyText}</p>
                <Button to="/restaurants">Hacer mi primer pedido</Button>
            </div>
        </ImpactCardShell>;
    }

    return <ImpactCardShell variant={variant} secondary={content.showOrders && <div className="card impact-card-orders">
        <span className="svg-icon" aria-hidden="true" />
        <p>{formatCount(summary.ordersWithImpact)} pedidos con impacto</p>
    </div>}>
        {content.eyebrow && <p className="impact-card-eyebrow">{content.eyebrow}</p>}
        <span className="svg-icon svg-icon--leaves" aria-hidden="true" />
        <p className="impact-value">{formatGrams(summary.totalCo2SavedG)}</p>
        <p className="impact-card-caption">{content.caption}</p>
        {content.footer}
    </ImpactCardShell>;
}
