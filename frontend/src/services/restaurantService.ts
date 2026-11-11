import type { Restaurant } from '../types/types';
import { fetchApi } from '../config/api';

type RestaurantsState = { restaurants: Restaurant[]; status: 'loading' | 'error' | 'ready' };
type CacheEntry = { state: RestaurantsState; promise?: Promise<void> };
const loading: RestaurantsState = { restaurants: [], status: 'loading' };
const cache = new Map<number | null, CacheEntry>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export const getRestaurantsSnapshot = (comuna: number | null): RestaurantsState => cache.get(comuna)?.state ?? loading;

export function subscribeRestaurants(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function loadRestaurants(comuna: number | null) {
    const cached = cache.get(comuna);
    if (cached?.promise || cached?.state.status === 'ready') return;
    const entry: CacheEntry = cached ?? { state: loading };
    cache.set(comuna, entry);
    entry.state = loading;
    if (cached) notify();

    const query = comuna === null ? '' : `?comuna=${comuna}`;
    entry.promise = fetchApi(`/restaurants${query}`)
        .then(({ response, success, data }) => {
            if (!response.ok) throw new Error(`No se pudieron cargar los restaurantes (${response.status}).`);
            if (!success || !Array.isArray(data)) throw new Error('La respuesta de restaurantes no es válida.');
            entry.state = { restaurants: data as Restaurant[], status: 'ready' };
        })
        .catch((error: unknown) => {
            console.error(error);
            entry.state = { restaurants: [], status: 'error' };
        })
        .finally(() => {
            entry.promise = undefined;
            notify();
        });
}
