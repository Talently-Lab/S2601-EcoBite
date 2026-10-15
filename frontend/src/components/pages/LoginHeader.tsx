interface LoginHeaderProps {
    variant: 'login' | 'signup';
}

export function LoginHeader({ variant }: LoginHeaderProps) {
    const isSignUp = variant === 'signup';

    return (
        <header className={`login-hero login-hero--${variant}`.trimEnd()}>
            <span className="brand-logo" role="img" aria-label="EcoBite" />
            <div className="login-intro">
                <h1 id="login-title">
                    {isSignUp ? 'Creá tu cuenta' : <>Pedí rico.<br /><span>Elegí mejor.</span></>}
                </h1>
                <p>{isSignUp
                    ? 'Pedí en restaurantes eco-friendly y seguí el impacto de cada pedido.'
                    : 'Descubrí restaurantes eco-friendly cerca tuyo. Mirá el impacto real de cada pedido, sin complicarte.'}</p>
            </div>
        </header>
    );
}
