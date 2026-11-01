import { Link } from 'react-router';

export function Breadcrumbs({ currentPage }: { currentPage: string }) {
    return (
        <nav className="breadcrumbs" aria-label="Ruta de navegación">
            <ol>
                <li><Link to="/">Inicio</Link></li>
                <li><span aria-current="page">{currentPage}</span></li>
            </ol>
        </nav>
    );
}
