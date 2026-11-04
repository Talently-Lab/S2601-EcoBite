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
            <div className="profile-identity">
                <span className="avatar" aria-hidden="true">{initials}</span>
                <SectionHeader variant="h1" title={displayName} subtitle={user?.email} />
            </div>
            <section className="profile-actions">
                <h2>Tu cuenta</h2>
                <Button variant="icon" to="/impact">
                    <LuLeaf aria-hidden="true" />
                    <span>Tu impacto</span>
                    <LuChevronRight aria-hidden="true" />
                </Button>
                <LogoutButton icon={<LuLogOut aria-hidden="true" />} errorClassName="form-error" />
            </section>
        </div>
    );
}
