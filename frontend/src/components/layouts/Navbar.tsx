import { NavLink } from 'react-router';
import { navLinks } from '../../constants/constants';

type NavbarProps = {
    onNavigate: () => void;
};

export function Navbar({ onNavigate }: NavbarProps) {
    return (
        <nav aria-label="Navegación principal" className="header-menu-nav">
            {navLinks.map((link) => (
                <NavLink key={link.to} to={link.to} end className="header-menu-link" onClick={onNavigate}>
                    {link.label}
                </NavLink>
            ))}
        </nav>
    );
}
