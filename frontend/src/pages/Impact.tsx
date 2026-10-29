import { LuImage } from 'react-icons/lu';
import { ImpactCard } from '../components/pages/ImpactCard';
import { PageHeader } from '../components/core/PageHeader';
import { impactMock } from '../mocks/impact';
import { formatOrderDate } from '../utils/dates';
import { formatPrice } from '../utils/price';
import { formatGrams } from '../utils/kpiFormatters';

export function Impact() {
    return (
        <div className="page impact-page stack">
            <PageHeader backTo="/" backLabel="Volver al inicio" />
            <header className="impact-page-heading page-heading">
                <h1>Tu impacto</h1>
                <p>Desde que empezaste a pedir</p>
            </header>
            <ImpactCard variant="detail" co2SavedG={impactMock.co2SavedG} impactedOrders={impactMock.impactedOrders} />
            <section className="impact-orders stack" aria-labelledby="impact-orders-title">
                <h2 id="impact-orders-title">Tus pedidos</h2>
                <ul className="impact-orders-list stack">
                    {impactMock.recentOrders.map((order) => (
                        <li className="impact-order" key={order.id}>
                            <span className="impact-order-image" aria-hidden="true"><LuImage /></span>
                            <span className="impact-order-info stack">
                                <strong>{order.restaurantName}</strong>
                                <span>{formatOrderDate(order.date)}</span>
                            </span>
                            <span className="impact-order-price">{formatPrice(order.totalAmount)}</span>
                            <span className="impact-order-co2">+ {formatGrams(order.co2SavedG)} de CO₂</span>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
