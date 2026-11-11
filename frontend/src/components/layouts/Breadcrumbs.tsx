import { Link } from 'react-router';

type BreadcrumbParent = { label: string; to?: string };

export function Breadcrumbs({ currentPage, parents = [] }: {
    currentPage: string;
    parents?: readonly BreadcrumbParent[];
}) {
    return (
        <nav className="breadcrumbs" aria-label="Ruta de navegación">
            <ol>
                <li><Link to="/">Inicio</Link></li>
                {parents.map(({ label, to }) => (
                    <li key={`${to ?? ''}:${label}`}>{to ? <Link to={to}>{label}</Link> : <span>{label}</span>}</li>
                ))}
                <li><span aria-current="page">{currentPage}</span></li>
            </ol>
        </nav>
    );
}
