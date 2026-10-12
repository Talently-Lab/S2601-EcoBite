import { NavLink } from 'react-router';

type NavbarProps = {
    onNavigate: () => void;
};

const links = [
    { to: '/', label: 'Inicio' },
    { to: '/restaurants', label: 'Restaurantes' },
    { to: '/impact', label: 'Tu impacto' },
    { to: '/cart', label: 'Tu carrito' },
];

export function Navbar({ onNavigate }: NavbarProps) {
    return (
        <nav aria-label="Navegación principal" className="header-menu-nav">
            {links.map((link) => (
                <NavLink key={link.to} to={link.to} end className="header-menu-link" onClick={onNavigate}>
                    {link.label}
                </NavLink>
            ))}
            <button type="button" className="header-menu-link" disabled>
                Historial de pedidos
            </button>
        </nav>
    );
}
