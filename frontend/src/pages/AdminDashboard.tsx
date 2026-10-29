import { KpiSection } from '../components/pages/KpiSection';
import { RecentOrders } from '../components/pages/RecentOrders';

export function AdminDashboard() {
    return (
        <div className="admin-dashboard stack">
            <header className="page-heading page-heading--dashboard">
                <h1>Dashboard</h1>
                <p>Impacto y ventas de toda la plataforma</p>
            </header>

            <KpiSection />

            <RecentOrders />
        </div>
    );
}
