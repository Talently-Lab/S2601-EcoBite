import { apiUrl } from '../config/api';
import { isRecord } from '../utils/isRecord';

const REQUEST_TIMEOUT_MS = 15_000;
const CSRF_PATH = '/auth/csrf';

type ApiErrorDetails = { path: string; stage?: 'csrf' } & (
    | { kind: 'http'; status: number; body: unknown }
    | { kind: 'invalid-response'; status?: number }
    | { kind: 'network' | 'timeout' }
);
type RequestOptions = Omit<RequestInit, 'signal'> & { signal?: never };

export class ApiError extends Error {
    constructor(
        readonly details: ApiErrorDetails,
        options?: ErrorOptions,
    ) {
        const status = 'status' in details ? details.status : undefined;
        super(`API ${details.kind}: ${details.path}${status === undefined ? '' : ` (HTTP ${status})`}`, options);
        this.name = 'ApiError';
    }

    get code(): string | undefined {
        const { details } = this;
        return details.kind === 'http' && isRecord(details.body) && typeof details.body.code === 'string'
            ? details.body.code : undefined;
    }

    get status(): number | undefined {
        return 'status' in this.details ? this.details.status : undefined;
    }
}

export async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(`${apiUrl}${path}`, {
            ...options,
            credentials: 'include',
            signal: controller.signal,
        });
        let bodyError: unknown;
        let body: unknown = null;
        try {
            body = await response.json();
        } catch (cause) {
            if (!(cause instanceof SyntaxError)) throw cause;
            bodyError = cause;
        }
        if (!response.ok) throw new ApiError({ kind: 'http', path, status: response.status, body }, { cause: bodyError });
        if (!isRecord(body) || body.success !== true || !('data' in body)) {
            throw new ApiError({ kind: 'invalid-response', path, status: response.status }, { cause: bodyError });
        }
        return body.data;
    } catch (cause) {
        if (cause instanceof ApiError) throw cause;
        throw new ApiError({ kind: controller.signal.aborted ? 'timeout' : 'network', path }, { cause });
    } finally {
        clearTimeout(timeout);
    }
}

let csrfToken: string | undefined;

async function fetchCsrfToken(): Promise<string> {
    const csrf = await request(CSRF_PATH);
    if (!isRecord(csrf) || typeof csrf.token !== 'string' || !csrf.token) {
        throw new ApiError({ kind: 'invalid-response', path: CSRF_PATH });
    }
    return csrf.token;
}

async function getCsrfToken(): Promise<string> {
    if (csrfToken) return csrfToken;
    try {
        csrfToken = await fetchCsrfToken();
        return csrfToken;
    } catch (cause) {
        if (!(cause instanceof ApiError)) throw cause;
        throw new ApiError({ ...cause.details, stage: 'csrf' }, { cause });
    }
}

function isCsrfInvalid(cause: unknown): boolean {
    return cause instanceof ApiError && cause.details.kind === 'http'
        && cause.details.status === 403 && cause.code === 'CSRF_INVALID';
}

async function postWithCsrf(path: string, body?: string, retryCsrf = true): Promise<unknown> {
    const token = await getCsrfToken();
    try {
        return await request(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
            ...(body !== undefined ? { body } : {}),
        });
    } catch (cause) {
        // The guard rejects this request before executing it, so one retry is safe.
        if (isCsrfInvalid(cause)) {
            csrfToken = undefined;
            if (retryCsrf) return await postWithCsrf(path, body, false);
        }
        throw cause;
    }
}

let mutationQueue: Promise<void> = Promise.resolve();

export function mutate(path: string, input?: unknown): Promise<unknown> {
    // Snapshot the payload before waiting; token acquisition and POST share one queue.
    const body = input === undefined ? undefined : JSON.stringify(input);
    const operation = mutationQueue.then(() => postWithCsrf(path, body));
    mutationQueue = operation.then(() => undefined, () => undefined);
    return operation;
}
