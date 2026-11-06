import { KpiSection } from '../components/pages/KpiSection';
import { RecentOrders, ImpactRanking } from '../components/pages/AdminTables';
import { SectionHeader } from '../components/shared/SectionHeader';

export function AdminDashboard() {
    return (
        <div className="admin-dashboard stack">
            <SectionHeader variant="h2" title="Dashboard" subtitle="Impacto y ventas de toda la plataforma" />

            <KpiSection />

            <RecentOrders />

            <ImpactRanking />
        </div>
    );
}
