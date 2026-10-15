interface AuthModeLinkProps {
    mode: 'login' | 'signup';
    onModeChange: (mode: 'login' | 'signup') => void;
    disabled?: boolean;
}

export function AuthModeLink({ mode, onModeChange, disabled }: AuthModeLinkProps) {
    const isSignUp = mode === 'signup';

    return (
        <p className="auth-mode-link">
            {isSignUp ? '¿Ya tenés cuenta? ' : '¿No tenés cuenta? '}
            <button type="button" className="login-text-link" disabled={disabled}
                onClick={() => onModeChange(isSignUp ? 'login' : 'signup')}>
                {isSignUp ? 'Iniciá sesión' : 'Crear una'}
            </button>
        </p>
    );
}
