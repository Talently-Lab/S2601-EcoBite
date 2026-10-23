import { Link } from 'react-router';
import { LuArrowLeft } from 'react-icons/lu';

type PageHeaderProps = {
    title?: string;
    backTo: string;
    backLabel: string;
};

export function PageHeader({ title, backTo, backLabel }: PageHeaderProps) {
    return (
        <header className="page-header">
            <Link className="page-header__back" to={backTo} aria-label={backLabel}>
                <LuArrowLeft aria-hidden="true" />
            </Link>
            {title ? <h1 className="page-header__title">{title}</h1> : null}
        </header>
    );
}
