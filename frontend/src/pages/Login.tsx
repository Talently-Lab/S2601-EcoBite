import { useState, type SubmitEvent } from 'react';
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import { Button } from '../components/core/Button';
import { Input } from '../components/forms/Input';
import { FormError } from '../components/forms/FormError';
import { LoginHeader } from '../components/pages/LoginHeader';
import { AuthModeLink } from '../components/pages/AuthModeLink';
import { signUp, AuthError, MIN_PASSWORD_LENGTH, type AuthField } from '../services/authService';
import { useUser } from '../context/UserContext';

const errorActions: Record<string, { label: string; mode: 'login' }> = {
    USR_EMAIL_TAKEN: { label: '¿Iniciás sesión?', mode: 'login' },
};

export function Login() {
    const { login } = useUser();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<AuthError | null>(null);
    const [notice, setNotice] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSignUp = mode === 'signup';
    const fieldErrors = error?.fieldErrors ?? {};
    const generalError = error && !Object.keys(fieldErrors).length ? error.message : '';
    const errorAction = error?.code && Object.hasOwn(errorActions, error.code) ? errorActions[error.code] : undefined;

    function updateField(field: AuthField, value: string) {
        const setters = { name: setName, email: setEmail, password: setPassword };
        setters[field](value);
        setError((current) => {
            if (!current || current.code === 'AUTH_INVALID_CREDENTIALS') return null;
            const remainingErrors = { ...current.fieldErrors };
            delete remainingErrors[field];
            return Object.keys(remainingErrors).length
                ? new AuthError(current.message, {
                    status: current.status, code: current.code, fieldErrors: remainingErrors, cause: current.cause,
                }) : null;
        });
    }

    function changeMode(nextMode: typeof mode) {
        setMode(nextMode);
        setPassword('');
        setShowPassword(false);
        setError(null);
        setNotice('');
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isSubmitting) return;
        const terms = event.currentTarget.elements.namedItem('terms');
        if (isSignUp && terms instanceof HTMLInputElement && !terms.reportValidity()) return;
        setError(null);
        setIsSubmitting(true);

        try {
            if (isSignUp) {
                await signUp({ name, email, password });
                changeMode('login');
                setNotice('Tu cuenta fue creada. Ingresá con tu email y contraseña.');
            } else {
                await login({ email, password });
            }
        } catch (cause) {
            setError(cause instanceof AuthError ? cause : new AuthError('No pudimos continuar. Probá de nuevo.'));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="page login-page" aria-labelledby="login-title">
            <LoginHeader variant={mode} />

            <div className="login-content">
                <div className="login-panel">
                    {notice && <p role="status">{notice}</p>}
                    <form className="login-form" noValidate onSubmit={handleSubmit} aria-busy={isSubmitting}
                        aria-describedby={generalError ? 'login-error' : undefined} aria-label={isSignUp ? 'Crear cuenta' : 'Ingresar'}>
                        {isSignUp && (
                            <Input variant="login" label="Nombre" name="name" placeholder="¿Cómo te llamamos?" autoComplete="name" required
                                value={name} onChange={(event) => updateField('name', event.target.value)} disabled={isSubmitting}
                                error={fieldErrors.name} />
                        )}

                        <Input variant="login" label="Email" type="email" name="email" placeholder="tu@email.com" autoComplete="email" required
                            autoCapitalize="none" spellCheck={false} value={email}
                            onChange={(event) => updateField('email', event.target.value)} disabled={isSubmitting}
                            error={fieldErrors.email && <>
                                {fieldErrors.email}
                                {errorAction && (
                                    <button type="button" className="login-error-action" disabled={isSubmitting}
                                        onClick={() => changeMode(errorAction.mode)}>{errorAction.label}</button>
                                )}
                            </>} />

                        <Input variant="login" label="Contraseña" type={showPassword ? 'text' : 'password'} name="password"
                            placeholder={isSignUp ? undefined : 'Tu contraseña'}
                            autoComplete={isSignUp ? 'new-password' : 'current-password'} required
                            minLength={isSignUp ? MIN_PASSWORD_LENGTH : undefined} value={password}
                            onChange={(event) => updateField('password', event.target.value)} disabled={isSubmitting}
                            error={fieldErrors.password}
                            hint={isSignUp ? `Mínimo ${MIN_PASSWORD_LENGTH} caracteres` : undefined}
                            icon={
                                <Button type="button" variant="icon" className="login-password-toggle"
                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    aria-pressed={showPassword} disabled={isSubmitting}
                                    onClick={() => setShowPassword((visible) => !visible)}>
                                    {showPassword ? <IoEyeOffOutline aria-hidden="true" /> : <IoEyeOutline aria-hidden="true" />}
                                </Button>
                            } />
                        {generalError && <FormError id="login-error" className="login-error">{generalError}</FormError>}

                        {isSignUp && (
                            <div className="login-terms">
                                <Input type="checkbox" id="terms" name="terms" required disabled={isSubmitting} />
                                <label htmlFor="terms">
                                    Acepto los <a className="login-text-link" role="link" aria-disabled="true">Términos y Condiciones</a> y la{' '}
                                    <a className="login-text-link" role="link" aria-disabled="true">Política de Privacidad</a>.
                                </label>
                            </div>
                        )}

                        <Button type="submit" className="login-submit" disabled={isSubmitting}>
                            {isSubmitting ? (isSignUp ? 'Creando cuenta...' : 'Ingresando...') : (isSignUp ? 'Crear cuenta' : 'Ingresar')}
                        </Button>
                    </form>
                    <div className="login-links">
                        <AuthModeLink mode={mode} onModeChange={changeMode} disabled={isSubmitting} />
                        {!isSignUp && (
                            <a className="login-text-link login-admin-link" role="link" aria-disabled="true">Soy administrador</a>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
