type LoginInput = { email: string; password: string };
type SignUpInput = LoginInput & { name: string };
export type AuthUser = { name: string; email: string };

export class AuthError extends Error {}

export const passwordRequirements = [
    { label: 'Al menos 8 caracteres', test: (value: string) => value.length >= 8 },
    { label: 'Una letra', test: (value: string) => /\p{L}/u.test(value) },
    { label: 'Un número', test: (value: string) => /[0-9]/.test(value) },
];

const mockUser = {
    name: import.meta.env.VITE_MOCK_AUTH_NAME?.trim(),
    email: import.meta.env.VITE_MOCK_AUTH_EMAIL?.trim().toLowerCase(),
    password: import.meta.env.VITE_MOCK_AUTH_PASSWORD,
};

export async function login({ email, password }: LoginInput): Promise<AuthUser> {
    if (!mockUser.name || !mockUser.email || !mockUser.password) {
        throw new AuthError('El acceso de prueba no está configurado.');
    }
    if (email.trim().toLowerCase() !== mockUser.email || password !== mockUser.password) {
        throw new AuthError('El mail o la contraseña son incorrectos. Revisalos y probá de nuevo.');
    }

    return { name: mockUser.name, email: mockUser.email };
}

export async function signUp({ name, email, password }: SignUpInput): Promise<AuthUser> {
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        throw new AuthError('Completá tu nombre y un email válido.');
    }
    if (!passwordRequirements.every((requirement) => requirement.test(password))) {
        throw new AuthError('Revisá los requisitos de tu contraseña.');
    }
    if (email.trim().toLowerCase() === mockUser.email) {
        throw new AuthError('Ya existe una cuenta con este email. Probá ingresar.');
    }

    return { name: name.trim(), email: email.trim().toLowerCase() };
}
