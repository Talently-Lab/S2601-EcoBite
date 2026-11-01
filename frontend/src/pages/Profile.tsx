import { HiOutlineKey } from "react-icons/hi";
import { GrLocation } from "react-icons/gr";
import { VscShare } from "react-icons/vsc";
import { TbReceipt2, TbCreditCard } from "react-icons/tb";
import { ImageWithFallback } from '../components/shared/ImageWithFallback';
import { ProfileItem } from '../components/pages/ProfileItem';
import { ItemHeader } from "../components/shared/ItemHeader";
import { SectionHeader } from '../components/shared/SectionHeader';
import { PageHeader } from '../components/core/PageHeader';
import { Breadcrumbs } from '../components/layouts/Breadcrumbs';
import { useUser } from '../context/UserContext';
import { getUserNamePresentation } from '../utils/userName';

export function Profile() {
    const { user } = useUser();
    const { displayName } = getUserNamePresentation(user?.name);

    const profileItems = [
        { icon: <HiOutlineKey />, label: 'Text', },
        { icon: <TbReceipt2 />, label: 'Text', },
        { icon: <GrLocation />, label: 'Text', },
        { icon: <TbCreditCard />, label: 'Text', },
        { icon: <VscShare />, label: 'Text', },
    ];

    return (
        <div className="profile-page">
            <Breadcrumbs currentPage="Perfil" />
            <PageHeader backTo="/" backLabel="Volver al inicio" mobileOnly />
            <div className="profile-photo">
                <ImageWithFallback alt='profile-photo' />
                <SectionHeader variant="h1" title={displayName} subtitle={user?.email} />
            </div>
            <ItemHeader title='Tu cuenta' />
            {profileItems.map((item, index) =>
                <ProfileItem icon={item.icon} label={item.label} key={index} />
            )}
        </div>
    );
}
