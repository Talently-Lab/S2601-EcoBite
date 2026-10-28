import { KpiSection } from '../components/pages/KpiSection';

export function AdminDashboard() {
    return (
        <div className="admin-dashboard stack">
            <header className="admin-dashboard-heading page-heading">
                <h1>Dashboard</h1>
                <p>Impacto y ventas de toda la plataforma</p>
            </header>

            <KpiSection />

            <section id="recent-orders" className="card card--panel admin-recent-orders" aria-labelledby="admin-orders-title">
                <h2 id="admin-orders-title">Últimos 5 pedidos</h2>
                <p className="admin-recent-orders-empty">Los pedidos aparecerán aquí cuando se conecten los datos.</p>
            </section>
        </div>
    );
}
