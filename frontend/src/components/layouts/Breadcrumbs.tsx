import { Link } from 'react-router';

export function Breadcrumbs({ currentPage, parentPage, parentTo }: {
    currentPage: string;
    parentPage?: string;
    parentTo?: string;
}) {
    return (
        <nav className="breadcrumbs" aria-label="Ruta de navegación">
            <ol>
                <li><Link to="/">Inicio</Link></li>
                {parentPage && <li>{parentTo ? <Link to={parentTo}>{parentPage}</Link> : <span>{parentPage}</span>}</li>}
                <li><span aria-current="page">{currentPage}</span></li>
            </ol>
        </nav>
    );
}
