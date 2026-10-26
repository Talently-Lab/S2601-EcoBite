import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../core/Button';
import { useUser } from '../../context/UserContext';
import { AuthError } from '../../services/authService';
import { ADMIN_DASHBOARD_PATH } from '../../config/admin';

const navLinks = [
    { text: 'Dashboard', to: ADMIN_DASHBOARD_PATH },
    { text: 'Últimos pedidos', to: `${ADMIN_DASHBOARD_PATH}#recent-orders` },
];

function AdminNavLink({ text, to }: { text: string; to: string }) {
    return <Link to={to} className="admin-nav-link">{text}</Link>;
}

export function AdminSidebar() {
    const { user, logout } = useUser();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [logoutError, setLogoutError] = useState('');

    async function handleLogout() {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        setLogoutError('');
        try {
            await logout();
        } catch (cause) {
            setLogoutError(cause instanceof AuthError ? cause.message : 'No pudimos cerrar tu sesión. Probá de nuevo.');
        } finally {
            setIsLoggingOut(false);
        }
    }

    return (
        <aside className="admin-sidebar" aria-label="Panel de administración">
            <div className="admin-sidebar-head">
                <Link to={ADMIN_DASHBOARD_PATH} className="admin-brand" aria-label="EcoBite, dashboard de administración">
                    <span className="brand-logo" aria-hidden="true" />
                </Link>
                <span className="admin-badge">Admin</span>
            </div>
            <nav className="admin-nav" aria-label="Administración">
                {navLinks.map(({ text, to }) => <AdminNavLink key={to} text={text} to={to} />)}
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
