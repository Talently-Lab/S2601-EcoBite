import { Link } from 'react-router';
import { LuArrowLeft } from 'react-icons/lu';

type PageHeaderProps = {
    title?: string;
    backTo: string;
    backLabel: string;
    desktopBackText?: string;
    mobileOnly?: boolean;
};

export function PageHeader({ title, backTo, backLabel, desktopBackText, mobileOnly = false }: PageHeaderProps) {
    return (
        <header className={`page-header${mobileOnly ? ' page-header--mobile-only' : ''}`}>
            <Link to={backTo} aria-label={backLabel}>
                <LuArrowLeft aria-hidden="true" />
                {desktopBackText ? <span>{desktopBackText}</span> : null}
            </Link>
            {title ? <h4>{title}</h4> : null}
        </header>
    );
}
