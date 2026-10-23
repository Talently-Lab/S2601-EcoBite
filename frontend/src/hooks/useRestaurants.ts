import { useEffect, useState } from 'react';
import { getRestaurants } from '../services/restaurantService';
import type { Restaurant } from '../types/types';

type RestaurantsStatus = 'loading' | 'error' | 'ready';

export function useRestaurants() {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [status, setStatus] = useState<RestaurantsStatus>('loading');

    useEffect(() => {
        let active = true;

        getRestaurants()
            .then((data) => {
                if (active) {
                    setRestaurants(data);
                    setStatus('ready');
                }
            })
            .catch((err: unknown) => {
                if (active) {
                    console.error(err);
                    setStatus('error');
                }
            });

        return () => {
            active = false;
        };
    }, []);

    return { restaurants, status };
}
