import type { Restaurant } from '../types/types';

type RestaurantsResponse = {
    success: boolean;
    data: Restaurant[];
};

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');

export const getRestaurants = async (): Promise<Restaurant[]> => {
    const response = await fetch(`${apiUrl}/restaurants`);

    if (!response.ok) {
        throw new Error(`No se pudieron cargar los restaurantes (${response.status}).`);
    }

    const result: RestaurantsResponse = await response.json();

    if (!result.success || !Array.isArray(result.data)) {
        throw new Error('La respuesta de restaurantes no es válida.');
    }

    return result.data;
};
