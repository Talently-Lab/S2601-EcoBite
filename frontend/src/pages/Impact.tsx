import { ImpactCard } from '../components/pages/ImpactCard';
import { PageHeader } from '../components/core/PageHeader';
import { Breadcrumbs } from '../components/layouts/Breadcrumbs';
import { SectionHeader } from '../components/shared/SectionHeader';

export function Impact() {
    return (
        <div className="page impact-page stack">
            <Breadcrumbs currentPage="Tu impacto" />
            <PageHeader backTo="/" backLabel="Volver al inicio" mobileOnly />
            <SectionHeader variant="h2" title="Tu impacto" subtitle="Desde que empezaste a pedir" />
            <ImpactCard variant="detail" />
        </div>
    );
}
