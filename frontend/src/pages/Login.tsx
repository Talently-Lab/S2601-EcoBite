import { useState, type SubmitEvent } from 'react';
import { IoCheckmarkOutline, IoEllipseOutline, IoEyeOutline, IoEyeOffOutline, IoAlertCircleOutline } from 'react-icons/io5';
import { Button } from '../components/core/Button';
import { Input } from '../components/forms/Input';
import { login, signUp, passwordRequirements, AuthError, type AuthUser } from '../services/authService';

type LoginProps = {
    onLogin: (user: AuthUser) => void;
};

export function Login({ onLogin }: LoginProps) {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSignUp = mode === 'signup';

    function changeMode(nextMode: typeof mode) {
        if (nextMode === mode) return;
        setMode(nextMode);
        setPassword('');
        setShowPassword(false);
        setError('');
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isSubmitting) return;
        setError('');
        setIsSubmitting(true);

        try {
            const user = isSignUp
                ? await signUp({ name, email, password })
                : await login({ email, password });
            onLogin(user);
        } catch (cause) {
            setError(cause instanceof AuthError ? cause.message : 'No pudimos continuar. Probá de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="page login-page" aria-labelledby="login-title">
            <div className="login-hero">
                <span className="brand-logo" role="img" aria-label="EcoBite" />
                <div className="login-intro">
                    <h1 id="login-title">
                        {isSignUp ? 'Creá tu cuenta' : <>Pedí rico.<br /><span>Elegí mejor.</span></>}
                    </h1>
                    <p>{isSignUp
                        ? ''
                        : 'Descubrí restaurantes eco-friendly cerca tuyo. Mirá el impacto real de cada pedido, sin complicarte.'}</p>
                </div>
            </div>

            <div className="login-content">
                <div className="login-panel">
                    <div className="login-switch" role="group" aria-label="Acceso a tu cuenta">
                        <Button type="button" className="login-switch-option" aria-pressed={!isSignUp}
                            disabled={isSubmitting} onClick={() => changeMode('login')}>Ingresar</Button>
                        <Button type="button" className="login-switch-option" aria-pressed={isSignUp}
                            disabled={isSubmitting} onClick={() => changeMode('signup')}>Crear cuenta</Button>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit} aria-busy={isSubmitting} aria-describedby={error ? 'login-error' : undefined}
                        aria-label={isSignUp ? 'Crear cuenta' : 'Ingresar'} onChange={() => setError('')}>
                        {isSignUp && (
                            <div className="login-field">
                                <label htmlFor="name">Nombre</label>
                                <Input name="name" placeholder="Tu nombre" autoComplete="name" required
                                    value={name} onChange={(event) => setName(event.target.value)} disabled={isSubmitting} />
                            </div>
                        )}

                        <div className="login-field">
                            <label htmlFor="email">Email</label>
                            <Input type="email" name="email" placeholder="Tu@email.com" autoComplete="email" required
                                autoCapitalize="none" spellCheck={false} value={email}
                                onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting} />
                        </div>

                        <div className="login-field">
                            <label htmlFor="password">Contraseña</label>
                            <div className="login-password">
                                <Input type={showPassword ? 'text' : 'password'} name="password" placeholder="Tu contraseña"
                                    autoComplete={isSignUp ? 'new-password' : 'current-password'} required
                                    minLength={isSignUp ? 8 : undefined} value={password}
                                    onChange={(event) => setPassword(event.target.value)} disabled={isSubmitting}
                                    aria-describedby={isSignUp ? 'password-requirements' : undefined} />
                                <Button type="button" variant="icon" className="login-password-toggle"
                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    aria-pressed={showPassword} disabled={isSubmitting}
                                    onClick={() => setShowPassword((visible) => !visible)}>
                                    {showPassword ? <IoEyeOffOutline aria-hidden="true" /> : <IoEyeOutline aria-hidden="true" />}
                                </Button>
                            </div>
                            {isSignUp && (
                                <ul id="password-requirements" className="login-requirements">
                                    {passwordRequirements.map((requirement) => {
                                        const met = requirement.test(password);
                                        return (
                                            <li key={requirement.label} data-met={met}>
                                                {met ? <IoCheckmarkOutline aria-label="Cumplido" /> : <IoEllipseOutline aria-label="Pendiente" />}
                                                {requirement.label}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            {error && (
                                <p id="login-error" className="login-error" role="alert">
                                    <IoAlertCircleOutline aria-hidden="true" />
                                    <span>{error}</span>
                                </p>
                            )}
                        </div>

                        <Button type="submit" className="login-submit" disabled={isSubmitting}>
                            {isSubmitting ? (isSignUp ? 'Creando cuenta...' : 'Ingresando...') : (isSignUp ? 'Crear cuenta' : 'Ingresar')}
                        </Button>
                    </form>
                </div>
            </div>
        </section>
    );
}
