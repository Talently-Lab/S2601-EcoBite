import { ApiError, mutate as apiMutate, request as apiRequest } from './apiClient';
import { ServiceError, type ServiceErrorOptions } from './ServiceError';
import { isRecord } from '../utils/isRecord';

export type LoginInput = { email: string; password: string };
export type SignUpInput = LoginInput & { name: string };
type AuthBody = LoginInput | SignUpInput;
export type UserRole = 'ADMIN' | 'CLIENT';
export type AuthUser = { id: string; name: string; email: string; registeredAt: string; role: UserRole };
const USER_ROLES: Record<UserRole, true> = { ADMIN: true, CLIENT: true };
export type AuthField = keyof SignUpInput;
type FieldErrors = Partial<Record<AuthField, string>>;
type AuthErrorOptions = ServiceErrorOptions & { fieldErrors?: FieldErrors };
type Validator = (value: string) => string | undefined;

export class AuthError extends ServiceError {
    readonly fieldErrors: FieldErrors;

    constructor(message: string, { fieldErrors = {}, ...options }: AuthErrorOptions = {}) {
        super(message, options);
        this.name = 'AuthError';
        this.fieldErrors = fieldErrors;
    }
}

function passwordLength(value: string): number {
    const presentationSequences = value.match(/[^\uFE0F\uFE0E][\uFE0F\uFE0E]/g)?.length ?? 0;
    return Array.from(value).length - presentationSequences;
}

export const MIN_PASSWORD_LENGTH = 8;

const invalidResponse = 'La respuesta del servidor no es válida. Probá de nuevo.';

const defaultErrorMessage = 'No pudimos completar la solicitud. Probá de nuevo.';
const invalidCredentialsMessage = 'El mail o la contraseña son incorrectos. Revisalos y probá de nuevo.';
const emailTakenMessage = 'Este email ya tiene una cuenta.';
const requiredMessage = 'Nos falta este dato para arrancar.';
const invalidInputMessage = 'Revisá los datos ingresados e intentá de nuevo.';

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
    400: invalidInputMessage,
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

const fieldValidators: Record<AuthField, Validator> = {
    name: (value) => value.trim() ? undefined : requiredMessage,
    email: (value) => !value.trim() ? requiredMessage
        : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? undefined : fieldErrorMessages.email,
    password: (value) => passwordLength(value) >= MIN_PASSWORD_LENGTH
        ? undefined : fieldErrorMessages.password,
};

const loginValidators = {
    email: fieldValidators.email,
    password: (value: string) => value ? undefined : requiredMessage,
};

function validateInput<T extends AuthField>(input: Record<T, string>, validators: Record<T, Validator>) {
    const entries = (Object.entries(validators) as [T, Validator][]).flatMap(([field, validate]) => {
        const message = validate(input[field] ?? '');
        return message ? [[field, message]] : [];
    });
    if (entries.length) throw new AuthError(invalidInputMessage, { fieldErrors: Object.fromEntries(entries) });
}

function handleSessionError(cause: unknown): null {
    if (cause instanceof AuthError && cause.status === 401) return null;
    throw cause;
}

function handleTransportError(cause: unknown): never {
    if (!(cause instanceof ApiError)) throw cause;
    const { details } = cause;
    if (details.kind === 'http') {
        const { status, body, path } = details;
        const code = cause.code ?? pathErrorCodes[path]?.[status] ?? '';
        const mapped = Object.hasOwn(codeErrors, code) ? codeErrors[code] : undefined;
        const message = mapped?.message ?? statusErrorMessages[status >= 500 ? 500 : status] ?? defaultErrorMessage;
        const fieldErrors = mapped?.fieldErrors ?? (status === 400 ? validationFieldErrors(body) : {});
        throw new AuthError(message, { status, code, fieldErrors, cause });
    }
    const messages = {
        'invalid-response': invalidResponse,
        timeout: 'La solicitud tardó demasiado. Probá de nuevo.',
        network: 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.',
    };
    throw new AuthError(messages[details.kind], { cause });
}

async function requestAuthData(path: string): Promise<unknown> {
    try {
        return await apiRequest(path);
    } catch (cause) {
        handleTransportError(cause);
    }
}

async function mutate(path: string, input?: AuthBody): Promise<unknown> {
    try {
        return await apiMutate(path, input);
    } catch (cause) {
        handleTransportError(cause);
    }
}

function isUserRole(value: unknown): value is UserRole {
    return typeof value === 'string' && Object.hasOwn(USER_ROLES, value);
}

function parseUser(data: unknown): AuthUser {
    const isFilled = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';
    if (!isRecord(data) || !isFilled(data.id) || !isFilled(data.name) || !isFilled(data.email) ||
        !isFilled(data.registeredAt) || Number.isNaN(Date.parse(data.registeredAt)) || !isUserRole(data.role)) {
        throw new AuthError(invalidResponse);
    }
    return { id: data.id, name: data.name, email: data.email, registeredAt: data.registeredAt, role: data.role };
}

export async function login({ email, password }: LoginInput): Promise<AuthUser> {
    validateInput({ email, password }, loginValidators);
    return parseUser(await mutate('/auth/login', { email: email.trim(), password }));
}

export async function signUp({ name, email, password }: SignUpInput): Promise<void> {
    validateInput({ name, email, password }, fieldValidators);
    await mutate('/users/register', {
        name: name.trim(), email: email.trim(), password,
    });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
    try {
        return parseUser(await requestAuthData('/auth/me'));
    } catch (cause) {
        return handleSessionError(cause);
    }
}

export async function logout(): Promise<void> {
    try {
        await mutate('/auth/logout');
    } catch (cause) {
        handleSessionError(cause);
    }
}
