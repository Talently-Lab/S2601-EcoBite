const configuredUrl = import.meta.env.VITE_API_URL?.trim();

if (!configuredUrl && !import.meta.env.DEV) {
    throw new Error('Falta VITE_API_URL. Configurá la URL del backend antes de generar la aplicación para este entorno.');
}

export const apiUrl = (configuredUrl || 'http://localhost:3000/api').replace(/\/+$/, '');
