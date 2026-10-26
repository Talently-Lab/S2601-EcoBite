import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout() {
    const { hash, key } = useLocation();

    useEffect(() => {
        if (hash) {
            document.getElementById(hash.slice(1))?.scrollIntoView();
        } else {
            window.scrollTo(0, 0);
        }
    }, [hash, key]);

    return (
        <div className="admin-shell">
            <a href="#admin-main" className="admin-skip-link">Saltar al contenido</a>
            <AdminSidebar />
            <main id="admin-main" className="admin-main" tabIndex={-1}>
                <Outlet />
            </main>
        </div>
    );
}
