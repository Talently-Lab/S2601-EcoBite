import { isRecord } from '../utils/isRecord';

const configuredUrl = import.meta.env.VITE_API_URL?.trim();

if (!configuredUrl && !import.meta.env.DEV) {
    throw new Error('Falta VITE_API_URL. Configurá la URL del backend antes de generar la aplicación para este entorno.');
}

export const apiUrl = (configuredUrl || 'http://localhost:3000/api').replace(/\/+$/, '');

export async function fetchApi(path: string, options?: RequestInit) {
    const response = await fetch(`${apiUrl}${path}`, options);
    let body: unknown = null;
    let bodyError: unknown;
    try {
        body = await response.json();
    } catch (cause) {
        if (!(cause instanceof SyntaxError)) throw cause;
        bodyError = cause;
    }
    const envelope = isRecord(body) && body.success === true && 'data' in body ? body : null;
    return { response, body, bodyError, success: response.ok && envelope !== null, data: envelope?.data };
}
