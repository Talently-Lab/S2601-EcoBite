import { useState } from 'react';
import { AuthError } from '../services/authService';

export function useLogout(logout: () => Promise<void>, onSuccess?: () => void) {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [logoutError, setLogoutError] = useState('');

    async function handleLogout() {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        setLogoutError('');
        try {
            await logout();
            onSuccess?.();
        } catch (cause) {
            setLogoutError(cause instanceof AuthError ? cause.message : 'No pudimos cerrar tu sesión. Probá de nuevo.');
        } finally {
            setIsLoggingOut(false);
        }
    }

    return { isLoggingOut, logoutError, handleLogout };
}
