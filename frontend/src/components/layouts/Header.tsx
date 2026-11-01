import { useRef, useState, type MouseEvent, type ReactNode, type SubmitEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import type { IconType } from 'react-icons';
import { LuLeaf, LuMapPin, LuMenu, LuSearch, LuShoppingCart, LuX } from 'react-icons/lu';
import { Button } from '../core/Button';
import { Navbar } from './Navbar';
import { useCart } from '../../context/CartContext';
import { useUser } from '../../context/UserContext';
import { useLogout } from '../../hooks/useLogout';
import { getUserNamePresentation } from '../../utils/userName';

type HeaderItemProps = {
    to: string;
    label: string;
    icon: IconType;
    className?: string;
    ariaLabel?: string;
    badge?: ReactNode;
};

function HeaderItem({ to, label, icon: Icon, className, ariaLabel, badge }: HeaderItemProps) {
    return (
        <NavLink to={to} className={() => `site-header-item ${className ?? ''}`.trimEnd()}
            aria-label={ariaLabel}>
            <span className="site-header-item-label">{label}</span>
            <Icon aria-hidden="true" />
            {badge}
        </NavLink>
    );
}

export function Header() {
    const { user, logout } = useUser();
    const { displayName, initials } = getUserNamePresentation(user?.name);
    const { totalQuantity, deliveryComuna } = useCart();
    const location = useLocation();
    const navigate = useNavigate();
    const searchQuery = new URLSearchParams(location.search).get('q') ?? '';
    const menuRef = useRef<HTMLDialogElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);

    function closeMenu() {
        menuRef.current?.close();
    }

    const { isLoggingOut, logoutError, handleLogout } = useLogout(logout, closeMenu);
    const cartCount = totalQuantity;
    const filledCart = cartCount > 0;
    const cartLabel = filledCart
        ? `Ir al carrito, ${cartCount} ${cartCount === 1 ? 'producto' : 'productos'}`
        : 'Ir al carrito';
    const locationLabel = deliveryComuna === null ? 'Elegí tu comuna' : `Comuna ${deliveryComuna}, CABA`;

    function handleSearch(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        const query = String(new FormData(event.currentTarget).get('q') ?? '').trim();
        void navigate(`/restaurants${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    }

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
                <HeaderItem to="/" icon={LuMapPin} label={locationLabel}
                    className="site-header-location" ariaLabel="Elegir comuna de entrega en inicio" />
                <form className="site-header-search" role="search" onSubmit={handleSearch}>
                    <button type="submit" aria-label="Buscar restaurantes o platos">
                        <LuSearch aria-hidden="true" />
                    </button>
                    <input key={searchQuery} type="search" name="q" defaultValue={searchQuery}
                        placeholder="Buscá restaurantes o platos" aria-label="Buscar restaurantes o platos" />
                </form>
                <nav className="site-header-nav" aria-label="Navegación principal">
                    <HeaderItem to="/impact" icon={LuLeaf} label="Impacto" />
                    <HeaderItem to="/cart" icon={LuShoppingCart} label="Carrito"
                        className="site-header-cart" ariaLabel={cartLabel}
                        badge={filledCart ? <span className="site-header-cart-count" aria-hidden="true">{cartCount}</span> : null} />
                    <NavLink to="/profile" className="site-header-item" aria-label={`Perfil de ${displayName}`}>
                        <span className="header-avatar" aria-hidden="true">{initials}</span>
                    </NavLink>
                </nav>
                <Button type="button" variant="icon" className="site-header-control"
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
                        <Button type="button" variant="icon" className="site-header-control" aria-label="Cerrar menú"
                            autoFocus onClick={closeMenu}><LuX aria-hidden="true" /></Button>
                    </div>

                    <div className="header-drawer-body">
                        <Link to="/profile" className="header-account" onClick={closeMenu}>
                            <span className="header-avatar" aria-hidden="true">{initials}</span>
                            <span className="header-account-details">
                                <span className="header-account-name">{displayName}</span>
                                <span className="header-account-caption">Ver tu cuenta</span>
                            </span>
                        </Link>

                        <Navbar onNavigate={closeMenu} />

                        {logoutError && <p role="alert">{logoutError}</p>}
                        <Button type="button" variant="text" className="header-logout" disabled={isLoggingOut}
                            onClick={handleLogout}>{isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</Button>
                    </div>
                </div>
            </dialog>
        </header>
    );
}
