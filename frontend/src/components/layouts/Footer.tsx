import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { navLinks } from '../../constants/constants';

type FooterSectionProps = {
    title: string;
    className: string;
    children: ReactNode;
};

function FooterSection({ title, className, children }: FooterSectionProps) {
    return (
        <section className={className} aria-label={title}>
            <h2 className="site-footer-heading">{title}</h2>
            {children}
        </section>
    );
}

export function Footer() {
    return (
        <footer>
            <div className="site-footer-main">
                <div className="site-footer-brand">
                    <span className="brand-logo" role="img" aria-label="EcoBite" />
                    <p className="site-footer-tagline">Pedí rico. Elegí mejor.</p>
                </div>

                <nav className="site-footer-nav" aria-label="Navegación del pie de página">
                    {navLinks.map(({ to, label }) => <Link key={to} to={to}>{label}</Link>)}
                </nav>

                <FooterSection title="Contacto" className="site-footer-contact">
                    <address>
                        <a href="mailto:Contacto@ecobite.com">Contacto@ecobite.com</a>
                        <span>Av. Libertador 6800, piso 13, CABA</span>
                    </address>
                </FooterSection>

                <FooterSection title="Legales" className="site-footer-legal">
                    <ul>
                        <li>Términos y condiciones</li>
                        <li>Política de privacidad</li>
                    </ul>
                </FooterSection>
            </div>

            <p className="site-footer-copyright">© {new Date().getFullYear()} EcoBite</p>
        </footer>
    );
}
