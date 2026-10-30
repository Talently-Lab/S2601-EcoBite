import type { Restaurant } from '../types/types';
import { apiUrl } from '../config/api';

type RestaurantsResponse = {
    success: boolean;
    data: Restaurant[];
};

export const getRestaurants = async (comuna: number | null): Promise<Restaurant[]> => {
    const query = comuna === null ? '' : `?comuna=${comuna}`;
    const response = await fetch(`${apiUrl}/restaurants${query}`);

    if (!response.ok) {
        throw new Error(`No se pudieron cargar los restaurantes (${response.status}).`);
    }

    const result: RestaurantsResponse = await response.json();

    if (!result.success || !Array.isArray(result.data)) {
        throw new Error('La respuesta de restaurantes no es válida.');
    }

    return result.data;
};
