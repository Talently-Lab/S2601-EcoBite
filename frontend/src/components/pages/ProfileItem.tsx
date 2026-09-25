import { Button } from "../core/Button";
import { MdKeyboardArrowRight } from "react-icons/md";

export function ProfileItem({ icon, label }: { icon: React.ReactNode, label: string }) {
    return (
        <div className="profile-item">
            <span className="profile-item-icon icon">{icon}</span>
            <span>{label}</span>
            <Button variant="icon"><MdKeyboardArrowRight /></Button>
        </div>
    )
}
