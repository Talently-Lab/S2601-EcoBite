import { LuArrowLeft } from 'react-icons/lu';
import { Button } from './Button';

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
            <Button variant="icon" to={backTo} aria-label={backLabel}>
                <LuArrowLeft aria-hidden="true" />
                {desktopBackText ? <span>{desktopBackText}</span> : null}
            </Button>
            {title ? <h4>{title}</h4> : null}
        </header>
    );
}
