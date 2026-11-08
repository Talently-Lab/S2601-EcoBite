import { LuChevronRight, LuLeaf, LuLogOut } from 'react-icons/lu';
import { Button, LogoutButton } from '../components/core/Button';
import { SectionHeader } from '../components/shared/SectionHeader';
import { PageHeader } from '../components/core/PageHeader';
import { Breadcrumbs } from '../components/layouts/Breadcrumbs';
import { useUser } from '../context/UserContext';
import { getUserNamePresentation } from '../utils/userName';

export function Profile() {
    const { user } = useUser();
    const { displayName, initials } = getUserNamePresentation(user?.name);

    return (
        <div className="page profile-page">
            <Breadcrumbs currentPage="Perfil" />
            <PageHeader backTo="/" backLabel="Volver al inicio" mobileOnly />
            <div className="profile-layout">
                <div className="profile-card">
                    <div className="profile-identity">
                        <span className="avatar" aria-hidden="true">{initials}</span>
                        <SectionHeader variant="h1" title={displayName} subtitle={user?.email} />
                    </div>
                    <LogoutButton icon={<LuLogOut aria-hidden="true" />} errorClassName="form-error" />
                </div>
                <section className="profile-actions">
                    <h2>Tu cuenta</h2>
                    <Button variant="icon" to="/impact">
                        <LuLeaf aria-hidden="true" />
                        <span className="profile-impact-copy">
                            <span>Tu impacto</span>
                            <span className="profile-impact-description">El impacto que generaron tus pedidos</span>
                        </span>
                        <LuChevronRight aria-hidden="true" />
                    </Button>
                </section>
            </div>
        </div>
    );
}
