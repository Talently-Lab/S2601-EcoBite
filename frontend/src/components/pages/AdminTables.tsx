import { useEffect, useState, type ReactNode } from 'react';
import { LuCheck } from 'react-icons/lu';
import { GreenBadge } from '../shared/GreenBadge';
import { getRecentOrders, getImpactRanking } from '../../services/dashboardService';
import { formatOrderTimestamp } from '../../utils/dates';
import { formatPrice } from '../../utils/price';
import { formatGrams } from '../../utils/kpiFormatters';

type TableState<T> = { status: 'loading' | 'error' } | { status: 'ready'; items: T[] };

type AdminTableProps<T> = {
    id: string;
    title: ReactNode;
    className: string;
    tableClassName: string;
    fetcher: () => Promise<T[]>;
    headers: string[];
    getKey: (item: T, index: number) => string;
    renderCells: (item: T, index: number) => ReactNode;
};

function AdminTable<T>({ id, title, className, tableClassName, fetcher,
    headers, getKey, renderCells }: AdminTableProps<T>) {
    const [state, setState] = useState<TableState<T>>({ status: 'loading' });
    const feedbackClass = 'card card--panel admin-feedback';
    const titleId = `${id}-title`;

    useEffect(() => {
        let active = true;
        void fetcher().then(
            (items) => { if (active) setState({ status: 'ready', items }); },
            () => { if (active) setState({ status: 'error' }); },
        );
        return () => { active = false; };
    }, [fetcher]);

    return (
        <section id={id} className={className} aria-labelledby={titleId} aria-busy={state.status === 'loading'}>
            <h2 id={titleId}>{title}</h2>
            {state.status === 'loading' && (
                <div className={feedbackClass} role="status" aria-label="Cargando datos">
                    <span className="loading-spinner" aria-hidden="true" />
                </div>
            )}
            {state.status === 'error' && (
                <p className={feedbackClass} role="alert">No pudimos cargar los datos.</p>
            )}
            {state.status === 'ready' && (state.items.length === 0 ? (
                <p className={feedbackClass} role="status">Todavía no hay datos para mostrar.</p>
            ) : (
                <table className={tableClassName} aria-labelledby={titleId}>
                    <thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
                    <tbody>{state.items.map((item, index) => (
                        <tr key={getKey(item, index)}>{renderCells(item, index)}</tr>
                    ))}</tbody>
                </table>
            ))}
        </section>
    );
}

const getTopRanking = () => getImpactRanking().then((entries) => entries.slice(0, 5));

export function RecentOrders() {
    return (
        <AdminTable
            id="recent-orders"
            title="Últimos 5 pedidos"
            className="card card--panel admin-recent-orders"
            tableClassName="admin-orders-table"
            fetcher={getRecentOrders}
            headers={['Restaurante', 'Fecha', 'Total', 'Estado']}
            getKey={(order, index) => `${order.orderedAt}-${order.restaurant}-${index}`}
            renderCells={(order) => <>
                <td>{order.restaurant}</td>
                <td><time dateTime={order.orderedAt}>{formatOrderTimestamp(order.orderedAt)}</time></td>
                <td>{formatPrice(order.totalAmount)}</td>
                <td><GreenBadge icon={<LuCheck aria-hidden="true" />} text="Completado" variant="tag" /></td>
            </>}
        />
    );
}

export function ImpactRanking() {
    return (
        <AdminTable
            id="impact-ranking"
            title="Ranking de restaurantes"
            className="admin-impact-ranking"
            tableClassName="admin-ranking-table"
            fetcher={getTopRanking}
            headers={['#', 'Restaurante', 'CO₂ total ahorrado']}
            getKey={(entry, index) => `${entry.restaurant}-${index}`}
            renderCells={(entry, index) => <>
                <th scope="row">{index + 1}</th>
                <td>{entry.restaurant}</td>
                <td>{formatGrams(entry.co2SavedG)}</td>
            </>}
        />
    );
}
