import { Link } from 'react-router';
import { navLinks } from '../../constants/constants';

export function Footer() {
    return (
        <footer className="site-footer">
            <div className="site-footer-content">
                <div className="site-footer-brand">
                    <span className="brand-logo" role="img" aria-label="EcoBite" />
                    <p className="site-footer-tagline">Pedí rico. Elegí mejor.</p>
                </div>
                <nav className="site-footer-nav" aria-label="Navegación del pie de página">
                    {navLinks.map(({ to, label }) => <Link key={to} to={to}>{label}</Link>)}
                </nav>
                <div className="site-footer-legal">
                    <span>Términos y condiciones</span>
                    <span>Política de privacidad</span>
                </div>
                <p className="site-footer-copyright">© {new Date().getFullYear()} EcoBite</p>
            </div>
        </footer>
    );
}
