import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { LuMenu, LuShoppingCart, LuX } from 'react-icons/lu';
import { TbLeaf } from 'react-icons/tb';
import { Button } from '../core/Button';
import { Navbar } from './Navbar';
import type { AuthUser } from '../../services/authService';
import logo from '../../assets/icons/logo.svg';

type HeaderProps = {
    user: AuthUser;
    onLogout: () => void;
};

export function Header({ user, onLogout }: HeaderProps) {
    const menuRef = useRef<HTMLDialogElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const initials = user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

    function closeMenu() {
        menuRef.current?.close();
    }

    return (
        <header className="site-header">
            <div className="site-header-bar">
                <Link to="/" className="site-brand" aria-label="EcoBite, inicio"><img src={logo} alt="EcoBite" /></Link>
                <div className="site-header-actions">
                    <Link to="/cart" className="site-header-cart" aria-label="Ir al carrito">
                        <LuShoppingCart aria-hidden="true" />
                        <TbLeaf className="site-header-leaf" aria-hidden="true" />
                    </Link>
                    <Button type="button" variant="icon" className="site-header-control"
                        aria-label="Abrir menú" aria-controls="site-menu" aria-expanded={menuOpen}
                        aria-haspopup="dialog" onClick={() => menuRef.current?.showModal()}>
                        <LuMenu aria-hidden="true" />
                    </Button>
                </div>
            </div>

            <dialog ref={menuRef} id="site-menu" className="header-drawer" aria-label="Menú de navegación"
                onToggle={(event) => setMenuOpen(event.newState === 'open')}
                onClick={(event) => {
                    if (event.target !== event.currentTarget) return;
                    const bounds = event.currentTarget.getBoundingClientRect();
                    if (event.clientX < bounds.left || event.clientX > bounds.right ||
                        event.clientY < bounds.top || event.clientY > bounds.bottom) closeMenu();
                }}>
                <div className="header-drawer-content">
                    <div className="header-drawer-top">
                        <Link to="/" className="site-brand" onClick={closeMenu} aria-label="EcoBite, inicio"><img src={logo} alt="EcoBite" /></Link>
                        <Button type="button" variant="icon" className="site-header-control" aria-label="Cerrar menú"
                            autoFocus onClick={closeMenu}><LuX aria-hidden="true" /></Button>
                    </div>

                    <div className="header-drawer-body">
                        <Link to="/profile" className="header-account" onClick={closeMenu}>
                            <span className="header-avatar" aria-hidden="true">{initials}</span>
                            <span className="header-account-details">
                                <span className="header-account-name">{user.name}</span>
                                <span className="header-account-caption">Ver tu cuenta</span>
                            </span>
                        </Link>

                        <Navbar onNavigate={closeMenu} />

                        <nav aria-label="Ayuda" className="header-menu-help">
                            <h2>Ayuda</h2>
                            <button type="button" className="header-help-link" disabled>
                                Cómo calculamos el impacto
                            </button>
                            <button type="button" className="header-help-link" disabled>
                                Contacto
                            </button>
                        </nav>

                        <Button type="button" variant="icon" className="header-logout" onClick={() => {
                            closeMenu();
                            onLogout();
                        }}>Cerrar sesión</Button>
                    </div>
                </div>
            </dialog>
        </header>
    );
}
