import { useEffect, useState } from 'react';
import { LuCheck } from 'react-icons/lu';
import { GreenBadge } from '../shared/GreenBadge';
import { getRecentOrders, type RecentOrder } from '../../services/dashboardService';
import { formatOrderTimestamp } from '../../utils/dates';
import { formatPrice } from '../../utils/price';

type RecentOrdersState =
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'ready'; orders: RecentOrder[] };

export function RecentOrders() {
    const [state, setState] = useState<RecentOrdersState>({ status: 'loading' });

    useEffect(() => {
        let active = true;

        void getRecentOrders().then(
            (orders) => { if (active) setState({ status: 'ready', orders }); },
            () => { if (active) setState({ status: 'error' }); },
        );

        return () => { active = false; };
    }, []);

    return (
        <section id="recent-orders" className="card card--panel admin-recent-orders" aria-labelledby="admin-orders-title" aria-busy={state.status === 'loading'}>
            <h2 id="admin-orders-title">Últimos 5 pedidos</h2>

            {state.status === 'loading' && (
                <div className="card card--panel admin-recent-orders-feedback" role="status" aria-label="Cargando pedidos">
                    <span className="loading-spinner" aria-hidden="true" />
                </div>
            )}
            {state.status === 'error' && (
                <p className="card card--panel admin-recent-orders-feedback" role="alert">No pudimos cargar los pedidos.</p>
            )}
            {state.status === 'ready' && (state.orders.length === 0 ? (
                <p className="card card--panel admin-recent-orders-feedback" role="status">Todavía no hay pedidos para mostrar.</p>
            ) : (
                <table className="admin-orders-table" aria-labelledby="admin-orders-title">
                    <thead>
                        <tr>
                            <th scope="col">Fecha</th>
                            <th scope="col">Restaurante</th>
                            <th scope="col">Total</th>
                            <th scope="col">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {state.orders.map((order, index) => (
                            <tr key={`${order.orderedAt}-${order.restaurant}-${index}`}>
                                <td><time dateTime={order.orderedAt}>{formatOrderTimestamp(order.orderedAt)}</time></td>
                                <td>{order.restaurant}</td>
                                <td>{formatPrice(order.totalAmount)}</td>
                                <td><GreenBadge icon={<LuCheck aria-hidden="true" />} text="Completado" variant="tag" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ))}
        </section>
    );
}
