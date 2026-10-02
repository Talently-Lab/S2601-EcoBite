const footerSections = [
    {
        title: 'Ayuda',
        links: [
            { label: 'Cómo calculamos el impacto', href: '' },
            { label: 'Contacto', href: '' },
        ],
    },
    {
        title: 'Legales',
        links: [
            { label: 'Términos y condiciones', href: '' },
            { label: 'Política de privacidad', href: '' },
        ],
    },
];

export function Footer() {
    return (
        <footer className="site-footer">
            <div className="site-footer-content">
                <div className="site-footer-brand">
                    <span className="brand-logo" role="img" aria-label="EcoBite" />
                    <p className="site-footer-tagline">Pedí rico. Elegí mejor.</p>
                </div>

                <div className="site-footer-sections">
                    {footerSections.map((section) => (
                        <nav key={section.title} className="site-footer-section" aria-label={section.title}>
                            <h2 className="site-footer-heading">{section.title}</h2>
                            <ul className="site-footer-links">
                                {section.links.map((link) => (
                                    <li key={link.label}>
                                        <a className="site-footer-link" href={link.href} onClick={(event) => {
                                            if (!link.href) event.preventDefault();
                                        }}>
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ))}
                </div>

                <p className="site-footer-copyright">© {new Date().getFullYear()} EcoBite</p>
            </div>
        </footer>
    );
}
