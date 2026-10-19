import { createContext, useContext } from 'react';
import type { AuthUser, LoginInput } from '../services/authService';

type UserContextValue = {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    sessionError: string;
    login: (input: LoginInput) => Promise<void>;
    logout: () => Promise<void>;
};

export const UserContext = createContext<UserContextValue | null>(null);

export function useUser() {
    const context = useContext(UserContext);
    if (!context) throw new Error('useUser debe usarse dentro de UserProvider.');
    return context;
}
