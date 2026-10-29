import { Link, useLocation } from 'react-router';
import { Button } from '../core/Button';
import { useUser } from '../../context/UserContext';
import { useLogout } from '../../hooks/useLogout';
import { ADMIN_DASHBOARD_PATH } from '../../config/admin';

const navLinks = [
    { text: 'Dashboard', to: ADMIN_DASHBOARD_PATH },
    { text: 'Últimos pedidos', to: `${ADMIN_DASHBOARD_PATH}#recent-orders` },
    { text: 'Ranking de restaurantes', to: `${ADMIN_DASHBOARD_PATH}#impact-ranking` },
];

export function AdminSidebar() {
    const { user, logout } = useUser();
    const { pathname, hash } = useLocation();
    const { isLoggingOut, logoutError, handleLogout } = useLogout(logout);

    return (
        <aside className="admin-sidebar" aria-label="Panel de administración">
            <div className="admin-sidebar-head">
                <Link to={ADMIN_DASHBOARD_PATH} className="brand-logo" aria-label="EcoBite, dashboard de administración" />
                <span className="admin-badge">Admin</span>
            </div>
            <nav className="admin-nav" aria-label="Administración">
                {navLinks.map(({ text, to }) => (
                    <Link key={to} to={to} className="admin-nav-link" aria-current={`${pathname}${hash}` === to ? 'page' : undefined}>{text}</Link>
                ))}
            </nav>
            <div className="admin-account">
                <div className="admin-account-details">
                    <p>Sesión de administrador</p>
                    {user && <p className="admin-account-email">{user.email}</p>}
                </div>
                <Button type="button" variant="icon" className="admin-logout" disabled={isLoggingOut} onClick={handleLogout}>
                    {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                </Button>
                {logoutError && <p role="alert" className="admin-logout-error">{logoutError}</p>}
            </div>
        </aside>
    );
}
