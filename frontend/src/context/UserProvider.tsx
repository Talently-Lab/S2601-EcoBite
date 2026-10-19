import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AuthError, getCurrentUser, login, logout, type AuthUser, type LoginInput } from '../services/authService';
import { UserContext } from './UserContext';

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sessionError, setSessionError] = useState('');
    const sessionRevision = useRef(0);

    useEffect(() => {
        let active = true;
        let pending = false;
        let initializing = true;

        async function checkSession() {
            if (pending) return;
            pending = true;
            const revision = sessionRevision.current;
            try {
                const currentUser = await getCurrentUser();
                if (active && revision === sessionRevision.current) {
                    setUser(currentUser);
                    setSessionError('');
                }
            } catch (cause) {
                if (active && initializing) {
                    setSessionError(cause instanceof AuthError ? cause.message : 'No pudimos recuperar tu sesión.');
                }
            } finally {
                pending = false;
                initializing = false;
                if (active) setIsLoading(false);
            }
        }

        function checkVisibleSession() {
            if (document.visibilityState === 'visible') void checkSession();
        }

        void checkSession();
        window.addEventListener('focus', checkVisibleSession);
        document.addEventListener('visibilitychange', checkVisibleSession);
        const interval = window.setInterval(checkVisibleSession, 60_000);
        return () => {
            active = false;
            window.removeEventListener('focus', checkVisibleSession);
            document.removeEventListener('visibilitychange', checkVisibleSession);
            window.clearInterval(interval);
        };
    }, []);

    async function handleLogin(input: LoginInput) {
        const authenticatedUser = await login(input);
        sessionRevision.current++;
        setUser(authenticatedUser);
        setSessionError('');
    }

    async function handleLogout() {
        await logout();
        sessionRevision.current++;
        setUser(null);
        setSessionError('');
    }

    return (
        <UserContext value={{ user, isAuthenticated: user !== null, isLoading, sessionError, login: handleLogin, logout: handleLogout }}>
            {children}
        </UserContext>
    );
}
