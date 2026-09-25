import { HiOutlineKey } from "react-icons/hi";
import { GrLocation } from "react-icons/gr";
import { VscShare } from "react-icons/vsc";
import { TbMail, TbReceipt2, TbCreditCard } from "react-icons/tb";
import { ImageWithFallback } from '../components/shared/ImageWithFallback';
import { ProfileItem } from '../components/pages/ProfileItem';
import { ItemHeader } from "../components/shared/ItemHeader";

export function Profile() {

    const profileItems = [
        { icon: <TbMail />, label: 'Text', },
        { icon: <HiOutlineKey />, label: 'Text', },
        { icon: <TbReceipt2 />, label: 'Text', },
        { icon: <GrLocation />, label: 'Text', },
        { icon: <TbCreditCard />, label: 'Text', },
        { icon: <VscShare />, label: 'Text', },
    ];

    return (
        <div className="profile-page">
            <div className="profile-photo">
                <ImageWithFallback alt='profile-photo' />
                <h2>Nombre</h2>
            </div>
            <ItemHeader title='Tu cuenta' />
            {profileItems.map((item, index) =>
                <ProfileItem icon={item.icon} label={item.label} key={index} />
            )}
        </div>
    );
}
