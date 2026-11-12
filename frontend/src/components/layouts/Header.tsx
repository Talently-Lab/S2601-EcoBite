import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import type { IconType } from 'react-icons';
import { LuLeaf, LuMenu, LuShoppingCart, LuX } from 'react-icons/lu';
import { Button, LogoutButton } from '../core/Button';
import { Navbar } from './Navbar';
import { useCart } from '../../context/CartContext';
import { useUser } from '../../context/UserContext';
import { getUserNamePresentation } from '../../utils/userName';
import { ComunaSelector } from '../shared/ComunaSelector';
import { SearchBar } from '../forms/SearchBar';

type HeaderItemProps = {
    to: string;
    label: string;
    icon: IconType;
    className?: string;
    ariaLabel?: string;
    badge?: ReactNode;
};

function HeaderItem({ to, label, icon: Icon, className, ariaLabel, badge }: HeaderItemProps) {
    const { pathname } = useLocation();
    return (
        <Button variant="icon" to={to} className={className} aria-label={ariaLabel}
            aria-current={pathname === to ? 'page' : undefined}>
            <span>{label}</span>
            <Icon aria-hidden="true" />
            {badge}
        </Button>
    );
}

export function Header() {
    const { user } = useUser();
    const { pathname } = useLocation();
    const { displayName, initials } = getUserNamePresentation(user?.name);
    const { totalQuantity } = useCart();
    const menuRef = useRef<HTMLDialogElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);

    function closeMenu() {
        menuRef.current?.close();
    }

    const cartCount = totalQuantity;
    const filledCart = cartCount > 0;
    const cartLabel = filledCart
        ? `Ir al carrito, ${cartCount} ${cartCount === 1 ? 'producto' : 'productos'}`
        : 'Ir al carrito';

    function openMenu() {
        menuRef.current?.showModal();
        setMenuOpen(true);
    }

    function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) closeMenu();
    }

    return (
        <header className="site-header">
            <div className="site-header-bar">
                <Link to="/" className="brand-logo" aria-label="EcoBite, inicio" />
                <ComunaSelector />
                <SearchBar variant="bar" />
                <nav className="site-header-nav" aria-label="Navegación principal">
                    <HeaderItem to="/impact" icon={LuLeaf} label="Impacto" />
                    <HeaderItem to="/cart" icon={LuShoppingCart} label="Carrito"
                        className="site-header-cart" ariaLabel={cartLabel}
                        badge={filledCart ? <span className="site-header-cart-count" aria-hidden="true">{cartCount}</span> : null} />
                    <Link to="/profile" className="header-profile" aria-label={`Perfil de ${displayName}`}
                        aria-current={pathname === '/profile' ? 'page' : undefined}>
                        <span className="avatar" aria-hidden="true">{initials}</span>
                    </Link>
                </nav>
                <Button type="button" variant="icon"
                    aria-label="Abrir menú" aria-controls="site-menu" aria-expanded={menuOpen}
                    aria-haspopup="dialog" onClick={openMenu}>
                    <LuMenu aria-hidden="true" />
                </Button>
            </div>

            <dialog ref={menuRef} id="site-menu" className="header-drawer" aria-label="Menú de navegación"
                onClose={() => setMenuOpen(false)} onClick={handleBackdropClick}>
                <div className="header-drawer-content">
                    <div className="header-drawer-top">
                        <Link to="/" className="brand-logo" onClick={closeMenu} aria-label="EcoBite, inicio" />
                        <Button type="button" variant="icon" aria-label="Cerrar menú"
                            autoFocus onClick={closeMenu}><LuX aria-hidden="true" /></Button>
                    </div>

                    <div className="header-drawer-body">
                        <Link to="/profile" className="header-account" onClick={closeMenu}>
                            <span className="avatar" aria-hidden="true">{initials}</span>
                            <span className="header-account-details">
                                <span className="header-account-name">{displayName}</span>
                                <span className="header-account-caption">Ver tu cuenta</span>
                            </span>
                        </Link>

                        <Navbar onNavigate={closeMenu} />

                        <LogoutButton />
                    </div>
                </div>
            </dialog>
        </header>
    );
}
