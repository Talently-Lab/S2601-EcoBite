export type LoginInput = { email: string; password: string };
export type SignUpInput = LoginInput & { name: string };
type AuthBody = LoginInput | SignUpInput;
export type AuthUser = { id: string; name: string; email: string; registeredAt: string };
export type AuthField = keyof SignUpInput;
type FieldErrors = Partial<Record<AuthField, string>>;

export class AuthError extends Error {
    readonly status?: number;
    readonly fieldErrors: FieldErrors;
    readonly code?: string;

    constructor(message: string, status?: number, fieldErrors: FieldErrors = {}, code?: string) {
        super(message);
        this.name = 'AuthError';
        this.status = status;
        this.fieldErrors = fieldErrors;
        this.code = code;
    }
}

function passwordLength(value: string): number {
    const presentationSequences = value.match(/[^\uFE0F\uFE0E][\uFE0F\uFE0E]/g)?.length ?? 0;
    return Array.from(value).length - presentationSequences;
}

export const MIN_PASSWORD_LENGTH = 8;

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');
const invalidResponse = 'La respuesta del servidor no es válida. Probá de nuevo.';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

const defaultErrorMessage = 'No pudimos completar la solicitud. Probá de nuevo.';
const invalidCredentialsMessage = 'El mail o la contraseña son incorrectos. Revisalos y probá de nuevo.';
const emailTakenMessage = 'Este email ya tiene una cuenta.';
const requiredMessage = 'Nos falta este dato para arrancar.';

