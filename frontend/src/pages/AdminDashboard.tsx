import { LuLeaf } from 'react-icons/lu';
import type { IconType } from 'react-icons';

type AdminKpi = {
    id: string;
    label: string;
    tone: 'impact' | 'default';
    icon?: IconType;
    value?: string | number;
};

const kpis: AdminKpi[] = [
    { id: 'co2-saved', label: 'CO₂ ahorrado', tone: 'impact', icon: LuLeaf },
    { id: 'revenue', label: 'Total recaudado', tone: 'default' },
    { id: 'completed-orders', label: 'Pedidos completados', tone: 'default' },
];

function AdminKpiCard({ label, tone, icon: Icon, value }: Omit<AdminKpi, 'id'>) {
    return (
        <article className={`admin-kpi-card admin-kpi-card--${tone}`}>
            <h2>{Icon && <Icon aria-hidden="true" />}{label}</h2>
            <p className="admin-kpi-empty">{value ?? 'Sin datos todavía'}</p>
            {value === undefined && <p className="admin-kpi-caption">Se mostrarán al conectar las estadísticas.</p>}
        </article>
    );
}

export function AdminDashboard() {
    return (
        <div className="admin-dashboard">
            <header className="admin-dashboard-heading">
                <h1>Dashboard</h1>
                <p>Impacto y ventas de toda la plataforma</p>
            </header>

            <section className="admin-kpis" aria-label="Indicadores principales">
                {kpis.map(({ id, ...kpi }) => <AdminKpiCard key={id} {...kpi} />)}
            </section>

            <section id="recent-orders" className="admin-recent-orders" aria-labelledby="admin-orders-title">
                <h2 id="admin-orders-title">Últimos 5 pedidos</h2>
                <p className="admin-recent-orders-empty">Los pedidos aparecerán aquí cuando se conecten los datos.</p>
            </section>
        </div>
    );
}