const fieldErrorMessages: Record<string, string> = {
    name: requiredMessage,
    email: 'Revisá el email, algo no está bien.',
    password: `Necesita al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
};

function validationFieldErrors(body: unknown): FieldErrors {
    const errors = isRecord(body) && Array.isArray(body.errors) ? body.errors : [];
    return Object.fromEntries(errors.flatMap((error: unknown) =>
        isRecord(error) && typeof error.property === 'string' && Object.hasOwn(fieldErrorMessages, error.property)
            ? [[error.property, fieldErrorMessages[error.property]]] : []));
}

const statusErrorMessages: Record<number, string> = {
    400: 'Revisá los datos ingresados e intentá de nuevo.',
    401: 'Tu sesión venció. Volvé a ingresar.',
    403: 'No pudimos validar la seguridad de la solicitud. Probá de nuevo.',
    429: 'Demasiados intentos. Esperá un minuto antes de volver a intentar.',
    500: 'El servidor no está disponible. Probá de nuevo en unos minutos.',
};

const codeErrors: Record<string, { message: string; fieldErrors: FieldErrors }> = {
    USR_EMAIL_TAKEN: { message: emailTakenMessage, fieldErrors: { email: emailTakenMessage } },
    AUTH_INVALID_CREDENTIALS: { message: invalidCredentialsMessage, fieldErrors: { password: invalidCredentialsMessage } },
};

const pathErrorCodes: Record<string, Record<number, string>> = {
    '/auth/login': { 400: 'AUTH_INVALID_CREDENTIALS', 401: 'AUTH_INVALID_CREDENTIALS' },
    '/users/register': { 409: 'USR_EMAIL_TAKEN' },
};

const statusFieldErrors: Record<number, (body: unknown) => FieldErrors> = {
    400: validationFieldErrors,
};

function responseError(status: number, body: unknown, path: string): AuthError {
    const code = isRecord(body) && typeof body.code === 'string' ? body.code : pathErrorCodes[path]?.[status] ?? '';
    const details = Object.hasOwn(codeErrors, code) ? codeErrors[code] : undefined;
    const message = details?.message ?? statusErrorMessages[Math.min(status, 500)] ?? defaultErrorMessage;
    const fieldErrors = details?.fieldErrors ?? statusFieldErrors[status]?.(body) ?? {};
    return new AuthError(message, status, fieldErrors, code);
}

const fieldValidators: Record<AuthField, (value: string) => string | undefined> = {
    name: (value) => value.trim() ? undefined : requiredMessage,
    email: (value) => !value.trim() ? requiredMessage
        : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? undefined : fieldErrorMessages.email,
    password: (value) => passwordLength(value) >= MIN_PASSWORD_LENGTH
        ? undefined : fieldErrorMessages.password,
};

const formValidators = {
    login: { email: fieldValidators.email, password: (value: string) => value ? undefined : requiredMessage },
    signup: fieldValidators,
};

function validateInput(input: Record<string, string>, mode: keyof typeof formValidators) {
    const fields = Object.entries(formValidators[mode]).flatMap(([field, validate]) => {
        const message = validate(input[field] ?? '');
        return message ? [[field, message]] : [];
    });
    if (fields.length) throw new AuthError('Revisá los datos ingresados e intentá de nuevo.', undefined, Object.fromEntries(fields));
}

const sessionErrorHandlers: Record<number, () => null> = {
    401: () => null,
};

function handleSessionError(cause: unknown): null {
    const handler = cause instanceof AuthError ? sessionErrorHandlers[cause.status ?? 0] : undefined;
    if (handler) return handler();
    throw cause;
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
        const response = await fetch(`${apiUrl}${path}`, {
            ...options,
            credentials: 'include',
            signal: controller.signal,
        });
        const body: unknown = await response.json().catch((cause: unknown) => {
            if (cause instanceof SyntaxError) return null;
            throw cause;
        });
        if (!response.ok) throw responseError(response.status, body, path);
        if (!isRecord(body) || body.success !== true || !('data' in body)) {
            throw new AuthError(invalidResponse);
        }
        return body.data;
    } catch (cause) {
        if (cause instanceof AuthError) throw cause;
        throw new AuthError(controller.signal.aborted
            ? 'La solicitud tardó demasiado. Probá de nuevo.'
            : 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.');
    } finally {
        clearTimeout(timeout);
    }
}

async function postWithCsrf(path: string, input?: AuthBody, retryCsrf = true): Promise<unknown> {
    const csrf = await request('/auth/csrf');
    if (!isRecord(csrf) || typeof csrf.token !== 'string' || !csrf.token) {
        throw new AuthError(invalidResponse);
    }
    return request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.token },
        ...(input ? { body: JSON.stringify(input) } : {}),
    }).catch((cause: unknown) => {
        if (retryCsrf && cause instanceof AuthError && cause.status === 403 && cause.code === 'CSRF_INVALID') {
            return postWithCsrf(path, input, false);
        }
        throw cause;
    });
}

let mutationQueue: Promise<void> = Promise.resolve();

function mutate(path: string, input?: AuthBody): Promise<unknown> {
    const operation = mutationQueue.then(() => postWithCsrf(path, input));
    mutationQueue = operation.then(() => undefined, () => undefined);
    return operation;
}

function parseUser(data: unknown): AuthUser {
    const isFilled = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';
    if (!isRecord(data) || !isFilled(data.id) || !isFilled(data.name) || !isFilled(data.email) ||
        typeof data.registeredAt !== 'string') {
        throw new AuthError(invalidResponse);
    }
    return { id: data.id, name: data.name, email: data.email, registeredAt: data.registeredAt };
}

export async function login({ email, password }: LoginInput): Promise<AuthUser> {
    validateInput({ email, password }, 'login');
    return parseUser(await mutate('/auth/login', { email: email.trim(), password }));
}

export async function signUp({ name, email, password }: SignUpInput): Promise<void> {
    validateInput({ name, email, password }, 'signup');
    await mutate('/users/register', {
        name: name.trim(), email: email.trim(), password,
    });
}

export function getCurrentUser(): Promise<AuthUser | null> {
    return request('/auth/me').then(parseUser).catch(handleSessionError);
}

export async function logout(): Promise<void> {
    await mutate('/auth/logout').catch(handleSessionError);
}
